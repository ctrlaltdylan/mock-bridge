import { invokeFeature } from "../invokeFeature";
import {
  controlVariant,
  defineEmbeddedChromeElements,
  embeddedTargetId,
  hideInIframe,
  isInsideModal,
  isModalContentFrame,
  publishIfChanged,
  watchEmbeddedChrome,
} from "../dom/embeddedChrome";

type TitleBarButton = {
  id: string;
  label: string;
  disabled?: boolean;
}

type TitleBarSnapshot = {
  title: string;
  breadcrumbs: TitleBarButton[];
  primary: TitleBarButton | null;
  secondary: TitleBarButton[];
}

const EMPTY_TITLE_BAR: TitleBarSnapshot = {
  title: '',
  breadcrumbs: [],
  primary: null,
  secondary: [],
};

function buttonFrom(element: Element): TitleBarButton | null {
  const label = element.textContent?.trim() || '';
  if (!label) return null;

  return {
    id: embeddedTargetId(element),
    label,
    disabled: element instanceof HTMLButtonElement ? element.disabled : element.hasAttribute('disabled'),
  };
}

function isBreadcrumb(element: Element): boolean {
  return controlVariant(element) === 'breadcrumb'
    || element.getAttribute('slot') === 'breadcrumb-actions';
}

function isPrimary(element: Element): boolean {
  return controlVariant(element) === 'primary'
    || element.getAttribute('slot') === 'primary-action';
}

function isSecondary(element: Element): boolean {
  return element.getAttribute('slot') === 'secondary-actions';
}

/**
 * Page chrome comes from <ui-title-bar title> (App Bridge React TitleBar) or
 * <s-page heading>. Buttons with variant="breadcrumb" are the admin breadcrumb,
 * not in-iframe controls. Title bars inside <ui-modal> belong to the modal.
 */
function collectTitleBar(): TitleBarSnapshot {
  const hosts = Array.from(document.querySelectorAll('ui-title-bar, s-page'))
    .filter((element): element is HTMLElement => element instanceof HTMLElement && !isInsideModal(element));

  const host = hosts.at(-1);
  if (!host) return EMPTY_TITLE_BAR;

  if (host.tagName.toLowerCase() === 'ui-title-bar') {
    hideInIframe(host);
  }

  const title = host.getAttribute('title') || host.getAttribute('heading') || '';
  const isPageElement = host.tagName.toLowerCase() === 's-page';
  const controls = Array.from(host.querySelectorAll('button, a, s-button, s-link')).filter((control) => {
    if (!isPageElement) return true;
    const slot = control.getAttribute('slot');
    return slot === 'breadcrumb-actions' || slot === 'primary-action' || slot === 'secondary-actions';
  });
  const breadcrumbs: TitleBarButton[] = [];
  const secondary: TitleBarButton[] = [];
  let primary: TitleBarButton | null = null;

  controls.forEach((control) => {
    const button = buttonFrom(control);
    if (!button) return;

    if (isBreadcrumb(control)) {
      breadcrumbs.push(button);
      return;
    }
    if (isPrimary(control)) {
      primary = button;
      return;
    }
    if (isSecondary(control) || control.tagName.toLowerCase() === 'button' || control.tagName.toLowerCase() === 's-button') {
      secondary.push(button);
    }
  });

  return { title, breadcrumbs, primary, secondary };
}

function publishTitleBar() {
  if (isModalContentFrame()) return;
  const snapshot = collectTitleBar();
  publishIfChanged('title-bar', snapshot, () => {
    void invokeFeature('titleBar', 'update', snapshot).catch(() => {});
  });
}

export function titleBar() {
  if (typeof document === 'undefined') return;
  if (isModalContentFrame()) return;
  defineEmbeddedChromeElements(['ui-title-bar']);
  watchEmbeddedChrome(publishTitleBar);
}
