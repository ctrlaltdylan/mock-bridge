import type { ShopifyGlobal } from '@shopify/app-bridge-types';
import type { BridgeHost } from './protocol';
import { fire, type BridgeWindow, type FeatureContext } from './features/context';
import { modal } from './features/modal';
import { navMenu } from './features/nav-menu';
import { saveBar } from './features/save-bar';
import { app, intents, picker, pos, reviews, scanner, scopes, shopifyQL, support, tools, user, webVitals } from './features/stubs';

export interface CreateShopifyOptions {
  /** The window whose DOM is observed for `<ui-modal>`, `<ui-save-bar>` and `<ui-nav-menu>`. */
  window: BridgeWindow;
  /** Abort to disconnect the DOM observers and listeners. */
  signal?: AbortSignal;
}

/** Builds a `window.shopify` whose admin side is `host`. */
export function createShopify(host: BridgeHost, options: CreateShopifyOptions): ShopifyGlobal {
  const { window } = options;
  const ctx: FeatureContext = { host, window, signal: options.signal ?? new AbortController().signal };
  let toastId = 0;

  navMenu(ctx);

  return {
    config: host.config,
    // The real global reports the admin's origin; the mock has none.
    origin: '',
    ready: Promise.resolve(),
    setSignals: () => {},
    environment: {
      embedded: window.self !== window.top,
      mobile: /mobile|android|iphone|ipad/i.test(window.navigator.userAgent),
      pos: false,
      intent: false,
      ...host.environment,
    },
    idToken: () => host.idToken(),
    loading: (isLoading?: boolean) => fire(ctx, 'loading', 'setLoading', { isLoading: isLoading !== false }),
    toast: {
      show: (message, opts = {}) => {
        const id = `toast-${++toastId}`;
        // Callbacks can't cross to the admin.
        const { duration, isError, action } = opts;
        fire(ctx, 'toast', 'show', { id, message, duration, isError, action });
        return id;
      },
      hide: id => fire(ctx, 'toast', 'hide', { id }),
    },
    resourcePicker: (async (options: unknown) => {
      const selection = await host.invoke('resourcePicker', 'open', { options });
      if (!Array.isArray(selection)) return undefined;
      // The real payload also exposes itself as the deprecated `selection`; non-enumerable so
      // it stays out of equality checks.
      return Object.defineProperty([...selection], 'selection', { value: selection });
    }) as ShopifyGlobal['resourcePicker'],
    modal: modal(ctx),
    saveBar: saveBar(ctx),
    scopes: scopes(),
    user: user(),
    scanner: scanner(),
    pos: pos(),
    intents: intents(),
    webVitals: webVitals(),
    support: support(),
    reviews: reviews(),
    picker: picker(),
    app: app(),
    shopifyQL: shopifyQL(),
    tools: tools(),
  };
}
