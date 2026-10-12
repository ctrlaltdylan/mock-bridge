/** Query keys owned by the Shopify embed session, not by the app's router. */
const EMBED_QUERY_KEYS = new Set([
  'host',
  'shop',
  'embedded',
  'id_token',
  'idtoken',
  'token',
  'hmac',
  'locale',
  'session',
  'timestamp',
  'protocol',
]);

function stripEmbedQuery(params: URLSearchParams) {
  for (const key of [...params.keys()]) {
    if (EMBED_QUERY_KEYS.has(key.toLowerCase())) params.delete(key);
  }
}

export function adminAppPrefix(clientId: string) {
  return `/admin/apps/${clientId}`;
}

function sortedQuery(search: string) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/** Compare routes without caring about query key order. */
export function sameRoute(left: string, right: string) {
  const leftUrl = new URL(left, 'http://mock.local');
  const rightUrl = new URL(right, 'http://mock.local');
  return leftUrl.pathname === rightUrl.pathname && sortedQuery(leftUrl.search) === sortedQuery(rightUrl.search);
}

/**
 * App path reported by the iframe, without Shopify embed params.
 * `/campaigns?host=...&embedded=1` becomes `/campaigns`.
 */
export function appRouteFromIframe(pathnameWithSearch: string) {
  const url = new URL(pathnameWithSearch || '/', 'http://mock.local');
  stripEmbedQuery(url.searchParams);
  const search = url.searchParams.toString();
  return `${url.pathname || '/'}${search ? `?${search}` : ''}`;
}

/** Path the iframe should open, taken from the admin URL after `/admin/apps/:clientId`. */
export function appRouteFromAdminUrl(clientId: string, href = window.location.href) {
  const url = new URL(href);
  const prefix = adminAppPrefix(clientId);
  if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return '/';

  const pathname = url.pathname.slice(prefix.length) || '/';
  const params = new URLSearchParams(url.search);
  stripEmbedQuery(params);
  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ''}`;
}

/** Admin URL that mirrors the embedded app route, without Shopify embed params. */
export function adminRouteForApp(clientId: string, iframeLocation: string) {
  const appRoute = new URL(appRouteFromIframe(iframeLocation), 'http://mock.local');
  const suffix = appRoute.pathname === '/' ? '' : appRoute.pathname;
  const search = appRoute.searchParams.toString();
  return `${adminAppPrefix(clientId)}${suffix}${search ? `?${search}` : ''}`;
}
