import { action, signal, type ReadonlySignal } from '@preact/signals-core';

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

export type NavigationEntry =
  /** The app changed its own URL (`history.pushState`/`replaceState`, back/forward or a page load). */
  | { type: 'history'; url: string; replace: boolean }
  /** The app sent the merchant to an admin page, e.g. `shopify://admin/products` is `/products`. */
  | { type: 'admin'; path: string; newContext: boolean }
  /** The app opened a URL in another window, e.g. `window.open(url, '_blank')` or a `target="_top"` link, or `window.open(url, '_self')`. */
  | { type: 'open'; url: string; target: string };

export type NavigationState = {
  /** The app's URL, without the admin's `host`/`shop`/`embedded`/`id_token` parameters. */
  url: string | null;
  /** The admin page showing instead of the app, or `null` while the app shows. */
  adminPath: string | null;
  /** Every navigation, in order (the latest `maxNavigationEntries`). */
  entries: NavigationEntry[];
};

export type AppWindowState = {
  id: string;
  /** The window's page, resolved against the app's URL. */
  src: string | null;
  open: boolean;
};

export type TitleBarAction = {
  /** The element's `id`, or its place in the title bar, e.g. `primary` or `secondary-1`. */
  id: string;
  label: string;
  variant?: string;
  tone?: string;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
};

/** Secondary actions grouped under one button: a `<section label>`, or an `<s-menu>` a button opens. */
export type TitleBarGroup = {
  label: string;
  actions: TitleBarAction[];
};

export type TitleBarState = {
  title: string;
  breadcrumb: TitleBarAction | null;
  primaryAction: TitleBarAction | null;
  secondaryActions: Array<TitleBarAction | TitleBarGroup>;
};

export type ShareRequest = {
  title?: string;
  text?: string;
  url?: string;
  /** Files can't cross to the admin; only their descriptions do. */
  files?: Array<{ name: string; type: string; size: number }>;
};

export type ShareOutcome = 'shared' | 'cancelled';

/** Sends an event to the app, e.g. `emit('appWindow', 'hide', { id })`. */
export type FeatureEmitter = (feature: string, event: string, payload?: unknown) => void;

type Setter<S> = (change: Partial<S> | ((state: S) => Partial<S>)) => void;

type Actions = Record<string, (...args: any[]) => unknown>;

export interface FeatureStore<S, A> {
  /**
   * The feature's state, as a `@preact/signals-core` signal. Read `.value` to track it, `.peek()` to read it untracked.
   * Only `effect`s and `computed`s from the same copy of `@preact/signals-core` track it; `subscribe` works everywhere.
   */
  state: ReadonlySignal<S>;
  /** Calls `listener` after every change, with the new and previous state. Returns an unsubscriber. */
  subscribe(listener: (state: S, previous: S) => void): () => void;
  /** Changes the state: merges `change` into it. */
  set: Setter<S>;
  /** Puts the state back how it started. */
  reset(options?: ResetOptions): void;
  actions: A;
}

export interface ResetOptions {
  /**
   * Keeps what the app's page mirrors into the admin (its URL, title bar, nav menu, modals, save
   * bars and app windows), closed: the elements are still there, and only report changes.
   */
  keepMirrored?: boolean;
  /** Tells the app what the reset closed, e.g. an open app window, once the state is reset. @default true */
  notify?: boolean;
}

interface StoreHooks<S> {
  /** Clears what lives outside the state. */
  onReset?: (state: S) => void;
  /** Tells the app what a reset from `previous` closed. */
  closed?: (previous: S) => void;
  /** The part of the state the page's elements report, as it stays across `reset({ keepMirrored: true })`. */
  mirrored?: (state: S) => Partial<S>;
}

/** `entries` without `id`. */
const without = <T>(entries: Record<string, T>, id: string): Record<string, T> =>
  Object.fromEntries(Object.entries(entries).filter(([key]) => key !== id));

/** Each entry with `change` applied, e.g. every modal closed. */
const each = <T>(entries: Record<string, T>, change: Partial<T>): Record<string, T> =>
  Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, { ...entry, ...change }]));

/** Each store's `closed` hook, for `resetFeatureStores` to call once every store is reset. */
const closedHooks = new WeakMap<FeatureStore<any, any>, (previous: any) => void>();

