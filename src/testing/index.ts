import type { ShopifyGlobal } from '@shopify/app-bridge-types';
import { STANDARD_MOCK_CLIENT_ID, STANDARD_MOCK_SECRET } from '../auth/constants.js';
import { signSessionToken } from '../auth/jwt.js';
import { createShopify } from '../core/create-shopify.js';
import type { BridgeWindow } from '../core/features/context.js';
import { patchFetch } from '../core/fetch.js';
import type { AdminFetchRequest, BridgeHost, FeatureEvent } from '../core/protocol.js';
import {
  createFeatureStores,
  resetFeatureStores,
  runFeatureAction,
  type AppWindowState,
  type FeatureStores,
  type ModalState,
  type NavigationState,
  type NavItem,
  type SaveBarState,
  type ShareOutcome,
  type ShareRequest,
  type TitleBarAction,
  type TitleBarState,
  type Toast,
} from '../core/stores.js';

export type {
  AppWindowState,
  FeatureStore,
  FeatureStores,
  ModalState,
  NavigationEntry,
  NavigationState,
  NavItem,
  SaveBarState,
  ShareOutcome,
  ShareRequest,
  TitleBarAction,
  TitleBarGroup,
  TitleBarState,
  Toast,
} from '../core/stores.js';
export type { BridgeHost } from '../core/protocol.js';

export interface TestBridgeOptions {
  /** @default 'test-shop.myshopify.com' */
  shop?: string;
  /** `shopify.config.apiKey` and the id token's `aud`. @default STANDARD_MOCK_CLIENT_ID */
  apiKey?: string;
  /** Signs id tokens. Pass your app's secret to have its backend accept them. @default STANDARD_MOCK_SECRET */
  clientSecret?: string;
  /** The id token's `sub`. @default '123456789' */
  userId?: string;
  /** @default 'en' */
  locale?: string;
  /** `shopify.environment.embedded`. @default true */
  embedded?: boolean;
}

export interface AdminRequest {
  /** The URL as the app passed it, e.g. `shopify:admin/api/2025-10/graphql.json`. */
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
  /** For GraphQL requests. */
  operationName?: string;
  query?: string;
  variables?: Record<string, unknown>;
}

/** Returns a JSON body (or a `Response`) for an Admin API request. */
export type AdminHandler = (request: AdminRequest) => unknown;

export interface FeatureCall {
  feature: string;
  action: string;
  payload: unknown;
}

export interface TestBridge {
  readonly options: Required<TestBridgeOptions>;
  readonly host: BridgeHost;
  /** The admin-side state (toasts, save bars, modals, ...). */
  readonly stores: FeatureStores;
  /** Every App Bridge call the app made, in order. What the bridge mirrors from the page (its URL, title bar, nav menu, elements) is in `stores`. */
  readonly calls: readonly FeatureCall[];
  /** Every Admin API request, in order. */
  readonly adminRequests: readonly AdminRequest[];
  /** The mock global. Created on the first `install`, bound to that window's DOM. */
  readonly shopify: ShopifyGlobal;

  /** Sets `target.shopify` and patches `target.fetch`. Returns an uninstaller. */
  install(target?: object): () => void;

  /** Answers a GraphQL operation by name, or every unanswered operation with `'*'`. */
  graphql(operationName: string, handler: AdminHandler): void;
  /** Answers a REST Admin request. `path` is matched after `/admin/api/<version>/`, e.g. `'products.json'`. */
  rest(method: string, path: string | RegExp, handler: AdminHandler): void;
  /** What `shopify.resourcePicker` resolves to; `undefined` simulates cancelling. */
  resourcePicker(selection: unknown[] | undefined): void;
  /** How the merchant answers `navigator.share()`: `'cancelled'` rejects it with an `AbortError`. */
  shareResult(outcome: ShareOutcome): void;

  /** Toasts shown so far, including hidden ones. */
  toasts(): Toast[];
  saveBar(id: string): SaveBarState | undefined;
  modal(id: string): ModalState | undefined;
  navMenu(): NavItem[];
  loading(): boolean;
  /** The app's URL, the admin page the app sent the merchant to, and every navigation. */
  navigation(): NavigationState;
  appWindow(id: string): AppWindowState | undefined;
  /** The page's `<ui-title-bar>` or `<s-page>` as the admin shows it, or `null` without one. */
  titleBar(): TitleBarState | null;
  /** Clicks a title bar action in the admin, by id or label, which clicks the app's element. */
  clickTitleBarAction(idOrLabel: string): void;
  /** `navigator.share()` calls so far. */
  shares(): ShareRequest[];
  /** How many times the app called `window.print()`. */
  prints(): number;
  /** Picks an item in the admin's nav menu, which the app follows like a click on its link. */
  navigate(href: string): void;
  idToken(): Promise<string>;

