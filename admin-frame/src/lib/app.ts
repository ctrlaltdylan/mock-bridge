import type { Config } from "../hooks/useConfig";

/** The sandbox the admin embeds the app's pages in. */
export const APP_SANDBOX = "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-modals allow-downloads";

/** Where the app is served from: its URL, or the same-origin proxy. */
export function appBase(config: Config): string {
  return (config.proxy ? `${location.origin}/__proxy` : config.appUrl).replace(/\/$/, '');
}

/** The app's path relative to its base, e.g. `/fees?tab=all`, or `null` for URLs outside the app. */
export function appPath(config: Config, url: string): string | null {
  const base = appBase(config);
  if (!url.startsWith(base)) return null;
  const rest = url.slice(base.length);
  if (rest && !/^[/?#]/.test(rest)) return null;
  return rest || '/';
}

/** An app URL with the parameters the admin adds when embedding it. */
export function embedUrl(config: Config, url: string, idToken: string): string {
  const embed = new URL(url, location.href);
  embed.searchParams.set('host', btoa(config.shop));
  embed.searchParams.set('shop', config.shop);
  embed.searchParams.set('embedded', '1');
  embed.searchParams.set('id_token', idToken);
  return embed.href;
}

export function fetchSessionToken(config: Config): Promise<string> {
  return fetch('/api/session-token', {
    method: 'POST',
    body: JSON.stringify({ shop: config.shop }),
  }).then(res => res.json())
    .then(data => data.token);
}

/**
 * Tells an embedded page it's in a mock environment, so it loads the mock App Bridge.
 * Sent a few times to arrive before the page's detection times out.
 */
export function signalMockEnvironment(iframe: HTMLIFrameElement, config: Config) {
  const send = () => {
    try {
      iframe.contentWindow?.postMessage({
        type: 'MOCK_SHOPIFY_ENVIRONMENT',
        mockServerUrl: location.origin,
        shop: config.shop,
        clientId: config.clientId,
      }, '*');
    } catch (e) {
      console.warn('[MockAdmin] Could not signal mock environment:', (e as Error).message);
    }
  };
  send();
  for (const delay of [10, 50, 100]) setTimeout(send, delay);
}