/** A feature's store. Each action runs as one batch, untracked. */
function defineStore<S extends object, A extends Actions>(
  initial: S,
  actions: (set: Setter<S>, get: () => S) => A,
  hooks: StoreHooks<S> = {},
): FeatureStore<S, A> {
  const state = signal(initial);
  const listeners = new Set<(state: S, previous: S) => void>();
  const get = () => state.peek();
  const write = (next: S) => {
    const previous = get();
    state.value = next;
    listeners.forEach(listener => listener(next, previous));
  };
  const set: Setter<S> = change => write({ ...get(), ...(typeof change === 'function' ? change(get()) : change) });

  const store: FeatureStore<S, A> = {
    state,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    set,
    reset(options = {}) {
      const previous = get();
      hooks.onReset?.(previous);
      write({ ...initial, ...(options.keepMirrored ? hooks.mirrored?.(previous) : undefined) });
      // After the write, so what the app does in response lands in the reset state.
      if (options.notify !== false) hooks.closed?.(previous);
    },
    actions: Object.fromEntries(Object.entries(actions(set, get)).map(([name, fn]) => [name, action(fn)])) as A,
  };
  if (hooks.closed) closedHooks.set(store, hooks.closed);
  return store;
}

function createModalStore() {
  const emptyModal = (id: string): ModalState => ({
    open: false,
    heading: '',
    content: { id, title: '', variant: 'base', src: null, buttons: [] },
    html: '',
  });

  return defineStore(
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
        /** The app's `<ui-modal>` left the page. */
        remove: (payload: { id: string }) => set(state => ({ modalStates: without(state.modalStates, payload.id) })),
      };
    },
    { mirrored: state => ({ modalStates: each(state.modalStates, { open: false }) }) },
  );
}

function createLoadingStore() {
  return defineStore(
    { isLoading: false },
    set => ({
      setLoading: (payload: { isLoading: boolean }) => set({ isLoading: payload.isLoading }),
    }),
  );
}

function createSaveBarStore(emit: FeatureEmitter) {
  return defineStore(
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
        /** The app's `<ui-save-bar>` or `form[data-save-bar]` left the page. */
        remove: (payload: { id: string }) => set(state => ({ saveBars: without(state.saveBars, payload.id) })),
      };
    },
    {
      // Tells the app, so a form with changes shows its save bar again on the next edit.
      closed: previous => Object.values(previous.saveBars).forEach(({ id, visible }) => {
        if (visible) emit('saveBar', 'hide', { id });
      }),
      mirrored: state => ({ saveBars: each(state.saveBars, { visible: false }) }),
    },
  );
}

function createNavMenuStore() {
  return defineStore(
    { items: [] as NavItem[] },
    set => ({
      setItems: (payload: { items: NavItem[] }) => set({ items: payload.items }),
      addItem: (payload: NavItem) => set(state => ({ items: [...state.items, payload] })),
      clearItems: () => set({ items: [] }),
    }),
    { mirrored: state => ({ items: state.items }) },
  );
}

function createToastStore() {
  return defineStore(
    { toasts: [] as Toast[] },
    set => ({
      show: (payload: Toast) => set(state => ({ toasts: [...state.toasts, payload] })),
      hide: (payload: { id: string }) => set(state => ({ toasts: state.toasts.filter(toast => toast.id !== payload.id) })),
    }),
  );
}

function createResourcePickerStore() {
  return defineStore(
    // What the picker resolves to; `undefined` means the merchant cancelled.
    { selection: [] as unknown[] | undefined },
    (set, get) => ({
      open: (_payload: { options: unknown }) => get().selection,
      setSelection: (payload: { selection: unknown[] | undefined }) => set({ selection: payload.selection }),
    }),
  );
}

function createNavigationStore(emit: FeatureEmitter, maxEntries: number) {
  return defineStore(
    { url: null, adminPath: null, entries: [] } as NavigationState,
    set => {
      const record = (entry: NavigationEntry, change: Partial<NavigationState> = {}) =>
        set(state => ({ ...change, entries: [...state.entries.slice(Math.max(0, state.entries.length + 1 - maxEntries)), entry] }));

      return {
        sync: (payload: { url: string; replace: boolean }) =>
          record({ type: 'history', ...payload }, { url: payload.url }),
        admin: (payload: { path: string; newContext?: boolean }) => {
          const newContext = payload.newContext ?? false;
          record({ type: 'admin', path: payload.path, newContext }, newContext ? {} : { adminPath: payload.path });
        },
        open: (payload: { url: string; target: string }) => record({ type: 'open', ...payload }),
        /** The merchant picked an app nav menu item in the admin. */
        navigate: (payload: { href: string }) => emit('navigation', 'navigate', payload),
      };
    },
    // The app's window stays where it is.
    { mirrored: state => ({ url: state.url }) },
  );
}

