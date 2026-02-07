/**
 * Mock Shopify App Bridge Client Library
 * This mimics the real @shopify/app-bridge library for testing purposes
 */

import { modal } from "./features/modal";
import { saveBar } from "./features/save-bar";
import { scopes } from "./features/scopes";
import { config } from "./features/config";
import { environment } from "./features/environment";
import { user } from "./features/user";
import { toast } from "./features/toast";
import { resourcePicker } from "./features/resource-picker";
import { scanner } from "./features/scanner";
import { pos } from "./features/pos";
import { intents } from "./features/intents";
import { webVitals } from "./features/web-vitals";
import { support } from "./features/support";
import { reviews } from "./features/reviews";
import { picker } from "./features/picker";
import { app } from "./features/app";
import { loading } from "./features/loading";
import { navMenu } from "./features/nav-menu";

(function (window) {
  'use strict';

  // Store for app instances
  const appInstances = new Map();
  let currentSessionToken: string | null = null;
  let tokenRefreshInterval: number | null = null;

  // Mock App Bridge Actions
  const Actions = {
    Modal: {
      Action: {
        OPEN: 'MODAL_OPEN',
        CLOSE: 'MODAL_CLOSE',
        UPDATE: 'MODAL_UPDATE',
        DATA: 'MODAL_DATA',
      },
      Size: {
        Small: 'small',
        Medium: 'medium',
        Large: 'large',
        Full: 'full',
      },
      create: function (app: any, options: any) {
        return {
          id: 'modal_' + Date.now(),
          dispatch: function (action: any) {
            app.dispatch({ type: action, payload: options });
          },
          set: function (newOptions: any) {
            Object.assign(options, newOptions);
            this.dispatch(Actions.Modal.Action.UPDATE);
          },
          unsubscribe: function () {
            // Clean up subscriptions
          },
        };
      },
    },
    Toast: {
      Action: {
        SHOW: 'TOAST_SHOW',
        CLEAR: 'TOAST_CLEAR',
      },
      create: function (app: any, options: any) {
        return {
          dispatch: function (action: any) {
            if (action === Actions.Toast.Action.SHOW) {
              console.log('[MockAppBridge] Toast:', options.message);
              // In a real implementation, show a toast UI
            }
          },
        };
      },
    },
    Loading: {
      Action: {
        START: 'LOADING_START',
        STOP: 'LOADING_STOP',
      },
      create: function (app: any) {
        return {
          dispatch: function (action: any) {
            app.dispatch({ type: action });
          },
        };
      },
    },
    TitleBar: {
      Action: {
        UPDATE: 'TITLEBAR_UPDATE',
      },
      create: function (app: any, options: any) {
        return {
          set: function (newOptions: any) {
            Object.assign(options, newOptions);
            app.dispatch({ type: Actions.TitleBar.Action.UPDATE, payload: options });
          },
        };
      },
    },
    ResourcePicker: {
      Action: {
        OPEN: 'RESOURCE_PICKER_OPEN',
        SELECT: 'RESOURCE_PICKER_SELECT',
        CANCEL: 'RESOURCE_PICKER_CANCEL',
      },
      ResourceType: {
        Product: 'product',
        ProductVariant: 'variant',
        Collection: 'collection',
      },
      create: function (app: any, options: any) {
        const subscribers = new Map();
        return {
          dispatch: function (action: any) {
            if (action === Actions.ResourcePicker.Action.OPEN) {
              // Mock selection after a delay
              setTimeout(() => {
                const mockSelection = {
                  selection: [{
                    id: 'gid://shopify/Product/123456',
                    title: 'Mock Product',
                    handle: 'mock-product',
                  }],
                };
                subscribers.forEach(callback => {
                  if (callback.action === Actions.ResourcePicker.Action.SELECT) {
                    callback.handler(mockSelection);
                  }
                });
              }, 100);
            }
          },
          subscribe: function (action: any, handler: any) {
            const id = Date.now();
            subscribers.set(id, { action, handler });
            return () => subscribers.delete(id);
          },
        };
      },
    },
    Redirect: {
      Action: {
        APP: 'APP_REDIRECT',
        REMOTE: 'REMOTE_REDIRECT',
        ADMIN_PATH: 'ADMIN_PATH_REDIRECT',
      },
      create: function (app: any) {
        return {
          dispatch: function (action: any, payload: any) {
            if (action === Actions.Redirect.Action.REMOTE) {
              window.open(payload.url, payload.newContext ? '_blank' : '_self');
            }
          },
        };
      },
      toRemote: function (payload: any) {
        return { type: Actions.Redirect.Action.REMOTE, payload };
      },
      toApp: function (payload: any) {
        return { type: Actions.Redirect.Action.APP, payload };
      },
    },
    Error: {
      Action: {
        INVALID_ACTION: 'INVALID_ACTION',
        INVALID_PAYLOAD: 'INVALID_PAYLOAD',
        NETWORK: 'NETWORK_ERROR',
        UNAUTHORIZED: 'UNAUTHORIZED',
      },
    },
  };

  // Utilities for App Bridge
  const utilities = {
    getSessionToken: async function (_app: any) {
      // Request session token from parent frame
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Session token request timeout'));
        }, 5000);

        const handler = function (event: any) {
          if (event.data && event.data.type === 'SESSION_TOKEN_RESPONSE') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            currentSessionToken = event.data.token;
            resolve(event.data.token);
          }
        };

        window.addEventListener('message', handler);

        // Post message to parent requesting token
        window.parent.postMessage({
          type: 'SESSION_TOKEN_REQUEST',
          source: 'app',
        }, '*');
      });
    },

    authenticatedFetch: function (app: any, fetch: any) {
      return async function (...args: any[]) {
        const token = await utilities.getSessionToken(app);

        const url = args[0];
        const options = args[1] || {};

        if (typeof url === 'string') {
          options.headers = options.headers || {};
          if (options.headers instanceof Headers) {
            options.headers.append('Authorization', `Bearer ${token}`);
          } else {
            options.headers['Authorization'] = `Bearer ${token}`;
          }
        }

        return fetch(url, options);
      };
    },
  };

  // Main createApp function
  function createApp(config: any) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    if (!config.host) {
      throw new Error('Host is required');
    }

    const app = {
      config: config,
      listeners: new Set(),
      errorListeners: new Set(),

      dispatch: function (action: any) {
        console.log('[MockAppBridge] Dispatching:', action);

        // Send to parent frame
        window.parent.postMessage({
          type: 'APP_BRIDGE_ACTION',
          action: action,
          source: 'app',
        }, '*');

        // Notify local listeners
        this.listeners.forEach((listener: any) => listener(action));
      },

      subscribe: function (eventNameOrCallback: any, callback: any) {
        const handler = callback || eventNameOrCallback;
        const wrappedHandler = (action: any) => {
          if (typeof eventNameOrCallback === 'string') {
            if (action.type === eventNameOrCallback) {
              handler(action);
            }
          } else {
            handler(action);
          }
        };

        this.listeners.add(wrappedHandler);

        return () => {
          this.listeners.delete(wrappedHandler);
        };
      },

      error: function (callback: any) {
        this.errorListeners.add(callback);
        return () => {
          this.errorListeners.delete(callback);
        };
      },

      getState: async function () {
        return {
          staffMember: {
            id: '123456789',
            name: 'Test User',
            email: 'test@mockshop.com',
          },
          shop: {
            domain: new URL(atob(config.host)).hostname,
            name: 'Mock Shop',
          },
        };
      },

      // Add idToken method for @shopify/app-bridge-react compatibility
      idToken: async function () {
        return utilities.getSessionToken(app);
      },
    };

    appInstances.set(config.apiKey, app);

    // Start token refresh
    if (!tokenRefreshInterval) {
      tokenRefreshInterval = window.setInterval(async () => {
        try {
          await utilities.getSessionToken(app);
        } catch (error) {
          console.error('[MockAppBridge] Token refresh failed:', error);
        }
      }, 50000); // Refresh every 50 seconds
    }

    return app;
  }

  // Platform detection utilities
  const platform = {
    isShopifyEmbedded: function () {
      return window.self !== window.top;
    },
    isMobile: function () {
      return /mobile|android|iphone|ipad/i.test(navigator.userAgent);
    },
    isShopifyMobile: function () {
      return false; // Mock doesn't support mobile
    },
    isShopifyPOS: function () {
      return false; // Mock doesn't support POS
    },
  };

  // Export to window - match real Shopify App Bridge globals
  (window as any).createApp = createApp;
  (window as any).shopifyAppBridge = {
    createApp: createApp,
    actions: Actions,
    utilities: utilities,
    platform: platform,
  };

  // Create the 'shopify' global that @shopify/app-bridge-react expects
  window.shopify = {
    modal: modal(),
    saveBar: saveBar(),
    scopes: scopes(),
    config: config(),
    environment: environment(),
    user: user(),
    toast: toast(),
    resourcePicker: resourcePicker(),
    scanner: scanner(),
    pos: pos(),
    intents: intents(),
    webVitals: webVitals(),
    support: support(),
    reviews: reviews(),
    picker: picker(),
    app: app(),

    // Lifecycle methods
    ready: Promise.resolve(),
    loading: loading(),

    // Origin should be empty string for mock
    origin: '',

    // Add idToken method directly to shopify global for useAppBridge() compatibility
    idToken: async function () {
      console.log('[MockAppBridge] idToken called on shopify global');
      // Request session token from parent frame
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Session token request timeout'));
        }, 5000);

        const handler = function (event: any) {
          if (event.data && event.data.type === 'SESSION_TOKEN_RESPONSE') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);

            currentSessionToken = event.data.token;
            resolve(event.data.token);
          }
        };

        window.addEventListener('message', handler);

        window.parent.postMessage({
          type: 'SESSION_TOKEN_REQUEST',
          source: 'app',
        }, '*');
      });
    }
  };

  // For @shopify/app-bridge-react compatibility, we need to ensure
  // that the library can find the App Bridge functions
  if (!(window as any).ShopifyAppBridge) {
    (window as any).ShopifyAppBridge = {
      createApp: createApp,
      actions: Actions,
      utilities: utilities,
      platform: platform,
    };
  }

  // Initialize nav menu observer
  navMenu();

  console.log('[MockAppBridge] Client library loaded');

  const _fetch = window.fetch;
  window.fetch = (...args) => {
    const [url, options] = args;

    return _fetch(url, {
      ...options,
      headers: {
        ...(options?.headers || {}),
        'Authorization': `Bearer ${currentSessionToken}`,
      },
    });
  }
})(window);