  /** Keeps the current handlers across `reset()` (like msw's initial handlers). */
  checkpoint(): void;
  /**
   * Clears recorded calls and admin state, and restores handlers to the last checkpoint. What the
   * page's elements mirror (title bar, nav menu, modals, save bars, app windows) stays, closed.
   */
  reset(): void;
  /** Disconnects DOM observers. */
  dispose(): void;
}

const GRAPHQL_OPERATION = /\b(?:query|mutation|subscription)\s+([A-Za-z_]\w*)/;

function parseBody(body: string | undefined) {
  if (!body) return undefined;
  try {
    return JSON.parse(body) as { query?: string; variables?: Record<string, unknown>; operationName?: string };
  } catch {
    return undefined;
  }
}

function bodyText(body: BodyInit | null | undefined): string | undefined {
  if (body == null) return undefined;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return new TextDecoder().decode(body);
  throw new Error('[mock-bridge] Admin API request bodies must be strings');
}

type Handlers = {
  graphql: Map<string, AdminHandler>;
  rest: Array<{ method: string; path: string | RegExp; handler: AdminHandler }>;
  selection: unknown[] | undefined;
  shareOutcome: ShareOutcome;
};

/** An in-process App Bridge host for unit tests: no admin frame, no server. */
export function createTestBridge(options: TestBridgeOptions = {}): TestBridge {
  const resolved: Required<TestBridgeOptions> = {
    shop: 'test-shop.myshopify.com',
    apiKey: STANDARD_MOCK_CLIENT_ID,
    clientSecret: STANDARD_MOCK_SECRET,
    userId: '123456789',
    locale: 'en',
    embedded: true,
    ...Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)),
  };

  const listeners = new Set<(event: FeatureEvent) => void>();
  const stores = createFeatureStores({
    emit: (feature, event, payload) => listeners.forEach(listener => listener({ feature, event, payload })),
  });
  const calls: FeatureCall[] = [];
  const adminRequests: AdminRequest[] = [];
  let controller: AbortController | undefined;
  const emptyHandlers = (): Handlers => ({ graphql: new Map(), rest: [], selection: [], shareOutcome: 'shared' });
  let handlers = emptyHandlers();
  let baseline = emptyHandlers();
  let shopify: ShopifyGlobal | undefined;

  // Answers the admin's interactive features the way the handlers say to.
  function applyAnswers() {
    stores.resourcePicker.actions.setSelection({ selection: handlers.selection });
    stores.share.actions.setOutcome({ outcome: handlers.shareOutcome });
  }
  applyAnswers();

  function answer(request: AdminRequest): AdminHandler {
    if (request.url.includes('graphql.json')) {
      const handler = handlers.graphql.get(request.operationName ?? '') ?? handlers.graphql.get('*');
      if (handler) return handler;
      const name = request.operationName ?? 'anonymous';
      throw new Error(`[mock-bridge] No handler for Admin GraphQL operation "${name}". Add one with bridge.graphql('${name}', () => ({ data: ... })).`);
    }

    const path = request.url.replace(/^(?:.*\/|shopify:)admin\/api\/(?:\d{4}-\d{2}\/|unstable\/)?/, '').split('?')[0];
    const route = handlers.rest.find(({ method, path: pattern }) =>
      method.toUpperCase() === request.method && (typeof pattern === 'string' ? pattern === path : pattern.test(path)));
    if (route) return route.handler;
    throw new Error(`[mock-bridge] No handler for Admin REST request ${request.method} ${path}. Add one with bridge.rest('${request.method}', '${path}', () => ({ ... })).`);
  }

  const host: BridgeHost = {
    config: { apiKey: resolved.apiKey, shop: resolved.shop, locale: resolved.locale },
    environment: { embedded: resolved.embedded },
    async invoke(feature, action, payload, options) {
      if (!options?.mirror) calls.push({ feature, action, payload });
      return runFeatureAction(stores, feature, action, payload).result;
    },
    listen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    idToken: () => signSessionToken({
      shop: resolved.shop,
      clientId: resolved.apiKey,
      clientSecret: resolved.clientSecret,
      userId: resolved.userId,
    }),
    async adminFetch({ url, init }: AdminFetchRequest) {
      const body = bodyText(init.body);
      const graphql = url.includes('graphql.json') ? parseBody(body) : undefined;
      const request: AdminRequest = {
        url,
        method: (init.method ?? 'GET').toUpperCase(),
        headers: new Headers(init.headers),
        body,
        operationName: graphql?.operationName ?? graphql?.query?.match(GRAPHQL_OPERATION)?.[1],
        query: graphql?.query,
        variables: graphql?.variables,
      };
      adminRequests.push(request);

      const result = await answer(request)(request);
      return result instanceof Response ? result : Response.json(result);
    },
  };

  const copy = (from: Handlers): Handlers => ({ ...from, graphql: new Map(from.graphql), rest: [...from.rest] });

  const bridge: TestBridge = {
    options: resolved,
    host,
    stores,
    calls,
    adminRequests,
    get shopify() {
      if (!shopify) throw new Error('[mock-bridge] Call bridge.install() before using bridge.shopify.');
      return shopify;
    },

    install(target: object = globalThis) {
      const win = target as BridgeWindow & { shopify?: ShopifyGlobal };
      if (!shopify) {
        // The window's own AbortController: jsdom rejects signals from another realm.
        controller = new (win.AbortController ?? AbortController)();
        // Printing and opening windows are only recorded.
        shopify = createShopify(host, { window: win, signal: controller.signal, native: false });
      }
      win.shopify = shopify;
      const restoreFetch = patchFetch(win, host);
      return () => {
        restoreFetch();
        if (win.shopify === shopify) Reflect.deleteProperty(win, 'shopify');
      };
    },

    graphql(operationName, handler) {
      handlers.graphql.set(operationName, handler);
    },
    rest(method, path, handler) {
      handlers.rest.unshift({ method, path, handler });
    },
    resourcePicker(selection) {
      handlers.selection = selection;
      stores.resourcePicker.actions.setSelection({ selection });
    },
    shareResult(outcome) {
      handlers.shareOutcome = outcome;
      stores.share.actions.setOutcome({ outcome });
    },

    toasts: () => calls
      .filter(call => call.feature === 'toast' && call.action === 'show')
      .map(call => call.payload as Toast),
    saveBar: id => stores.saveBar.state.peek().saveBars[id],
    modal: id => stores.modal.state.peek().modalStates[id],
    navMenu: () => stores.navMenu.state.peek().items,
    loading: () => stores.loading.state.peek().isLoading,
    navigation: () => stores.navigation.state.peek(),
    appWindow: id => stores.appWindow.state.peek().appWindows[id],
    titleBar: () => stores.titleBar.state.peek().titleBar,
    clickTitleBarAction(idOrLabel) {
      const titleBar = stores.titleBar.state.peek().titleBar;
      const actions: TitleBarAction[] = titleBar ? [
        titleBar.breadcrumb,
        titleBar.primaryAction,
        ...titleBar.secondaryActions.flatMap(item => 'actions' in item ? item.actions : [item]),
      ].filter(action => action !== null) : [];
      const action = actions.find(action => action.id === idOrLabel) ?? actions.find(action => action.label === idOrLabel);
      if (!action) {
        const known = actions.map(action => `"${action.label}"`).join(', ') || 'none';
        throw new Error(`[mock-bridge] No title bar action "${idOrLabel}". Actions: ${known}.`);
      }
      stores.titleBar.actions.click({ id: action.id });
    },
    shares: () => calls
      .filter(call => call.feature === 'share' && call.action === 'share')
      .map(call => call.payload as ShareRequest),
    prints: () => stores.print.state.peek().count,
    navigate: href => stores.navigation.actions.navigate({ href }),
    idToken: () => host.idToken(),

    checkpoint() {
      baseline = copy(handlers);
    },
    reset() {
      // Closing app windows tells the app, which may call App Bridge back: clear the log after.
      resetFeatureStores(stores, { keepMirrored: true });
      calls.length = 0;
      adminRequests.length = 0;
      handlers = copy(baseline);
      applyAnswers();
    },
    dispose() {
      controller?.abort();
    },
  };

  return bridge;
}
