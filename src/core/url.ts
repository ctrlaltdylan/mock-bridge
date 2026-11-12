/** `url` resolved against `base`, or `null` if it isn't a valid URL. */
export function parseUrl(url: string | URL, base?: string | URL): URL | null {
  try {
    return new URL(url, base);
  } catch {
    return null;
  }
}
