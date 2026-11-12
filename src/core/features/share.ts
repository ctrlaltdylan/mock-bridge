import type { ShareRequest } from '../stores.js';
import { parseUrl } from '../url.js';
import { patchMember, type FeatureContext } from './context.js';

/** `navigator.share()` opens the admin's share sheet, which works inside the app's iframe. */
export function share(ctx: FeatureContext) {
  const { window } = ctx;

  // Validates like the Web Share API.
  function request(data: ShareData = {}): ShareRequest {
    const { title, text, url, files } = data;
    if (title === undefined && text === undefined && url === undefined && !files?.length) {
      throw new TypeError('navigator.share() needs at least one of title, text, url or files');
    }
    const result: ShareRequest = {};
    if (title !== undefined) result.title = String(title);
    if (text !== undefined) result.text = String(text);
    if (url !== undefined) {
      const parsed = parseUrl(url, window.document.baseURI);
      if (!parsed) throw new TypeError(`navigator.share(): invalid URL ${url}`);
      result.url = parsed.href;
    }
    if (files?.length) result.files = files.map(({ name, type, size }) => ({ name, type, size }));
    return result;
  }

  patchMember(ctx, window.navigator, 'share', async (data?: ShareData) => {
    const outcome = await ctx.host.invoke('share', 'share', request(data), { timeout: 0 });
    if (outcome !== 'shared') throw new window.DOMException('Share canceled', 'AbortError');
  });

  patchMember(ctx, window.navigator, 'canShare', (data?: ShareData) => {
    try {
      request(data);
      return true;
    } catch {
      return false;
    }
  });
}
