import { useEffect, useRef, useState } from "react";
import { SaveBar } from "./features/SaveBar";
import { Toast } from "./features/Toast";
import { useConfig } from "../hooks/useConfig";
import { allowNavigation, shakeSaveBar } from "../lib/unsavedNavigation";
import { useNavMenuFeatureStore, type NavItem } from "../store/features/nav-menu";
import { useSaveBarFeatureStore } from "../store/features/save-bar";
import { useTitleBarFeatureStore, type TitleBarButton } from "../store/features/title-bar";

type Props = {
  children: React.ReactNode;
}

type ShopNavItem = {
  id: string;
  label: string;
  icon: 'home' | 'orders' | 'products' | 'customers' | 'growth' | 'content' | 'discounts' | 'markets' | 'finance' | 'analytics' | 'channel' | 'settings';
}

const shopNav: ShopNavItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'orders', label: 'Orders', icon: 'orders' },
  { id: 'products', label: 'Products', icon: 'products' },
  { id: 'customers', label: 'Customers', icon: 'customers' },
  { id: 'growth', label: 'Growth', icon: 'growth' },
  { id: 'content', label: 'Content', icon: 'content' },
  { id: 'discounts', label: 'Discounts', icon: 'discounts' },
  { id: 'markets', label: 'Markets', icon: 'markets' },
  { id: 'finance', label: 'Finance', icon: 'finance' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
];

const salesChannels = ['Online Store', 'Point of Sale', 'Shop'];

function pathnameOf(href: string) {
  if (!href) return '';
  try {
    return new URL(href, window.location.origin).pathname;
  } catch {
    return href.split('?')[0] ?? href;
  }
}

function shopLabel(shop: string) {
  const name = shop.replace(/\.myshopify\.com$/i, '');
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Longest matching app route wins, so /campaigns/1 highlights Campaigns and not Home. */
function activeAppItemId(items: NavItem[], pathname: string) {
  const current = pathnameOf(pathname);
  let best: { id: string; length: number } | null = null;

  for (const item of items) {
    if (item.isHome) continue;
    const itemPath = pathnameOf(item.href);
    if (!itemPath || itemPath === '/') continue;
    const matches = current === itemPath || current.startsWith(`${itemPath}/`);
    if (!matches) continue;
    if (!best || itemPath.length > best.length) {
      best = { id: item.id, length: itemPath.length };
    }
  }

  return best?.id ?? null;
}

function activateEmbeddedElement(id: string) {
  const iframe = document.getElementById('app-iframe') as HTMLIFrameElement | null;
  iframe?.contentWindow?.postMessage({ type: 'MOCK_ELEMENT_CLICK', id }, '*');
}

function TitleBarAction({
  button,
  className,
  onActivate,
  guardNavigation = false,
}: {
  button: TitleBarButton;
  className: string;
  onActivate?: () => void;
  /** Breadcrumbs change routes; primary/overflow actions must stay clickable while dirty. */
  guardNavigation?: boolean;
}) {
  return (
    <button
      type="button"
      className={className}
      disabled={button.disabled}
      onClick={() => {
        if (guardNavigation && !allowNavigation()) return;
        activateEmbeddedElement(button.id);
        onActivate?.();
      }}
    >
      {button.label}
    </button>
  );
}

function NavIcon({ name }: { name: ShopNavItem['icon'] }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 20 20',
    fill: 'none',
    'aria-hidden': true as const,
  };

  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3.5 8.5 10 3l6.5 5.5V16a1 1 0 0 1-1 1h-4v-4.5h-3V17h-4a1 1 0 0 1-1-1V8.5Z" stroke="currentColor" strokeWidth="1.4" /></svg>;
    case 'orders':
      return <svg {...common}><path d="M4 5.5h12l-1 10H5L4 5.5Z" stroke="currentColor" strokeWidth="1.4" /><path d="M7.5 5.5a2.5 2.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.4" /></svg>;
    case 'products':
      return <svg {...common}><path d="M4 7.5 10 4l6 3.5v6L10 17l-6-3.5v-6Z" stroke="currentColor" strokeWidth="1.4" /><path d="M4 7.5 10 11l6-3.5M10 11v6" stroke="currentColor" strokeWidth="1.4" /></svg>;
    case 'customers':
      return <svg {...common}><circle cx="10" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.4" /><path d="M4.8 16.2c.7-2.4 2.6-3.6 5.2-3.6s4.5 1.2 5.2 3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
    case 'growth':
      return <svg {...common}><path d="M4 14.5 8 9l3 2.5L16 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'content':
      return <svg {...common}><path d="M5 4.5h7l3 3V15.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" /><path d="M12 4.5V8h3.2" stroke="currentColor" strokeWidth="1.4" /></svg>;
    case 'discounts':
      return <svg {...common}><path d="M10.5 3.8 16 9.3l-6.7 6.7L3.8 10.5 10.5 3.8Z" stroke="currentColor" strokeWidth="1.4" /><circle cx="12.2" cy="7.6" r="0.9" fill="currentColor" /></svg>;
    case 'markets':
      return <svg {...common}><circle cx="10" cy="10" r="6.2" stroke="currentColor" strokeWidth="1.4" /><path d="M4 10h12M10 4c1.6 1.8 1.6 10.2 0 12M10 4c-1.6 1.8-1.6 10.2 0 12" stroke="currentColor" strokeWidth="1.4" /></svg>;
    case 'finance':
      return <svg {...common}><path d="M4 14.5V8.5M8 14.5V5.5M12 14.5V10M16 14.5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
    case 'analytics':
      return <svg {...common}><path d="M4 15.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M6 15.5v-4M10 15.5V6.5M14 15.5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
    case 'channel':
      return <svg {...common}><path d="M5 6.5h10v7H5v-7Z" stroke="currentColor" strokeWidth="1.4" /><path d="M8 16.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
    case 'settings':
      return <svg {...common}><circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.4" /><path d="M10 3.6v1.6M10 14.8v1.6M3.6 10h1.6M14.8 10h1.6M5.4 5.4l1.1 1.1M13.5 13.5l1.1 1.1M14.6 5.4l-1.1 1.1M6.5 13.5l-1.1 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
  }
}

