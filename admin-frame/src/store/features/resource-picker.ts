import { create } from 'zustand';
import { combine } from 'zustand/middleware';
import type {
  MockResourcePickerProduct,
  MockResourcePickerVariant,
  MockResourcePickerCollection,
  ResourcePickerCatalogApiResponse,
  ResourcePickerOpenOptions,
  ResourcePickerResultPayload,
  ResourcePickerSelectionRow,
  ResourcePickerType,
} from '../../types/resource-picker';

type ResourcePickerState = {
  isOpen: boolean;
  actionId: string | null;
  iframeWindow: Window | null;
  options: ResourcePickerOpenOptions | null;
  query: string;
  loading: boolean;
  error: string | null;
  catalog: ResourcePickerCatalogApiResponse | null;
  selectedIds: Set<string>;
  /** Full selection rows for confirm(); survives catalog filter changes. */
  selectionRowById: Map<string, ResourcePickerSelectionRow>;
  catalogFetchController: AbortController | null;
};

const emptyCatalog: ResourcePickerCatalogApiResponse = {
  products: [],
  variants: [],
  collections: [],
};

function closedPickerState(): Pick<
  ResourcePickerState,
  | 'isOpen'
  | 'actionId'
  | 'iframeWindow'
  | 'options'
  | 'query'
  | 'loading'
  | 'catalog'
  | 'selectedIds'
  | 'error'
  | 'selectionRowById'
  | 'catalogFetchController'
> {
  return {
    isOpen: false,
    actionId: null,
    iframeWindow: null,
    options: null,
    query: '',
    loading: false,
    catalog: null,
    selectedIds: new Set<string>(),
    error: null,
    selectionRowById: new Map(),
    catalogFetchController: null,
  };
}

function selectionRowsForProduct(p: MockResourcePickerProduct): ResourcePickerSelectionRow {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    variants: p.variants,
  };
}

function selectionRowForVariant(v: MockResourcePickerVariant): ResourcePickerSelectionRow {
  return {
    id: v.id,
    title: v.productTitle,
    displayName: v.displayName,
    price: v.price,
    product: {
      id: v.productId,
      title: v.productTitle,
      handle: v.productHandle,
    },
  };
}

function selectionRowForCollection(c: MockResourcePickerCollection): ResourcePickerSelectionRow {
  return {
    id: c.id,
    title: c.title,
    handle: c.handle,
  };
}

function lookupRowFromCatalog(
  catalog: ResourcePickerCatalogApiResponse,
  type: ResourcePickerType,
  id: string,
): ResourcePickerSelectionRow | null {
  if (type === 'product') {
    const p = catalog.products.find((x) => x.id === id);
    return p ? selectionRowsForProduct(p) : null;
  }
  if (type === 'variant') {
    const v = catalog.variants.find((x) => x.id === id);
    return v ? selectionRowForVariant(v) : null;
  }
  const c = catalog.collections.find((x) => x.id === id);
  return c ? selectionRowForCollection(c) : null;
}

function mergeSelectionCacheFromCatalog(
  selectedIds: Set<string>,
  prev: Map<string, ResourcePickerSelectionRow>,
  catalog: ResourcePickerCatalogApiResponse,
  type: ResourcePickerType,
): Map<string, ResourcePickerSelectionRow> {
  const next = new Map(prev);
  for (const id of selectedIds) {
    if (next.has(id)) continue;
    const row = lookupRowFromCatalog(catalog, type, id);
    if (row) next.set(id, row);
  }
  return next;
}

