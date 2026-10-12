import {
  controlVariant,
  embeddedTargetId,
  hideInIframe,
  isLoadingControl,
  publishIfChanged,
  watchEmbeddedChrome,
} from "../dom/embeddedChrome";
import { invokeFeature } from "../invokeFeature";

const PATCHED = '__mockBridgeSaveBar';

type SaveBarButton = {
  id: string;
  label: string;
  variant?: string;
  disabled?: boolean;
  loading?: boolean;
};

type SaveBarElement = HTMLElement & {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  [PATCHED]?: boolean;
};

function readButtons(element: HTMLElement): SaveBarButton[] {
  return Array.from(element.querySelectorAll('button, s-button')).flatMap((button) => {
    const name = button.getAttribute('name');
    const label = button.textContent?.trim()
      || (name ? name.charAt(0).toUpperCase() + name.slice(1) : '');
    if (!label) return [];

    return [{
      id: embeddedTargetId(button),
      label,
      variant: controlVariant(button),
      disabled: button.hasAttribute('disabled') || (button instanceof HTMLButtonElement && button.disabled),
      loading: isLoadingControl(button),
    }];
  });
}

function discardConfirmationOf(element: HTMLElement) {
  return element.hasAttribute('discard-confirmation')
    || element.hasAttribute('discardconfirmation')
    || element.hasAttribute('data-discard-confirmation');
}

function syncSaveBar(element: SaveBarElement) {
  const id = element.getAttribute('id');
  if (!id) return;

  const buttons = readButtons(element);
  const discardConfirmation = discardConfirmationOf(element);
  publishIfChanged(`save-bar:${id}`, { buttons, discardConfirmation }, () => {
    void invokeFeature('saveBar', 'update', { id, discardConfirmation, buttons }).catch(() => {});
  });
}

function openSaveBar(element: SaveBarElement) {
  if (element.hasAttribute('data-mock-open')) return;
  element.setAttribute('data-mock-open', '');
  element.setAttribute('open', '');
  element.dispatchEvent(new Event('show'));
  syncSaveBar(element);
  const id = element.getAttribute('id');
  if (!id) return;
  void invokeFeature('saveBar', 'show', { id }).catch(() => {});
}

function closeSaveBar(element: SaveBarElement) {
  if (!element.hasAttribute('data-mock-open') && !element.hasAttribute('open')) return;
  element.removeAttribute('data-mock-open');
  element.removeAttribute('open');
  element.dispatchEvent(new Event('hide'));
  const id = element.getAttribute('id');
  if (!id) return;
  void invokeFeature('saveBar', 'hide', { id }).catch(() => {});
}

function installSaveBarApi(element: HTMLElement) {
  const saveBar = element as SaveBarElement;
  hideInIframe(saveBar);
  if (saveBar[PATCHED]) {
    syncSaveBar(saveBar);
    return;
  }
  saveBar[PATCHED] = true;

  saveBar.show = () => openSaveBar(saveBar);
  saveBar.hide = () => closeSaveBar(saveBar);
  saveBar.toggle = () => {
    if (saveBar.hasAttribute('open')) closeSaveBar(saveBar);
    else openSaveBar(saveBar);
  };

  const observer = new MutationObserver(() => {
    const hasOpen = saveBar.hasAttribute('open');
    const markedOpen = saveBar.hasAttribute('data-mock-open');
    if (hasOpen && !markedOpen) {
      openSaveBar(saveBar);
      return;
    }
    if (!hasOpen && markedOpen) {
      closeSaveBar(saveBar);
      return;
    }
    syncSaveBar(saveBar);
  });
  observer.observe(saveBar, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['open', 'disabled', 'loading', 'variant', 'discard-confirmation'],
  });
  if (saveBar.hasAttribute('open')) openSaveBar(saveBar);
  else syncSaveBar(saveBar);
}

class MockUiSaveBar extends HTMLElement {
  connectedCallback() {
    installSaveBarApi(this);
  }

  show() {
    openSaveBar(this as SaveBarElement);
  }

  hide() {
    closeSaveBar(this as SaveBarElement);
  }

  toggle() {
    const saveBar = this as SaveBarElement;
    if (saveBar.hasAttribute('open')) closeSaveBar(saveBar);
    else openSaveBar(saveBar);
  }
}

function defineSaveBarElement() {
  if (customElements.get('ui-save-bar')) return;
  customElements.define('ui-save-bar', MockUiSaveBar);
}

function clickSaveBarButton(id: string, role: 'save' | 'discard') {
  const saveBar = document.getElementById(id);
  if (!(saveBar instanceof HTMLElement)) return;
  const buttons = Array.from(saveBar.querySelectorAll('button, s-button'));
  const match = buttons.find((button) => {
    const variant = button.getAttribute('variant');
    const name = button.getAttribute('name');
    if (role === 'save') return variant === 'primary' || name === 'save';
    return variant !== 'primary' && name !== 'save';
  }) ?? buttons[role === 'save' ? 0 : buttons.length - 1];

  match?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function listenForSaveBarCommands() {
  window.addEventListener('message', (event: MessageEvent) => {
    if (typeof event.data?.id !== 'string') return;
    if (event.data.type === 'SAVE_BAR_SAVE') clickSaveBarButton(event.data.id, 'save');
    if (event.data.type === 'SAVE_BAR_DISCARD') clickSaveBarButton(event.data.id, 'discard');
  });

  window.addEventListener('beforeunload', (event) => {
    if (!hasOpenSaveBar()) return;
    event.preventDefault();
    event.returnValue = true;
  });
}

function scanSaveBars() {
  document.querySelectorAll('ui-save-bar').forEach((element) => {
    if (element instanceof HTMLElement) installSaveBarApi(element);
  });
}

function hasOpenSaveBar() {
  return Boolean(document.querySelector('ui-save-bar[open], ui-save-bar[data-mock-open]'));
}

export function isSaveBarBlockingNavigation() {
  return hasOpenSaveBar();
}

/** Tell the admin frame to shake the save bar; navigation stays cancelled. */
export function requestSaveBarShake() {
  try {
    window.parent.postMessage({ type: 'MOCK_SAVE_BAR_SHAKE' }, '*');
  } catch {
    // Not embedded.
  }
}

export function saveBar(): NonNullable<typeof window.shopify>['saveBar'] {
  if (typeof document !== 'undefined') {
    defineSaveBarElement();
    listenForSaveBarCommands();
    watchEmbeddedChrome(scanSaveBars);
  }

  const saveBarById = (id: string) => {
    const element = document.getElementById(id);
    return element instanceof HTMLElement && element.tagName.toLowerCase() === 'ui-save-bar'
      ? element as SaveBarElement
      : null;
  };

  return {
    show: async (id: string) => {
      const element = saveBarById(id);
      if (element) {
        element.show();
        return;
      }
      await invokeFeature('saveBar', 'show', { id });
    },
    hide: async (id: string) => {
      const element = saveBarById(id);
      if (element) {
        element.hide();
        return;
      }
      await invokeFeature('saveBar', 'hide', { id });
    },
    toggle: async (id: string) => {
      const element = saveBarById(id);
      if (element) {
        element.toggle();
        return;
      }
      await invokeFeature('saveBar', 'toggle', { id });
    },
    leaveConfirmation: async () => {
      if (!hasOpenSaveBar()) return;
      requestSaveBarShake();
      throw new Error('Save bar leave confirmation was cancelled');
    },
  };
}