export function Frame({ children }: Props) {
  const config = useConfig();
  const appNavItems = useNavMenuFeatureStore(state => state.items);
  const pathname = useNavMenuFeatureStore(state => state.pathname);
  const appName = useNavMenuFeatureStore(state => state.appName);
  const titleBar = useTitleBarFeatureStore(state => state);
  const saveBars = useSaveBarFeatureStore(state => state.saveBars);
  const saveBarVisible = Object.values(saveBars).some(saveBar => saveBar.visible);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const homeItem = appNavItems.find(item => item.isHome);
  const menuItems = homeItem ? appNavItems.filter(item => !item.isHome) : appNavItems;
  const activeId = activeAppItemId(appNavItems, pathname);
  const homeActive = !activeId && Boolean(homeItem && pathnameOf(pathname) === pathnameOf(homeItem.href));
  const displayAppName = appName || homeItem?.label || 'App';
  const storeName = shopLabel(config?.shop || 'test-shop');

  useEffect(() => {
    if (!overflowOpen) return;

    const close = (event: MouseEvent) => {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    };

    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [overflowOpen]);

  useEffect(() => {
    const onShake = (event: MessageEvent) => {
      if (event.data?.type !== 'MOCK_SAVE_BAR_SHAKE') return;
      shakeSaveBar();
    };
    window.addEventListener('message', onShake);
    return () => window.removeEventListener('message', onShake);
  }, []);

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="admin-search" role="search">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="5.2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M13.2 13.2 16.5 16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span>Search</span>
        </div>

        <div className="admin-nav-scroll">
          <ul className="admin-nav-list">
            {shopNav.map(item => (
              <li key={item.id}>
                <span className="admin-nav-row">
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="admin-nav-heading">Sales channels</p>
          <ul className="admin-nav-list">
            {salesChannels.map(label => (
              <li key={label}>
                <span className="admin-nav-row">
                  <NavIcon name="channel" />
                  <span>{label}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="admin-nav-heading">Apps</p>
          <div className={`admin-app${homeActive || activeId ? ' is-current' : ''}`}>
            <button
              type="button"
              className="admin-app-name"
              onClick={() => {
                if (!allowNavigation()) return;
                if (homeItem) activateEmbeddedElement(homeItem.id);
              }}
            >
              <span className="admin-app-mark" aria-hidden="true">{displayAppName.charAt(0)}</span>
              <span className="admin-app-label">{displayAppName}</span>
            </button>
            {menuItems.length > 0 && (
              <ul className="admin-app-menu">
                {menuItems.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`admin-app-link${item.id === activeId ? ' is-active' : ''}`}
                      aria-current={item.id === activeId ? 'page' : undefined}
                      onClick={() => {
                        if (!allowNavigation()) return;
                        activateEmbeddedElement(item.id);
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="admin-nav-footer">
          <span className="admin-nav-row">
            <NavIcon name="settings" />
            <span>Settings</span>
          </span>
          <span className="admin-store">
            <span className="admin-store-mark" aria-hidden="true">{storeName.charAt(0)}</span>
            <span>{storeName}</span>
          </span>
        </div>
      </aside>

      <div className="admin-canvas">
        <header className="admin-titlebar">
          <div className="admin-title-leading">
            <button
              type="button"
              className="admin-back"
              aria-label="Go back"
              disabled={!titleBar.breadcrumbs[0] && !homeItem}
              onClick={() => {
                if (!allowNavigation()) return;
                const parent = titleBar.breadcrumbs[0] || homeItem;
                if (parent) activateEmbeddedElement(parent.id);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <span className="admin-title-app-mark" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M5.2 3.2h4.1c.4 0 .7.1 1 .4l2.1 2.1c.3.3.4.6.4 1v4.1c0 1.1-.9 2-2 2H5.2c-1.1 0-2-.9-2-2V5.2c0-1.1.9-2 2-2Z"
                  fill="#fff"
                />
                <circle cx="9.6" cy="6.4" r="1.1" fill="#1DB954" />
              </svg>
            </span>

            <div className="admin-crumbs">
              {titleBar.breadcrumbs.map((breadcrumb, index) => (
                <span key={breadcrumb.id} className="admin-crumb">
                  {index > 0 && <span className="admin-crumb-sep">/</span>}
                  <TitleBarAction button={breadcrumb} className="admin-crumb-link" guardNavigation />
                </span>
              ))}
              {titleBar.title && (
                <>
                  {titleBar.breadcrumbs.length > 0 && <span className="admin-crumb-sep">/</span>}
                  <span className="admin-page-title">{titleBar.title}</span>
                </>
              )}
            </div>
          </div>

          <div className="admin-title-actions" ref={overflowRef}>
            {titleBar.primary && (
              <TitleBarAction button={titleBar.primary} className="admin-primary-action" />
            )}
            <button
              type="button"
              className="admin-overflow"
              aria-label="More actions"
              aria-expanded={overflowOpen}
              aria-haspopup="menu"
              onClick={() => setOverflowOpen(open => !open)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="3.5" cy="8" r="1.25" />
                <circle cx="8" cy="8" r="1.25" />
                <circle cx="12.5" cy="8" r="1.25" />
              </svg>
            </button>
            {overflowOpen && (
              <div className="admin-overflow-menu" role="menu">
                {titleBar.secondary.length === 0 && (
                  <p className="admin-overflow-empty">No actions</p>
                )}
                {titleBar.secondary.map(button => (
                  <TitleBarAction
                    key={button.id}
                    button={button}
                    className="admin-overflow-item"
                    onActivate={() => setOverflowOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="admin-context-stack">
            {saveBarVisible && <SaveBar />}
            <Toast />
          </div>
        </header>

        <div className="admin-frame">
          {children}
        </div>
      </div>
    </div>
  );
}