function fetchCatalog(
  q: string,
  set: (
    partial:
      | Partial<ResourcePickerState>
      | ((state: ResourcePickerState) => Partial<ResourcePickerState>),
  ) => void,
  get: () => ResourcePickerState,
) {
  get().catalogFetchController?.abort();
  const ac = new AbortController();
  set({ catalogFetchController: ac, loading: true, error: null });

  fetch(`/api/resource-picker-catalog?q=${encodeURIComponent(q)}`, { signal: ac.signal })
    .then((r) => {
      if (!r.ok) throw new Error(`Catalog ${r.status}`);
      return r.json() as Promise<ResourcePickerCatalogApiResponse>;
    })
    .then((catalog) => {
      set((state) => {
        if (state.catalogFetchController !== ac) return {};
        const type: ResourcePickerType = state.options?.type ?? 'product';
        const selectionRowById = mergeSelectionCacheFromCatalog(
          state.selectedIds,
          state.selectionRowById,
          catalog,
          type,
        );
        return { catalog, loading: false, error: null, selectionRowById };
      });
    })
    .catch((e: Error) => {
      if (e.name === 'AbortError') return;
      set((state) => {
        if (state.catalogFetchController !== ac) return {};
        return {
          loading: false,
          error: e.message || 'Failed to load catalog',
          catalog: emptyCatalog,
        };
      });
    });
}

export const useResourcePickerFeatureStore = create(
  combine(
    closedPickerState() as ResourcePickerState,
    (set, get) => ({
      /** Called from mock admin host when iframe requests the picker (see useMockBridge). */
      openFromBridge: (payload: {
        actionId: string;
        iframeWindow: Window | null;
        options: ResourcePickerOpenOptions;
      }) => {
        get().catalogFetchController?.abort();
        const preset = new Set(payload.options.selectionIds ?? []);
        set({
          isOpen: true,
          actionId: payload.actionId,
          iframeWindow: payload.iframeWindow,
          options: payload.options,
          query: '',
          loading: true,
          error: null,
          catalog: null,
          selectedIds: preset,
          selectionRowById: new Map(),
          catalogFetchController: null,
        });

        fetchCatalog('', set, get);
      },

      setQuery: (query: string) => {
        set({ query, loading: true, error: null });
        fetchCatalog(query, set, get);
      },

      toggleId: (id: string) =>
        set((state) => {
          const next = new Set(state.selectedIds);
          const nextCache = new Map(state.selectionRowById);
          const allowMulti = state.options?.multiple === true;
          const type: ResourcePickerType = state.options?.type ?? 'product';
          if (next.has(id)) {
            next.delete(id);
            nextCache.delete(id);
          } else {
            if (!allowMulti) {
              next.clear();
              nextCache.clear();
            }
            next.add(id);
            if (state.catalog) {
              const row = lookupRowFromCatalog(state.catalog, type, id);
              if (row) nextCache.set(id, row);
            }
          }
          return { selectedIds: next, selectionRowById: nextCache };
        }),

      close: () => {
        get().catalogFetchController?.abort();
        set(closedPickerState());
      },

      cancel: () => {
        get().catalogFetchController?.abort();
        const { actionId, iframeWindow } = get();
        const payload: ResourcePickerResultPayload = { cancelled: true, selection: [] };
        if (actionId && iframeWindow) {
          iframeWindow.postMessage(
            {
              type: 'FEATURE_ACTION_RESPONSE',
              action_id: actionId,
              payload,
            },
            '*',
          );
        }
        set(closedPickerState());
      },

      confirm: () => {
        const state = get();
        get().catalogFetchController?.abort();
        const { actionId, iframeWindow, options, catalog, selectedIds, selectionRowById } = state;
        if (!actionId || !iframeWindow || !options || !catalog) {
          set(closedPickerState());
          return;
        }

        const type: ResourcePickerType = options.type ?? 'product';
        const selection: ResourcePickerSelectionRow[] = [];
        for (const id of selectedIds) {
          const cached = selectionRowById.get(id);
          if (cached) {
            selection.push(cached);
            continue;
          }
          const row = lookupRowFromCatalog(catalog, type, id);
          if (row) selection.push(row);
        }

        const payload: ResourcePickerResultPayload = { cancelled: false, selection };
        iframeWindow.postMessage(
          {
            type: 'FEATURE_ACTION_RESPONSE',
            action_id: actionId,
            payload,
          },
          '*',
        );
        set(closedPickerState());
      },
    }),
  ),
);
