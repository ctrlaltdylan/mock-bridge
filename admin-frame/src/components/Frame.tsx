import type { ComponentChildren } from "preact";
import type { Config } from "../hooks/useConfig";
import { parseUrl } from "../../../src/core/url";
import { appPath } from "../lib/app";
import { adminPath, appNavItems, appUrl, stores, type NavItem } from "../store/features";
import { TitleBar } from "./features/TitleBar";

type Props = {
  children: ComponentChildren;
  config: Config | null;
  /** Follows an item of the app's nav menu. */
  onNavigateApp: (href: string) => void;
  /** Goes back to the app, where it last was. */
  onOpenApp: () => void;
}

// Default Shopify admin navigation items
const defaultNavItems: NavItem[] = [
  { label: 'Home', href: '/', isHome: true },
  { label: 'Orders', href: '/orders' },
  { label: 'Products', href: '/products' },
  { label: 'Customers', href: '/customers' },
  { label: 'Content', href: '/content' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Marketing', href: '/marketing' },
  { label: 'Discounts', href: '/discounts' },
];

/** The pathname `href` points to, or `null` if it isn't a URL. */
const pathOf = (href: string, base: string) => parseUrl(href, base)?.pathname ?? null;

/**
 * The app path (without query or hash) an app nav item's `href` points to, from the app's
 * `url`, as the admin's nav menu routes it: through the proxy, `/fees` is the app's `/fees`.
 */
function appPathOf(config: Config, href: string, url: string) {
  const resolved = parseUrl(href, url);
  return resolved ? pathOf(appPath(config, resolved.href) ?? href, 'http://app') : null;
}

function isCurrentApp(config: Config | null, href: string, url: string | null) {
  if (!config || !url) return false;
  const path = appPathOf(config, href, url);
  return path !== null && path === appPathOf(config, url, url);
}

export function Frame({ children, config, onNavigateApp, onOpenApp }: Props) {
  const hasAppNav = appNavItems.value.length > 0;

  return (
    <div
      className="frame"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'rgb(26, 26, 26)',
      }}
    >
      <div
        className="top-bar"
        style={{ height: '3.5rem', width: '100%', backgroundColor: 'rgb(26, 26, 26)', color: 'white' }}
      >
        <h3>Mock Bridge</h3>
      </div>

      <div
        className="main-content"
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          borderTopLeftRadius: '0.75rem',
          borderTopRightRadius: '0.75rem',
          overflow: 'hidden',
        }}
      >
        <div className="navigation" style={{ width: '240px', backgroundColor: 'rgb(235, 235, 235)', padding: '8px 0' }}>
          {/* Default Shopify admin navigation */}
          <s-stack justifyContent="stretch">
            {defaultNavItems.map((item, index) => (
              <s-button
                key={`default-${index}`}
                variant={adminPath.value !== null && pathOf(adminPath.value, location.origin) === item.href ? 'secondary' : 'tertiary'}
                onClick={() => stores.navigation.set({ adminPath: item.href })}
              >
                {item.label}
              </s-button>
            ))}
          </s-stack>

          {/* The app: its nav menu's items, or one item to get back to it */}
          {config && (
            <>
              <div style={{ borderTop: '1px solid #ccc', margin: '12px 8px' }} />
              <div style={{ padding: '4px 12px', fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>
                App
              </div>
              <s-stack justifyContent="stretch">
                {hasAppNav ? appNavItems.value.map((item, index) => (
                  <s-button
                    key={`app-${index}`}
                    variant={adminPath.value === null && isCurrentApp(config, item.href, appUrl.value) ? 'secondary' : 'tertiary'}
                    onClick={() => onNavigateApp(item.href)}
                  >
                    {item.label}
                  </s-button>
                )) : (
                  <s-button variant={adminPath.value === null ? 'secondary' : 'tertiary'} onClick={onOpenApp}>
                    Open app
                  </s-button>
                )}
              </s-stack>
            </>
          )}
        </div>

        <div
          className="app-container"
          style={{
            flex: 1,
            width: '100%',
            backgroundColor: 'white',
          }}
        >
          <div
            className="app-title-bar"
            style={{
              height: '3.5rem',
              width: '100%',
              backgroundColor: 'rgb(241, 241, 241)',
              color: 'white',
              borderBottom: '1px solid rgb(235, 235, 235)',
            }}
          >
            <TitleBar />
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
