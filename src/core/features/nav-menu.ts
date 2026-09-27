import type { NavItem } from '../stores';
import { fire, observeElements, type FeatureContext } from './context';

const NAV_MENU_SELECTORS = ['ui-nav-menu', 'nav-menu', 's-app-nav'];

/** Mirrors `<ui-nav-menu>` / `<s-app-nav>` links into the admin sidebar. */
export function navMenu(ctx: FeatureContext) {
  const { window } = ctx;

  function extractNavItems(menu: HTMLElement): NavItem[] {
    return Array.from(menu.querySelectorAll('a, ui-link, s-link')).flatMap(link => {
      const label = link.textContent?.trim() || '';
      if (!label) return [];
      return [{ label, href: link.getAttribute('href') || '/', isHome: link.getAttribute('rel') === 'home' }];
    });
  }

  observeElements(ctx, NAV_MENU_SELECTORS, menu => {
    menu.style.display = 'none';

    const items = extractNavItems(menu);
    if (items.length > 0) fire(ctx, 'navMenu', 'setItems', { items });

    const observer = new window.MutationObserver(() => fire(ctx, 'navMenu', 'setItems', { items: extractNavItems(menu) }));
    observer.observe(menu, { childList: true, subtree: true, characterData: true });
    ctx.signal.addEventListener('abort', () => observer.disconnect());
  });

  // Clicks in the admin sidebar navigate within the app.
  window.addEventListener('message', event => {
    if (event.data?.type === 'NAV_MENU_CLICK' && event.data.href) {
      window.location.href = event.data.href;
    }
  }, { signal: ctx.signal });
}
