import type { BridgeHost } from '../protocol';

export type BridgeWindow = Window & typeof globalThis;

export interface FeatureContext {
  host: BridgeHost;
  window: BridgeWindow;
  /** Aborted when the bridge is disposed; observers and listeners detach. */
  signal: AbortSignal;
}

/** Invokes an action whose result the app never sees, e.g. from a sync API. */
export function fire(ctx: FeatureContext, feature: string, action: string, payload?: unknown) {
  ctx.host.invoke(feature, action, payload).catch(error => {
    console.warn(`[MockAppBridge] ${feature}.${action} failed:`, error);
  });
}

/** Runs `setup` for every current and future element matching `selectors`. */
export function observeElements(ctx: FeatureContext, selectors: string[], setup: (element: HTMLElement) => void) {
  const { document, MutationObserver, HTMLElement } = ctx.window;
  const seen = new WeakSet<Element>();
  const visit = (element: Element) => {
    if (seen.has(element) || !(element instanceof HTMLElement)) return;
    seen.add(element);
    setup(element);
  };
  const scan = () => document.querySelectorAll(selectors.join(',')).forEach(visit);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { signal: ctx.signal });
  } else {
    scan();
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches(selectors.join(','))) visit(node);
        node.querySelectorAll(selectors.join(',')).forEach(visit);
      });
    }
  });
  // Observing the document (not documentElement) also works before parsing starts.
  observer.observe(document, { childList: true, subtree: true });
  ctx.signal.addEventListener('abort', () => observer.disconnect());
}
