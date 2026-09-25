import { createStore } from 'zustand/vanilla';
import { combine } from 'zustand/middleware';

/**
 * Admin-side state for each App Bridge feature. The admin-frame renders it;
 * the in-process test host lets tests assert on it.
 */

export type ModalContent = {
  id: string;
  title: string;
  variant?: string;
  src: string | null;
  buttons: Array<{
    id: string;
    label: string;
    variant?: string;
    tone?: string;
    disabled?: boolean;
    loading?: boolean;
  }>;
};

export type ModalState = {
  open: boolean;
  heading: string;
  content: ModalContent;
  html: string;
};

export type SaveBarState = {
  id: string;
  visible: boolean;
  discardConfirmation: boolean;
};

export type NavItem = {
  label: string;
  href: string;
  isHome?: boolean;
  active?: boolean;
};

export type Toast = {
  id: string;
  message: string;
  duration?: number;
  isError?: boolean;
  action?: string;
};

function createModalStore() {
  const emptyModal = (id: string): ModalState => ({
    open: false,
    heading: '',
    content: { id, title: '', variant: 'base', src: null, buttons: [] },
    html: '',
  });

  return createStore(combine(
    { modalStates: {} as Record<string, ModalState> },
    set => {
      const patch = (id: string, change: (modal: ModalState) => Partial<ModalState>) => set(state => {
        const modal = state.modalStates[id] ?? emptyModal(id);
        return { modalStates: { ...state.modalStates, [id]: { ...modal, ...change(modal) } } };
      });

      return {
        show: (payload: { id: string }) => patch(payload.id, () => ({ open: true })),
        hide: (payload: { id: string }) => patch(payload.id, () => ({ open: false })),
        toggle: (payload: { id: string }) => patch(payload.id, modal => ({ open: !modal.open })),
        update: (payload: { id: string; heading: string; content: ModalContent }) =>
          patch(payload.id, () => ({ heading: payload.heading, content: payload.content })),
        updateHtml: (payload: { id: string; html: string }) => patch(payload.id, () => ({ html: payload.html })),
      };
    },
  ));
}

function createLoadingStore() {
  return createStore(combine(
    { isLoading: false },
    set => ({
      setLoading: (payload: { isLoading: boolean }) => set({ isLoading: payload.isLoading }),
    }),
  ));
}

function createSaveBarStore() {
  return createStore(combine(
    { saveBars: {} as Record<string, SaveBarState> },
    set => {
      const patch = (id: string, change: (saveBar: SaveBarState) => Partial<SaveBarState>) => set(state => {
        const saveBar = state.saveBars[id] ?? { id, visible: false, discardConfirmation: false };
        return { saveBars: { ...state.saveBars, [id]: { ...saveBar, ...change(saveBar) } } };
      });

      return {
        show: (payload: { id: string }) => patch(payload.id, () => ({ visible: true })),
        hide: (payload: { id: string }) => patch(payload.id, () => ({ visible: false })),
        toggle: (payload: { id: string }) => patch(payload.id, saveBar => ({ visible: !saveBar.visible })),
        update: (payload: { id: string; discardConfirmation?: boolean }) =>
          patch(payload.id, () => ({ discardConfirmation: payload.discardConfirmation ?? false })),
      };
    },
  ));
}

function createNavMenuStore() {
  return createStore(combine(
    { items: [] as NavItem[] },
    set => ({
      setItems: (payload: { items: NavItem[] }) => set({ items: payload.items }),
      addItem: (payload: NavItem) => set(state => ({ items: [...state.items, payload] })),
      clearItems: () => set({ items: [] }),
    }),
  ));
}

function createToastStore() {
  return createStore(combine(
    { toasts: [] as Toast[] },
    set => ({
      show: (payload: Toast) => set(state => ({ toasts: [...state.toasts, payload] })),
      hide: (payload: { id: string }) => set(state => ({ toasts: state.toasts.filter(toast => toast.id !== payload.id) })),
    }),
  ));
}

function createResourcePickerStore() {
  return createStore(combine(
    // What the picker resolves to; `undefined` means the merchant cancelled.
    { selection: [] as unknown[] | undefined },
    (set, get) => ({
      open: (_payload: { options: unknown }) => get().selection,
      setSelection: (payload: { selection: unknown[] | undefined }) => set({ selection: payload.selection }),
    }),
  ));
}

export function createFeatureStores() {
  return {
    modal: createModalStore(),
    loading: createLoadingStore(),
    saveBar: createSaveBarStore(),
    navMenu: createNavMenuStore(),
    toast: createToastStore(),
    resourcePicker: createResourcePickerStore(),
  };
}

export type FeatureStores = ReturnType<typeof createFeatureStores>;
export type FeatureName = keyof FeatureStores;

/** Calls `action` on a feature's store. Returns `handled: false` for unknown features or actions. */
export function runFeatureAction(stores: FeatureStores, feature: string, action: string, payload: unknown) {
  const store = stores[feature as FeatureName];
  const fn = store && (store.getState() as Record<string, unknown>)[action];
  if (typeof fn !== 'function') return { handled: false, result: undefined };
  return { handled: true, result: (fn as (payload: unknown) => unknown)(payload) };
}

export function resetFeatureStores(stores: FeatureStores) {
  for (const store of Object.values(stores)) {
    (store as { setState(state: unknown, replace: true): void }).setState(store.getInitialState(), true);
  }
}
