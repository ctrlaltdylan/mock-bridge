import {
  controlVariant,
  embeddedTargetId,
  forwardReactEvent,
  hideInIframe,
  isModalContentFrame,
  listenForEmbeddedClicks,
  applyEmbeddedInput,
  publishIfChanged,
  watchEmbeddedChrome,
} from "../dom/embeddedChrome";
import { invokeFeature } from "../invokeFeature";

const PATCHED = '__mockBridgeModal';
const MODAL_VARIANTS = new Set(['small', 'base', 'large', 'max']);
const MODAL_CONTENT_ID = 'modal-content-8885451e-38a1-4196-835b-40f3efb46c4e';

function modalFrameName(id: string) {
  return `mock-modal-${id}`;
}

type ModalElement = HTMLElement & {
  content: HTMLElement;
  contentWindow: Window | null;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  [PATCHED]?: boolean;
};

/**
 * Fake opener used when admin (e.g. :3080) and the app (e.g. :5034) are
 * cross-origin — parent.document is inaccessible, so we relay via admin.
 * App `sendMessage()` → opener.postMessage → MOCK_RELAY_TO_APP → app iframe.
 */
function relayOpener(): Pick<Window, 'postMessage'> {
  return {
    postMessage(message: unknown, targetOrigin: string | WindowPostMessageOptions = '*') {
      const origin = typeof targetOrigin === 'string' ? targetOrigin : targetOrigin?.targetOrigin ?? '*';
      try {
        window.parent.postMessage(
          { type: 'MOCK_RELAY_TO_APP', message, targetOrigin: origin },
          '*',
        );
      } catch (error) {
        console.warn('[MockAppBridge] relay opener.postMessage failed', error);
      }
    },
  };
}

/**
 * Shopify src modals set window.opener to the main app frame so
 * sendMessage() → opener.postMessage works from customize-embed routes.
 * Regular <iframe> does not — polyfill it for mock-bridge.
 * Same-origin (proxy): real app iframe window. Cross-origin: admin relay.
 * @see https://shopify.dev/docs/api/app-bridge/using-modals-in-your-app
 */
export function polyfillModalOpener() {
  if (!isModalContentFrame()) return;

  let openerRef: Window | Pick<Window, 'postMessage'> = relayOpener();
  try {
    const appIframe = window.parent.document.getElementById('app-iframe') as HTMLIFrameElement | null;
    if (appIframe?.contentWindow) openerRef = appIframe.contentWindow;
  } catch {
    // Cross-origin admin — keep relay opener.
  }

  try {
    Object.defineProperty(window, 'opener', {
      configurable: true,
      get() {
        return openerRef;
      },
    });
  } catch (error) {
    console.warn('[MockAppBridge] Could not polyfill window.opener for modal frame', error);
  }
}

