import { parseUrl } from '../url.js';
import { mirror, observeElements, onEvent, type FeatureContext } from './context.js';

/** Mirrors `<s-app-window>` elements into the admin, which shows them as full-screen windows. */
export function appWindow(ctx: FeatureContext) {
  const { window } = ctx;

  observeElements(ctx, ['s-app-window'], (element, elementCtx) => {
    const id = element.getAttribute('id');
    if (!id) return;
    let open = false;

    element.style.display = 'none';

    const src = () => {
      const value = element.getAttribute('src');
      if (!value) return null;
      return parseUrl(value, element.ownerDocument.baseURI)?.href ?? value;
    };
    // The `src` setter and the attribute observer both report a change; the admin hears it once.
    let sent: string | null | undefined;
    const update = () => {
      const value = src();
      if (value === sent) return;
      sent = value;
      mirror(ctx, 'appWindow', 'update', { id, src: value });
    };
    update();

    const observer = new window.MutationObserver(update);
    observer.observe(element, { attributes: true, attributeFilter: ['src'] });
    elementCtx.signal.addEventListener('abort', () => observer.disconnect());

    onEvent(elementCtx, 'appWindow', (event, payload: { id: string }) => {
      if (payload?.id !== id || (event !== 'show' && event !== 'hide')) return;
      open = event === 'show';
      element.dispatchEvent(new window.Event(event));
    });

    const action = (name: string) => async () => { await ctx.host.invoke('appWindow', name, { id }); };
    Object.defineProperties(element, {
      show: { configurable: true, value: action('show') },
      hide: { configurable: true, value: action('hide') },
      toggle: { configurable: true, value: action('toggle') },
      src: {
        configurable: true,
        get: () => element.getAttribute('src') ?? '',
        set: (value: string) => {
          element.setAttribute('src', value);
          update();
        },
      },
      // The admin names each window's iframe; named frames are reachable across origins.
      contentWindow: {
        configurable: true,
        get: () => {
          if (!open || window.parent === window) return null;
          try {
            return (window.parent as unknown as Record<string, Window | undefined>)[`app-window-${id}`] ?? null;
          } catch {
            // Across origins, only frames that exist can be named.
            return null;
          }
        },
      },
    });

    // The element left the page: the admin closes its window and forgets it.
    return () => mirror(ctx, 'appWindow', 'remove', { id });
  });
}
