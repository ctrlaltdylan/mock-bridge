import type {
  AdminFetchRequest,
  BridgeHost,
  FeatureActionRequestMessage,
  FeatureActionResponseMessage,
  FeatureEvent,
  FeatureEventMessage,
} from '../../src/core/protocol';
import { decodeJwt } from '../../src/auth/jwt';

type AdminApiConfig = 'mock' | { proxy: string } | { accessToken: string };

/** The mock server's origin: from the script's own src, else the parent frame's. */
function detectMockServerUrl(): string {
  const script = document.querySelector<HTMLScriptElement>('script[src*="app-bridge.js"]');
  if (script?.src) return new URL(script.src).origin;
  try {
    if (window.parent !== window) return window.parent.location.origin;
  } catch {
    // Cross-origin parent.
  }
  return 'http://localhost:3080';
}

/** Talks to the admin-frame (the parent window) over postMessage, like real App Bridge. */
export function createPostMessageHost(): BridgeHost {
  const mockServerUrl = detectMockServerUrl();
  const params = new URLSearchParams(window.location.search);
  // This page: when the admin hears from a new one, it drops what the previous page showed.
  const page = Math.random().toString(36).slice(2, 10);
  let token: { value: string; exp: number } | null = null;
  let pendingToken: Promise<string> | null = null;

  const adminApiConfig: Promise<AdminApiConfig> = fetch(`${mockServerUrl}/api/config`)
    .then(response => response.json())
    .then(config => config.adminApi ?? 'mock')
    .catch(() => {
      console.warn('[MockAppBridge] Could not fetch admin API config, using default (mock)');
      return 'mock' as const;
    });

  function requestToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Session token request timeout'));
      }, 5000);

      function handler(event: MessageEvent) {
        if (event.data?.type !== 'SESSION_TOKEN_RESPONSE') return;
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve(event.data.token);
      }

      window.addEventListener('message', handler);
      window.parent.postMessage({ type: 'SESSION_TOKEN_REQUEST', source: 'app' }, '*');
    });
  }

  async function idToken(): Promise<string> {
    // Reuse a token until 10s before it expires.
    if (token && token.exp - 10 > Date.now() / 1000) return token.value;
    pendingToken ??= requestToken()
      .then(value => {
        token = { value, exp: decodeJwt<{ exp?: number }>(value)?.exp ?? 0 };
        return value;
      })
      .finally(() => { pendingToken = null; });
    return pendingToken;
  }

  const config = {
    apiKey: document.querySelector<HTMLMetaElement>('meta[name="shopify-api-key"]')?.content ?? '',
    shop: params.get('shop') ?? '',
    locale: params.get('locale') ?? 'en',
  };

  return {
    config,

    invoke(feature, action, payload, options = {}) {
      const { timeout: ms = 1000 } = options;
      return new Promise((resolve, reject) => {
        const actionId = crypto.randomUUID();
        // Round-trip through JSON: callbacks in the payload can't be posted.
        const message: FeatureActionRequestMessage = {
          type: 'FEATURE_ACTION_REQUEST',
          action_id: actionId,
          page,
          feature,
          action,
          payload: payload === undefined ? undefined : JSON.parse(JSON.stringify(payload)),
        };

        const timeout = ms > 0 ? setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error(`Feature action timed out after ${ms}ms`));
        }, ms) : undefined;

        function handler(event: MessageEvent) {
          if (event.data?.type !== 'FEATURE_ACTION_RESPONSE' || event.data.action_id !== actionId) return;
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          const { payload, error } = event.data as FeatureActionResponseMessage;
          if (error !== undefined) reject(new Error(`${feature}.${action} failed in the admin: ${error}`));
          else resolve(payload);
        }

        window.addEventListener('message', handler);
        window.parent.postMessage(message, '*');
      });
    },

    listen(listener) {
      const handler = (event: MessageEvent) => {
        if (event.source !== window.parent || event.data?.type !== 'FEATURE_EVENT') return;
        const { feature, event: name, payload } = event.data as FeatureEventMessage;
        listener({ feature, event: name, payload } satisfies FeatureEvent);
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    },

    idToken,

    async adminFetch({ url, init }: AdminFetchRequest, fetch) {
      const mode = await adminApiConfig;
      const headers = new Headers(init.headers);
      const envelope = () => {
        headers.set('Content-Type', 'application/json');
        return { method: 'POST', headers, body: JSON.stringify({ url, method: init.method || 'GET', body: init.body }) };
      };

      if (mode === 'mock') return fetch(`${mockServerUrl}/mock-admin-api`, envelope());
      if ('proxy' in mode) {
        // The app's proxy authenticates the request with the session token.
        headers.set('Authorization', `Bearer ${await idToken()}`);
        return fetch(mode.proxy, envelope());
      }

      // Direct requests to Shopify authenticate with the access token instead.
      headers.set('X-Shopify-Access-Token', mode.accessToken);
      headers.delete('Authorization');
      const shopUrl = url.replace(/^shopify:admin\//, `https://${config.shop}/admin/`);
      return fetch(shopUrl, { ...init, headers });
    },
  };
}
