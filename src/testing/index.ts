import type { ShopifyGlobal } from '@shopify/app-bridge-types';
import { STANDARD_MOCK_CLIENT_ID, STANDARD_MOCK_SECRET } from '../auth/constants';
import { signSessionToken } from '../auth/jwt';
import { createShopify } from '../core/create-shopify';
import type { BridgeWindow } from '../core/features/context';
import { patchFetch } from '../core/fetch';
import type { AdminFetchRequest, BridgeHost } from '../core/protocol';
import {
  createFeatureStores,
  resetFeatureStores,
  runFeatureAction,
  type FeatureStores,
  type ModalState,
  type NavItem,
  type SaveBarState,
  type Toast,
} from '../core/stores';

export type { FeatureStores, ModalState, NavItem, SaveBarState, Toast } from '../core/stores';
export type { BridgeHost } from '../core/protocol';

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
  /** Every `host.invoke` call, in order. */
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

  /** Toasts shown so far, including hidden ones. */
  toasts(): Toast[];
  saveBar(id: string): SaveBarState | undefined;
  modal(id: string): ModalState | undefined;
  navMenu(): NavItem[];
  loading(): boolean;
  idToken(): Promise<string>;

  /** Keeps the current handlers across `reset()` (like msw's initial handlers). */
  checkpoint(): void;
  /** Clears recorded calls and admin state, and restores handlers to the last checkpoint. */
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

  const stores = createFeatureStores();
  const calls: FeatureCall[] = [];
  const adminRequests: AdminRequest[] = [];
  let controller: AbortController | undefined;
  let handlers: Handlers = { graphql: new Map(), rest: [], selection: [] };
  let baseline: Handlers = { graphql: new Map(), rest: [], selection: [] };
  let shopify: ShopifyGlobal | undefined;

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
    async invoke(feature, action, payload) {
      calls.push({ feature, action, payload });
      return runFeatureAction(stores, feature, action, payload).result;
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

  const copy = (from: Handlers): Handlers => ({ graphql: new Map(from.graphql), rest: [...from.rest], selection: from.selection });

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
        shopify = createShopify(host, { window: win, signal: controller.signal });
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
      stores.resourcePicker.getState().setSelection({ selection });
    },

    toasts: () => calls
      .filter(call => call.feature === 'toast' && call.action === 'show')
      .map(call => call.payload as Toast),
    saveBar: id => stores.saveBar.getState().saveBars[id],
    modal: id => stores.modal.getState().modalStates[id],
    navMenu: () => stores.navMenu.getState().items,
    loading: () => stores.loading.getState().isLoading,
    idToken: () => host.idToken(),

    checkpoint() {
      baseline = copy(handlers);
    },
    reset() {
      calls.length = 0;
      adminRequests.length = 0;
      resetFeatureStores(stores);
      handlers = copy(baseline);
      stores.resourcePicker.getState().setSelection({ selection: handlers.selection });
    },
    dispose() {
      controller?.abort();
    },
  };

  return bridge;
}
