import type { NavItem } from '../stores.js';
import { mirror, observeElements, type FeatureContext } from './context.js';

const NAV_MENU_SELECTORS = ['ui-nav-menu', 'nav-menu', 's-app-nav'];
const NAV_LINK_SELECTORS = ['a', 'ui-link', 's-link'];
/** The links in every nav menu, which the admin lists and the merchant picks from. */
export const NAV_LINKS = NAV_MENU_SELECTORS.flatMap(menu => NAV_LINK_SELECTORS.map(link => `${menu} ${link}`)).join(',');

/** Mirrors `<ui-nav-menu>` / `<s-app-nav>` links into the admin sidebar. */
export function navMenu(ctx: FeatureContext) {
  const { window } = ctx;

  function extractNavItems(menu: HTMLElement): NavItem[] {
    return Array.from(menu.querySelectorAll(NAV_LINK_SELECTORS.join(','))).flatMap(link => {
      const label = link.textContent?.trim() || '';
      if (!label) return [];
      return [{ label, href: link.getAttribute('href') || '/', isHome: link.getAttribute('rel') === 'home' }];
    });
  }

  observeElements(ctx, NAV_MENU_SELECTORS, (menu, menuCtx) => {
    menu.style.display = 'none';

    const items = extractNavItems(menu);
    if (items.length > 0) mirror(ctx, 'navMenu', 'setItems', { items });

    const observer = new window.MutationObserver(() => mirror(ctx, 'navMenu', 'setItems', { items: extractNavItems(menu) }));
    observer.observe(menu, { childList: true, subtree: true, characterData: true });
    menuCtx.signal.addEventListener('abort', () => observer.disconnect());

    // The menu left the page: the admin shows another menu's items, or none.
    return () => {
      const other = Array.from(window.document.querySelectorAll<HTMLElement>(NAV_MENU_SELECTORS.join(','))).at(-1);
      mirror(ctx, 'navMenu', 'setItems', { items: other ? extractNavItems(other) : [] });
    };
  });
}