function reactStringProp(element: Element, name: string): string | undefined {
  for (const key of Object.keys(element)) {
    if (!key.startsWith('__reactProps$')) continue;
    const props = (element as unknown as Record<string, unknown>)[key];
    if (!props || typeof props !== 'object') continue;
    const value = (props as Record<string, unknown>)[name];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

function modalVariant(element: Element): string {
  const fromAttribute = element.getAttribute('variant');
  const variant = fromAttribute || reactStringProp(element, 'variant') || 'base';
  return MODAL_VARIANTS.has(variant) ? variant : 'base';
}

function modalSrc(element: Element): string | null {
  return element.getAttribute('src') || reactStringProp(element, 'src') || null;
}

function stampInteractive(root: ParentNode) {
  root.querySelectorAll('button, a, input, textarea, select, [role="button"]').forEach((element) => {
    embeddedTargetId(element);
  });
}

function readButtons(titleBar: Element | null): Array<{
  id: string;
  label: string;
  variant?: string;
  tone?: string;
  disabled?: boolean;
  loading?: boolean;
}> {
  if (!titleBar) return [];

  return Array.from(titleBar.querySelectorAll('button, s-button')).flatMap((button) => {
    const name = button.getAttribute('name');
    const label = button.textContent?.trim()
      || (name ? name.charAt(0).toUpperCase() + name.slice(1) : '');
    if (!label) return [];

    const tone = button.getAttribute('tone') || reactStringProp(button, 'tone');
    return [{
      id: embeddedTargetId(button),
      label,
      variant: controlVariant(button),
      tone: tone || undefined,
      disabled: button.hasAttribute('disabled') || (button instanceof HTMLButtonElement && button.disabled),
      loading: button.hasAttribute('loading'),
    }];
  });
}

function readModal(element: ModalElement) {
  const id = element.getAttribute('id');
  if (!id) return null;

  const titleBar = element.querySelector('ui-title-bar');
  stampInteractive(element.content);
  if (titleBar) stampInteractive(titleBar);

  // setAttribute always queues a mutation record (even with an equal value);
  // the modal observer watches `variant`, so unconditional writes loop forever.
  titleBar?.querySelectorAll('button, s-button').forEach((button) => {
    const variantName = controlVariant(button);
    if (variantName && button.getAttribute('variant') !== variantName) {
      button.setAttribute('variant', variantName);
    }
    const tone = reactStringProp(button, 'tone');
    if (tone && button.getAttribute('tone') !== tone) button.setAttribute('tone', tone);
  });

  return {
    id,
    title: titleBar?.getAttribute('title') || '',
    variant: modalVariant(element),
    src: modalSrc(element),
    buttons: readButtons(titleBar),
  };
}

function shellWindow(id: string): Window | null {
  try {
    const frame = (window.parent.frames as unknown as Record<string, Window>)[modalFrameName(id)];
    if (!frame || frame === window) return null;
    if (!frame.document?.body || frame.document.readyState === 'loading') return null;
    return frame;
  } catch {
    return null;
  }
}

/**
 * contentWindow for ui-modal: real named frame when reachable, otherwise a
 * postMessage shim so app → modal (save/discard) works cross-origin.
 */
function relayContentWindow(id: string): Pick<Window, 'postMessage'> {
  return {
    postMessage(message: unknown, targetOrigin: string | WindowPostMessageOptions = '*') {
      const origin = typeof targetOrigin === 'string' ? targetOrigin : targetOrigin?.targetOrigin ?? '*';
      try {
        window.parent.postMessage(
          { type: 'MOCK_RELAY_TO_MODAL', id, message, targetOrigin: origin },
          '*',
        );
      } catch (error) {
        console.warn('[MockAppBridge] relay contentWindow.postMessage failed', error);
      }
    },
  };
}

function resolveContentWindow(id: string): Window | null {
  try {
    const frame = (window.parent.frames as unknown as Record<string, Window>)[modalFrameName(id)];
    if (frame && frame !== window) return frame;
  } catch {
    // Cross-origin parent.frames — fall through to relay.
  }
  return relayContentWindow(id) as Window;
}

function waitForShell(id: string) {
  return new Promise<Window | null>((resolve) => {
    const started = Date.now();
    const tick = () => {
      const frame = shellWindow(id);
      if (frame) {
        resolve(frame);
        return;
      }
      if (Date.now() - started > 5000) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

function shellCss() {
  return `
    html, body {
      min-height: auto !important;
      height: auto !important;
      padding: 0 !important;
      margin: 0 !important;
      background-color: rgba(0, 0, 0, 0) !important;
      display: block !important;
    }
    body > #${MODAL_CONTENT_ID} {
      display: block !important;
      height: auto !important;
      min-height: 0 !important;
    }
    body > #${MODAL_CONTENT_ID} > * {
      width: 100%;
      height: auto !important;
      min-height: 0 !important;
    }
  `;
}

function copyStyles(from: Document, to: Document) {
  if (to.documentElement.hasAttribute('data-mock-styles')) return Promise.resolve();
  to.documentElement.setAttribute('data-mock-styles', '');

  const nodes = Array.from(from.head.querySelectorAll('link[rel="stylesheet"], style'));
  return Promise.all(nodes.map((node) => new Promise<void>((resolve) => {
    const clone = node.cloneNode(true);
    if (clone instanceof HTMLLinkElement) {
      clone.addEventListener('load', () => resolve(), { once: true });
      clone.addEventListener('error', () => resolve(), { once: true });
      to.head.appendChild(clone);
      return;
    }
    to.head.appendChild(clone);
    resolve();
  }))).then(() => undefined);
}

function bindShellEvents(doc: Document) {
  if (doc.documentElement.hasAttribute('data-mock-modal-events')) return;
  doc.documentElement.setAttribute('data-mock-modal-events', '');

  doc.addEventListener('click', (event) => {
    forwardReactEvent(event, 'onClick');
    const target = event.target;
    if (target instanceof Element && target.closest('a[href]')) event.preventDefault();
  });
  doc.addEventListener('submit', (event) => {
    event.preventDefault();
    forwardReactEvent(event, 'onSubmit');
  });
  doc.addEventListener('input', (event) => {
    forwardReactEvent(event, 'onInput');
    forwardReactEvent(event, 'onChange');
  });
  doc.addEventListener('change', (event) => {
    const target = event.target;
    const isChoice = target instanceof HTMLSelectElement
      || (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio'));
    if (isChoice) forwardReactEvent(event, 'onChange');
  });
  doc.addEventListener('keydown', (event) => forwardReactEvent(event, 'onKeyDown'));
  doc.addEventListener('keyup', (event) => forwardReactEvent(event, 'onKeyUp'));
}

/**
 * Same path as Shopify's CDN: the admin clones an iframe, then this frame
 * moves the live modal node into it and leaves only that node in the body.
 */
async function mountModalContent(modal: ModalElement) {
  const id = modal.getAttribute('id');
  if (!id || modalSrc(modal) || !modal.content) return;

  const frame = await waitForShell(id);
  if (!frame || !modal.hasAttribute('data-mock-open')) return;

  const doc = frame.document;
  await copyStyles(document, doc);
  if (!modal.hasAttribute('data-mock-open')) return;

  if (!doc.getElementById('mock-modal-shell-css')) {
    const style = doc.createElement('style');
    style.id = 'mock-modal-shell-css';
    style.textContent = shellCss();
    doc.head.appendChild(style);
  }

  let host = doc.getElementById(MODAL_CONTENT_ID);
  if (!host) {
    host = doc.createElement('div');
    host.id = MODAL_CONTENT_ID;
  }
  doc.body.replaceChildren(host);
  host.replaceChildren(modal.content);
  bindShellEvents(doc);
  if (modalVariant(modal) !== 'max') watchModalHeight(id, frame);

  const focus = modal.content.querySelector('[autofocus]');
  if (focus instanceof HTMLElement) window.setTimeout(() => focus.focus(), 100);
}

const heightObservers = new Map<string, ResizeObserver>();

function watchModalHeight(id: string, frame: Window) {
  heightObservers.get(id)?.disconnect();

  const publish = () => {
    const height = Math.ceil(frame.document.body.scrollHeight);
    if (!height) return;
    publishIfChanged(`modal-height:${id}`, height, () => {
      void invokeFeature('modal', 'setFrameHeight', { id, height }).catch(() => {});
    });
  };

  const observer = new ResizeObserver(publish);
  observer.observe(frame.document.body);
  heightObservers.set(id, observer);
  publish();
}

function stopModalHeight(id: string) {
  heightObservers.get(id)?.disconnect();
  heightObservers.delete(id);
}

function restoreModalContent(modal: ModalElement) {
  const content = modal.content;
  if (!content || content.parentElement === modal) return;
  try {
    modal.appendChild(content);
  } catch {
    // The shell iframe was already removed.
  }
}

function syncModal(element: ModalElement) {
  const data = readModal(element);
  if (!data) return;

  publishIfChanged(`modal:${data.id}`, data, () => {
    void invokeFeature('modal', 'update', {
      id: data.id,
      heading: data.title,
      content: data,
    }).catch(() => {});
  });
}

function openModal(element: ModalElement) {
  if (element.hasAttribute('data-mock-open')) return;
  element.setAttribute('data-mock-open', '');
  hideInIframe(element);
  element.dispatchEvent(new Event('show'));

  const id = element.getAttribute('id');
  if (!id) return;
  const data = readModal(element);
  if (data) {
    publishIfChanged(`modal:${data.id}`, data, () => {});
    void invokeFeature('modal', 'show', {
      id,
      heading: data.title,
      content: data,
    }).catch(() => {});
  } else {
    void invokeFeature('modal', 'show', { id }).catch(() => {});
  }
  // src modals: admin loads customize-embed-* in its iframe.
  // HTML-content modals: move .content into the shell iframe.
  if (!modalSrc(element)) void mountModalContent(element);
}

function closeModal(element: ModalElement) {
  if (!element.hasAttribute('data-mock-open')) return;
  element.removeAttribute('data-mock-open');
  const closingId = element.getAttribute('id');
  if (closingId) stopModalHeight(closingId);
  restoreModalContent(element);
  hideInIframe(element);
  element.dispatchEvent(new Event('hide'));

  const id = element.getAttribute('id');
  if (!id) return;
  void invokeFeature('modal', 'hide', { id }).catch(() => {});
}

function installContentWindow(modal: ModalElement) {
  Object.defineProperty(modal, 'contentWindow', {
    configurable: true,
    enumerable: true,
    get() {
      const id = modal.getAttribute('id');
      return id ? resolveContentWindow(id) : null;
    },
  });
}

function installModalApi(element: HTMLElement) {
  const modal = element as ModalElement;
  if (!modal.content) {
    modal.content = document.createElement('div');
  }
  if (!modal.content.isConnected) {
    modal.appendChild(modal.content);
  }
  hideInIframe(modal);
  installContentWindow(modal);

  if (modal[PATCHED]) return;
  modal[PATCHED] = true;

  modal.show = () => openModal(modal);
  modal.hide = () => closeModal(modal);
  modal.toggle = () => {
    if (modal.hasAttribute('data-mock-open')) closeModal(modal);
    else openModal(modal);
  };

  // TitleBar/SaveBar children + src/variant attrs (widget switch after show).
  const contentObserver = new MutationObserver(() => syncModal(modal));
  contentObserver.observe(modal, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['src', 'variant', 'id', 'title'],
  });
  syncModal(modal);
}

class MockUiModal extends HTMLElement {
  content: HTMLElement;

  constructor() {
    super();
    this.content = document.createElement('div');
  }

  get contentWindow(): Window | null {
    const id = this.getAttribute('id');
    return id ? resolveContentWindow(id) : null;
  }

  connectedCallback() {
    installModalApi(this);
  }

  show() {
    openModal(this as ModalElement);
  }

  hide() {
    closeModal(this as ModalElement);
  }

  toggle() {
    const modal = this as ModalElement;
    if (modal.hasAttribute('data-mock-open')) closeModal(modal);
    else openModal(modal);
  }
}

function defineModalElement() {
  if (customElements.get('ui-modal')) return;
  customElements.define('ui-modal', MockUiModal);
}

function listenForModalCommands() {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'MOCK_MODAL_HIDE' && typeof event.data.id === 'string') {
      const modal = document.getElementById(event.data.id);
      if (modal instanceof HTMLElement) closeModal(modal as ModalElement);
    }
    if (event.data?.type === 'MOCK_CONTROL_INPUT' && typeof event.data.id === 'string') {
      applyEmbeddedInput(event.data.id, String(event.data.value ?? ''), event.data.checked);
    }
  });
}

function scanModals() {
  document.querySelectorAll('ui-modal').forEach((element) => {
    if (element instanceof HTMLElement) installModalApi(element);
  });
}

export function modal(): NonNullable<typeof window.shopify>['modal'] {
  if (typeof document !== 'undefined') {
    defineModalElement();
    listenForModalCommands();
    listenForEmbeddedClicks();
    watchEmbeddedChrome(scanModals);
  }

  const modalById = (id: string) => {
    const element = document.getElementById(id);
    return element instanceof HTMLElement && element.tagName.toLowerCase() === 'ui-modal'
      ? element as ModalElement
      : null;
  };

  return {
    toggle: async (id: string) => {
      const element = modalById(id);
      if (element) {
        element.toggle();
        return;
      }
      await invokeFeature('modal', 'toggle', { id });
    },
    show: async (id: string) => {
      const element = modalById(id);
      if (element) {
        element.show();
        return;
      }
      await invokeFeature('modal', 'show', { id });
    },
    hide: async (id: string) => {
      const element = modalById(id);
      if (element) {
        element.hide();
        return;
      }
      await invokeFeature('modal', 'hide', { id });
    },
  };
}
