import type { ShopifyGlobal } from '@shopify/app-bridge-types';
import type { BridgeHost } from './protocol.js';
import { appWindow } from './features/app-window.js';
import { commands } from './features/commands.js';
import { fire, type BridgeWindow, type FeatureContext } from './features/context.js';
import { modal } from './features/modal.js';
import { navMenu } from './features/nav-menu.js';
import { navigation } from './features/navigation.js';
import { print } from './features/print.js';
import { saveBar } from './features/save-bar.js';
import { share } from './features/share.js';
import { titleBar } from './features/title-bar.js';
import { app, intents, picker, pos, reviews, scanner, scopes, shopifyQL, support, tools, user, webVitals } from './features/stubs.js';

export interface CreateShopifyOptions {
  /**
   * The app's window: its DOM is observed for `<ui-modal>`, `<ui-save-bar>`, `<ui-nav-menu>`,
   * `<ui-title-bar>`, `<s-page>` and `<s-app-window>`, and its `open`, `print`, `history` and `navigator.share` are patched.
   */
  window: BridgeWindow;
  /** Abort to disconnect the DOM observers and listeners and restore patched APIs. */
  signal?: AbortSignal;
  /** Whether `print()` and `window.open()` also reach the browser; otherwise they're only recorded. @default true */
  native?: boolean;
}

/** Builds a `window.shopify` whose admin side is `host`. */
export function createShopify(host: BridgeHost, options: CreateShopifyOptions): ShopifyGlobal {
  const { window } = options;
  const ctx: FeatureContext = { host, window, signal: options.signal ?? new AbortController().signal, native: options.native ?? true };
  let toastId = 0;

  navMenu(ctx);
  navigation(ctx);
  print(ctx);
  share(ctx);
  appWindow(ctx);
  titleBar(ctx);
  commands(ctx);

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
