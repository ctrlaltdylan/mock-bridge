import type { BridgeHost, InvokeOptions } from '../protocol.js';

export type BridgeWindow = Window & typeof globalThis;

export interface FeatureContext {
  host: BridgeHost;
  window: BridgeWindow;
  /** Aborted when the bridge is disposed; observers and listeners detach. */
  signal: AbortSignal;
  /** Whether `print()` and `window.open()` also reach the browser, or are only recorded. */
  native: boolean;
}

/** Invokes an action whose result the app never sees, e.g. from a sync API. */
export function fire(ctx: FeatureContext, feature: string, action: string, payload?: unknown, options?: InvokeOptions) {
  ctx.host.invoke(feature, action, payload, options).catch(error => {
    console.warn(`[MockAppBridge] ${feature}.${action} failed:`, error);
  });
}

/** Reports the page's state to the admin, e.g. an element's content: not a call the app made. */
export function mirror(ctx: FeatureContext, feature: string, action: string, payload?: unknown) {
  fire(ctx, feature, action, payload, { mirror: true });
}

/** Calls `listener` for the admin's events about `feature` until the bridge is disposed. */
export function onEvent(ctx: FeatureContext, feature: string, listener: (event: string, payload: any) => void) {
  const unsubscribe = ctx.host.listen(event => {
    if (event.feature === feature) listener(event.event, event.payload);
  });
  ctx.signal.addEventListener('abort', unsubscribe);
}

/** Replaces `target[key]` until the bridge is disposed. */
export function patchMember<T extends object, K extends keyof T>(ctx: FeatureContext, target: T, key: K, value: T[K]) {
  const own = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
  ctx.signal.addEventListener('abort', () => {
    if (target[key] !== value) return;
    if (own) Object.defineProperty(target, key, own);
    else delete target[key];
  });
}

type ElementWatcher = {
  selector: string;
  /** The elements set up so far, with what tears each one down. */
  live: Map<Element, AbortController>;
  visit(element: Element): void;
};

/** One document observer per bridge: each inserted subtree is queried once for every feature's elements. */
const watchers = new WeakMap<AbortSignal, ElementWatcher[]>();

function documentWatchers(ctx: FeatureContext): ElementWatcher[] {
  const existing = watchers.get(ctx.signal);
  if (existing) return existing;

  const { document, MutationObserver, HTMLElement } = ctx.window;
  const list: ElementWatcher[] = [];
  watchers.set(ctx.signal, list);

  const observer = new MutationObserver(mutations => {
    // Removals first, so an element replaced by one with the same id is set up after it's torn down.
    // Only removing an element can take one of ours off the page; text changes can't.
    const removedElement = mutations.some(mutation => Array.from(mutation.removedNodes).some(node => node.nodeType === 1));
    if (removedElement) {
      for (const watcher of list) {
        for (const [element, controller] of watcher.live) {
          if (element.isConnected) continue;
          watcher.live.delete(element);
          controller.abort();
        }
      }
    }
    const selector = list.map(watcher => watcher.selector).join(',');
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement) || !node.isConnected) return;
        const found = Array.from(node.querySelectorAll(selector));
        if (node.matches(selector)) found.unshift(node);
        for (const element of found) {
          for (const watcher of list) if (element.matches(watcher.selector)) watcher.visit(element);
        }
      });
    }
  });
  // Observing the document (not documentElement) also works before parsing starts.
  observer.observe(document, { childList: true, subtree: true });
  ctx.signal.addEventListener('abort', () => {
    observer.disconnect();
    watchers.delete(ctx.signal);
  });
  return list;
}

/**
 * Runs `setup` for every current and future element matching `selectors`. Its context's
 * `signal` aborts when the element leaves the document (or the bridge is disposed), so
 * listeners and observers set up with it detach; if the element comes back, `setup` runs again.
 * The function `setup` returns, if any, runs when the element leaves the page (not on dispose).
 */
export function observeElements(
  ctx: FeatureContext,
  selectors: string[],
  setup: (element: HTMLElement, elementCtx: FeatureContext) => (() => void) | void,
) {
  const { document, HTMLElement, AbortController } = ctx.window;
  const watcher: ElementWatcher = {
    selector: selectors.join(','),
    live: new Map(),
    visit(element) {
      if (watcher.live.has(element) || !(element instanceof HTMLElement)) return;
      // The window's own AbortController: jsdom rejects signals from another realm.
      const controller = new AbortController();
      watcher.live.set(element, controller);
      ctx.signal.addEventListener('abort', () => controller.abort(), { signal: controller.signal });
      const removed = setup(element, { ...ctx, signal: controller.signal });
      if (removed) controller.signal.addEventListener('abort', () => { if (!ctx.signal.aborted) removed(); });
    },
  };
  documentWatchers(ctx).push(watcher);

  const scan = () => document.querySelectorAll(watcher.selector).forEach(element => watcher.visit(element));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { signal: ctx.signal });
  } else {
    scan();
  }
}