function createAppWindowStore(emit: FeatureEmitter) {
  return defineStore(
    { appWindows: {} as Record<string, AppWindowState> },
    (set, get) => {
      const patch = (id: string, change: Partial<AppWindowState>) => set(state => {
        const appWindow = state.appWindows[id] ?? { id, src: null, open: false };
        return { appWindows: { ...state.appWindows, [id]: { ...appWindow, ...change } } };
      });
      const setOpen = (id: string, open: boolean) => {
        if ((get().appWindows[id]?.open ?? false) === open) return;
        patch(id, { open });
        emit('appWindow', open ? 'show' : 'hide', { id });
      };

      return {
        update: (payload: { id: string; src: string | null }) => patch(payload.id, { src: payload.src }),
        /** The app's `<s-app-window>` left the page. */
        remove: (payload: { id: string }) => set(state => ({ appWindows: without(state.appWindows, payload.id) })),
        show: (payload: { id: string }) => setOpen(payload.id, true),
        hide: (payload: { id: string }) => setOpen(payload.id, false),
        toggle: (payload: { id: string }) => setOpen(payload.id, !get().appWindows[payload.id]?.open),
      };
    },
    {
      // The admin closes what's open, as the merchant would.
      closed: previous => Object.values(previous.appWindows).forEach(({ id, open }) => {
        if (open) emit('appWindow', 'hide', { id });
      }),
      mirrored: state => ({ appWindows: each(state.appWindows, { open: false }) }),
    },
  );
}

function createTitleBarStore(emit: FeatureEmitter) {
  return defineStore(
    // The app's `<ui-title-bar>` or `<s-page>`, or `null` without one.
    { titleBar: null as TitleBarState | null },
    set => ({
      update: (payload: { titleBar: TitleBarState | null }) => set({ titleBar: payload.titleBar }),
      /** The merchant clicked a title bar action. */
      click: (payload: { id: string }) => emit('titleBar', 'click', payload),
    }),
    { mirrored: state => ({ titleBar: state.titleBar }) },
  );
}

function createShareStore() {
  let settle: ((outcome: ShareOutcome) => void) | undefined;
  // A share still waiting for the merchant ends as if they dismissed the sheet.
  const cancel = () => {
    settle?.('cancelled');
    settle = undefined;
  };

  return defineStore(
    {
      /** The share sheet showing in the admin. */
      current: null as ShareRequest | null,
      /** Answers every share straight away instead of showing the sheet. */
      outcome: undefined as ShareOutcome | undefined,
    },
    (set, get) => ({
      share: (payload: ShareRequest): ShareOutcome | Promise<ShareOutcome> => {
        const { outcome } = get();
        if (outcome) return outcome;
        cancel();
        set({ current: payload });
        return new Promise(resolve => { settle = resolve; });
      },
      /** The merchant shared or dismissed the sheet. */
      settle: (payload: { outcome: ShareOutcome }) => {
        settle?.(payload.outcome);
        settle = undefined;
        set({ current: null });
      },
      setOutcome: (payload: { outcome: ShareOutcome | undefined }) => set({ outcome: payload.outcome }),
    }),
    { onReset: cancel },
  );
}

function createPrintStore() {
  return defineStore(
    { count: 0 },
    set => ({
      print: () => set(state => ({ count: state.count + 1 })),
    }),
  );
}

export interface FeatureStoresOptions {
  /** Delivers admin events to the app. */
  emit?: FeatureEmitter;
  /** How many navigation entries to keep; older ones drop off. @default Infinity */
  maxNavigationEntries?: number;
}

export function createFeatureStores(options: FeatureStoresOptions = {}) {
  const emit = options.emit ?? (() => {});
  return {
    modal: createModalStore(),
    loading: createLoadingStore(),
    saveBar: createSaveBarStore(emit),
    navMenu: createNavMenuStore(),
    toast: createToastStore(),
    resourcePicker: createResourcePickerStore(),
    navigation: createNavigationStore(emit, options.maxNavigationEntries ?? Infinity),
    appWindow: createAppWindowStore(emit),
    titleBar: createTitleBarStore(emit),
    share: createShareStore(),
    print: createPrintStore(),
  };
}

export type FeatureStores = ReturnType<typeof createFeatureStores>;
export type FeatureName = keyof FeatureStores;

/** Calls `action` on a feature's store. Returns `handled: false` for unknown features or actions. */
export function runFeatureAction(stores: FeatureStores, feature: string, action: string, payload: unknown) {
  const store = Object.hasOwn(stores, feature) ? stores[feature as FeatureName] : undefined;
  const fn = store && Object.hasOwn(store.actions, action) ? (store.actions as Record<string, unknown>)[action] : undefined;
  if (typeof fn !== 'function') return { handled: false, result: undefined };
  return { handled: true, result: (fn as (payload: unknown) => unknown)(payload) };
}

/** Resets every store, then tells the app what closed: what it does in response isn't undone by a later store's reset. */
export function resetFeatureStores(stores: FeatureStores, options: ResetOptions = {}) {
  const all: Array<FeatureStore<any, any>> = Object.values(stores);
  const previous = all.map(store => store.state.peek());
  for (const store of all) store.reset({ ...options, notify: false });
  if (options.notify === false) return;
  all.forEach((store, index) => closedHooks.get(store)?.(previous[index]));
}
