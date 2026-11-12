import type { BridgeHost } from './protocol.js';

type FetchTarget = { fetch?: typeof globalThis.fetch; location?: { href: string; origin: string } };

/**
 * Admin API requests App Bridge answers: direct API access (`shopify:admin/...`)
 * and, as before, any URL containing `/admin/api/`.
 */
export function isAdminApiRequest(url: string): boolean {
  return url.startsWith('shopify:admin/') || url.includes('/admin/api/');
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isSameOrigin(url: string, location: FetchTarget['location']): boolean {
  if (!location) return !/^[a-z][a-z\d+.-]*:/i.test(url);
  try {
    return new URL(url, location.href).origin === location.origin;
  } catch {
    return false;
  }
}

/**
 * Patches `target.fetch` like App Bridge does: Admin API requests go to the
 * host, and requests to the app's own origin carry `Authorization: Bearer <id token>`.
 * Returns a function that restores the original fetch.
 */
export function patchFetch(target: FetchTarget, host: BridgeHost): () => void {
  const hadOwnFetch = Object.prototype.hasOwnProperty.call(target, 'fetch');
  const original = target.fetch;
  // A window without fetch (jsdom) falls back to the runtime's.
  const base = original ?? globalThis.fetch;
  const inner: typeof globalThis.fetch = (...args) => base(...args);

  const patched: typeof globalThis.fetch = async (input, init) => {
    const url = requestUrl(input);

    if (isAdminApiRequest(url)) {
      const requestInit: RequestInit = { ...init };
      if (typeof input === 'object' && !(input instanceof URL)) {
        requestInit.method ??= input.method;
        requestInit.headers ??= input.headers;
        requestInit.body ??= init?.body ?? (input.body ? await input.clone().text() : undefined);
      }
      return host.adminFetch({ url, init: requestInit }, inner);
    }

    if (isSameOrigin(url, target.location)) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${await host.idToken()}`);
        return inner(input, { ...init, headers });
      }
    }

    return inner(input, init);
  };

  target.fetch = patched;
  return () => {
    if (target.fetch !== patched) return;
    if (hadOwnFetch) target.fetch = original;
    else delete target.fetch;
  };
}
