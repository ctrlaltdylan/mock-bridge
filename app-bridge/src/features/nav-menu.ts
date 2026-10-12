import { invokeFeature } from "../invokeFeature";
import {
  defineEmbeddedChromeElements,
  embeddedTargetId,
  hideInIframe,
  isInsideModal,
  isModalContentFrame,
  listenForEmbeddedClicks,
  publishIfChanged,
  watchEmbeddedChrome,
} from "../dom/embeddedChrome";
import { isSaveBarBlockingNavigation, requestSaveBarShake } from "./save-bar";

type NavItem = {
  id: string;
  label: string;
  href: string;
  isHome?: boolean;
}

const NAV_SELECTORS = ['ui-nav-menu', 'nav-menu', 's-app-nav'];

/**
 * <NavMenu> renders <ui-nav-menu> (App Bridge React) or <s-app-nav> (App Home).
 * rel="home" marks the app home route. Admin hides that row and uses the app
 * name as the home link. https://shopify.dev/docs/api/app-bridge-library/react-components/navmenu
 */
function collectNavItems(): NavItem[] {
  const items: NavItem[] = [];

  document.querySelectorAll(NAV_SELECTORS.join(',')).forEach((navMenu) => {
    if (!(navMenu instanceof HTMLElement) || isInsideModal(navMenu)) return;
    hideInIframe(navMenu);

    navMenu.querySelectorAll('a, ui-link, s-link').forEach((link) => {
      const label = link.textContent?.trim() || '';
      if (!label) return;

      items.push({
        id: embeddedTargetId(link),
        label,
        href: link.getAttribute('href') || '/',
        isHome: link.getAttribute('rel') === 'home',
      });
    });
  });

  return items;
}

function publishNavItems() {
  if (isModalContentFrame()) return;
  const items = collectNavItems();
  publishIfChanged('nav-menu', items, () => {
    void invokeFeature('navMenu', 'setItems', { items }).catch(() => {});
  });
}

function publishLocation() {
  if (isModalContentFrame()) return;
  const pathname = `${window.location.pathname}${window.location.search}`;
  publishIfChanged('nav-location', pathname, () => {
    void invokeFeature('navMenu', 'setLocation', { pathname }).catch(() => {});
  });
}

/** App name in the admin sidebar. Shopify uses the installed app name, not rel="home". */
function publishAppName() {
  if (isModalContentFrame()) return;
  const appName = document.title.split(/[:|–—-]/)[0]?.trim() || '';
  publishIfChanged('nav-app-name', appName, () => {
    void invokeFeature('navMenu', 'setAppName', { appName }).catch(() => {});
  });
}

const EMBED_QUERY_KEYS = ['host', 'shop', 'embedded', 'id_token', 'hmac', 'locale', 'session', 'timestamp'];

/**
 * Admin back/forward lands here. Push the URL, then popstate so React Router
 * follows window.location instead of keeping the previous in-app route.
 */
function navigateFromAdmin(path: string) {
  if (isSaveBarBlockingNavigation()) {
    requestSaveBarShake();
    return;
  }

  const target = new URL(path, window.location.href);
  const currentParams = new URLSearchParams(window.location.search);
  for (const key of EMBED_QUERY_KEYS) {
    const value = currentParams.get(key);
    if (value && !target.searchParams.has(key)) target.searchParams.set(key, value);
  }

  const next = `${target.pathname}${target.search}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (next === current) return;

  history.pushState(history.state, '', next);
  window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
}

function routeKey(url: string | URL | null | undefined) {
  if (url == null || url === '') return `${window.location.pathname}${window.location.search}`;
  const parsed = new URL(String(url), window.location.href);
  return `${parsed.pathname}${parsed.search}`;
}

function wouldChangeRoute(url: string | URL | null | undefined) {
  return routeKey(url) !== `${window.location.pathname}${window.location.search}`;
}

function watchAdminNavigation() {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== 'MOCK_NAVIGATE') return;
    if (typeof event.data.path !== 'string' || !event.data.path.startsWith('/')) return;
    navigateFromAdmin(event.data.path);
  });
}

function watchHistory() {
  const publish = () => publishLocation();
  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);

  history.pushState = (...args) => {
    if (isSaveBarBlockingNavigation() && wouldChangeRoute(args[2] as string | URL | null | undefined)) {
      requestSaveBarShake();
      return;
    }
    originalPush(...args);
    publish();
  };
  history.replaceState = (...args) => {
    if (isSaveBarBlockingNavigation() && wouldChangeRoute(args[2] as string | URL | null | undefined)) {
      requestSaveBarShake();
      return;
    }
    originalReplace(...args);
    publish();
  };
  window.addEventListener('popstate', publish);
}

export function navMenu() {
  if (typeof document === 'undefined') return {};
  if (isModalContentFrame()) return {};

  defineEmbeddedChromeElements(['ui-nav-menu', 'nav-menu', 's-app-nav']);
  listenForEmbeddedClicks();
  watchAdminNavigation();
  watchHistory();
  watchEmbeddedChrome(() => {
    publishNavItems();
    publishLocation();
    publishAppName();
  });

  return {};
}
