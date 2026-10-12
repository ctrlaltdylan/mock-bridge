/**
 * Shopify App Bridge does not render <ui-nav-menu> or <ui-title-bar> inside
 * the iframe. The CDN script hides those elements and the admin frame paints
 * the sidebar and title bar. React mounts them as descendants of a parent
 * node, so a mutation observer that only checks the added node itself never
 * sees them.
 */

const TARGET_ATTR = 'data-mock-bridge-target';

let targetSequence = 0;

export function embeddedTargetId(element: Element): string {
  const existing = element.getAttribute(TARGET_ATTR);
  if (existing) return existing;

  targetSequence += 1;
  const id = `mb-${targetSequence}`;
  element.setAttribute(TARGET_ATTR, id);
  return id;
}

export function isInsideModal(element: Element): boolean {
  return Boolean(element.closest('ui-modal'));
}

/**
 * True when this document is the App Bridge modal content iframe
 * (src= route or mock-modal-shell clone), not the main embedded app.
 * Those frames must not lift NavMenu / TitleBar into the admin chrome.
 */
export function isModalContentFrame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.self === window.top) return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mock-modal-shell') === '1') return true;
    if (params.get('mock_modal') === '1') return true;
    if (typeof window.name === 'string' && window.name.startsWith('mock-modal-')) return true;
    // customize-embed / bundle settings routes are only loaded as Modal src=
    const path = window.location.pathname;
    if (path.includes('/customize-embed') || path.includes('/bundle_video_settings')) return true;
  } catch {
    return false;
  }
  return false;
}

export function hideInIframe(element: HTMLElement) {
  element.style.setProperty('display', 'none', 'important');
}

/**
 * Shopify's CDN hides <ui-nav-menu> and <ui-title-bar> with a shadow host
 * (`:host { display: none }`) and leaves the light-DOM children for the admin
 * frame. Register the same hosts when the CDN script is not on the page.
 * One constructor can only be defined once, so each tag gets its own class.
 */
export function defineEmbeddedChromeElements(names: readonly string[]) {
  for (const name of names) {
    if (customElements.get(name)) continue;
    customElements.define(name, class extends HTMLElement {
      constructor() {
        super();
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = '<style>:host{display:none}</style><slot></slot>';
      }
    });
  }
}

/**
 * React 18 drops unknown attributes such as variant="breadcrumb" on <button>.
 * App Bridge still receives them as props on the DOM node (`__reactProps$*`).
 * https://github.com/Shopify/shopify-app-bridge/blob/main/packages/app-bridge-react
 */
export function controlVariant(element: Element): string | undefined {
  const fromAttribute = element.getAttribute('variant');
  if (fromAttribute) return fromAttribute;

  for (const key of Object.keys(element)) {
    if (!key.startsWith('__reactProps$')) continue;
    const props = (element as unknown as Record<string, unknown>)[key];
    if (!props || typeof props !== 'object') continue;
    const variant = (props as { variant?: unknown }).variant;
    if (typeof variant === 'string' && variant) return variant;
  }

  return undefined;
}

/** `loading=""` on an App Bridge button is a React prop, not a DOM attribute. */
export function isLoadingControl(element: Element): boolean {
  if (element.hasAttribute('loading')) return true;
  const value = reactProps(element)?.loading;
  return value === true || value === '';
}

function reactProps(element: Element): Record<string, unknown> | null {
  for (const key of Object.keys(element)) {
    if (!key.startsWith('__reactProps$')) continue;
    const props = (element as unknown as Record<string, unknown>)[key];
    if (props && typeof props === 'object') return props as Record<string, unknown>;
  }
  return null;
}

/**
 * Walk the live React node and call its handler.
 * Modal content is moved into a same-origin shell iframe, so the event does
 * not bubble to the app root where React delegated its listener.
 */
export function forwardReactEvent(event: Event, handlerName: string) {
  const target = event.target;
  if (!(target instanceof Element)) return false;

  const reactEvent = {
    nativeEvent: event,
    target: event.target,
    currentTarget: event.target,
    type: event.type,
    key: 'key' in event ? (event as KeyboardEvent).key : undefined,
    preventDefault() {
      event.preventDefault();
    },
    stopPropagation() {
      event.stopPropagation();
    },
    persist() {},
  };

  return callClosestReactHandler(target, handlerName, () => [reactEvent]);
}

function callClosestReactHandler(
  element: Element,
  name: string,
  argsFor: (props: Record<string, unknown>, current: Element) => unknown[],
): boolean {
  let current: Element | null = element;
  while (current) {
    if (current.tagName.toLowerCase() === 'ui-modal') break;
    const props = reactProps(current);
    const handler = props?.[name];
    if (typeof handler === 'function') {
      try {
        (handler as (...handlerArgs: unknown[]) => void)(...argsFor(props!, current));
        return true;
      } catch {
        // Wrong signature for this node — keep walking toward Polaris wrappers.
      }
    }
    current = current.parentElement;
  }
  return false;
}

function isDisabledControl(element: HTMLElement) {
  if (element instanceof HTMLButtonElement && element.disabled) return true;
  if (element instanceof HTMLInputElement && element.disabled) return true;
  if (element instanceof HTMLSelectElement && element.disabled) return true;
  if (element.hasAttribute('disabled')) return true;
  if (element.getAttribute('aria-disabled') === 'true') return true;
  return false;
}

/**
 * Click the original iframe node so React onClick / preventDefault runs.
 * Prefer the React prop: a cloned admin-frame button only has the target id.
 */
export function activateEmbeddedElement(id: string) {
  const element = document.querySelector(`[${TARGET_ATTR}="${id}"]`);
  if (!(element instanceof HTMLElement)) return;
  if (isDisabledControl(element)) return;

  const fakeEvent = {
    target: element,
    currentTarget: element,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {},
    isTrusted: false,
  };

  if (callClosestReactHandler(element, 'onClick', () => [fakeEvent])) {
    return;
  }

  element.click();

  if (!(element instanceof HTMLAnchorElement)) return;
  if (fakeEvent.defaultPrevented) return;
  const href = element.getAttribute('href');
  if (href) window.location.assign(href);
}

/**
 * Drive controlled Polaris fields (TextField / Checkbox / Select) from the
 * admin-frame clone by calling the iframe React onChange, not only DOM value.
 */
export function applyEmbeddedInput(id: string, value: string, checked?: boolean) {
  const element = document.querySelector(`[${TARGET_ATTR}="${id}"]`);
  if (!(element instanceof HTMLElement)) return;

  if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
    const next = typeof checked === 'boolean' ? checked : !element.checked;
    if (callClosestReactHandler(element, 'onChange', () => [next])) return;
    if (element.checked !== next) element.click();
    return;
  }

  if (element instanceof HTMLSelectElement) {
    element.value = value;
    if (callClosestReactHandler(element, 'onChange', () => [value])) return;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(element, value);

    if (callClosestReactHandler(element, 'onChange', () => [value])) return;
    if (callClosestReactHandler(element, 'onChange', (_props, current) => [{
      target: current,
      currentTarget: current,
      bubbles: true,
      preventDefault() {},
      stopPropagation() {},
    }])) return;

    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

let listeningForEmbeddedClicks = false;

export function listenForEmbeddedClicks() {
  if (listeningForEmbeddedClicks) return;
  listeningForEmbeddedClicks = true;

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== 'MOCK_ELEMENT_CLICK') return;
    if (typeof event.data.id !== 'string') return;
    activateEmbeddedElement(event.data.id);
  });
}

export function watchEmbeddedChrome(onChange: () => void) {
  let frame = 0;

  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(onChange);
  };

  const start = () => {
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['title', 'heading', 'href', 'rel', 'variant', 'slot', 'disabled', 'id', 'src', 'open', 'loading', 'tone'],
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}

export function publishIfChanged(key: string, snapshot: unknown, publish: () => void) {
  const serialized = JSON.stringify(snapshot);
  if (publishIfChanged.cache.get(key) === serialized) return;
  publishIfChanged.cache.set(key, serialized);
  publish();
}

publishIfChanged.cache = new Map<string, string>();
