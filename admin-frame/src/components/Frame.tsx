import { useNavMenuFeatureStore, type NavItem } from "../store/features/nav-menu";

type Props = {
  children: React.ReactNode;
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

export function Frame({ children }: Props) {
  const appNavItems = useNavMenuFeatureStore(state => state.items);

  // Use app nav items if provided, otherwise show default Shopify admin nav
  const hasAppNav = appNavItems.length > 0;

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
                variant="tertiary"
              >
                {item.label}
              </s-button>
            ))}
          </s-stack>

          {/* App-specific navigation section */}
          {hasAppNav && (
            <>
              <div style={{ borderTop: '1px solid #ccc', margin: '12px 8px' }} />
              <div style={{ padding: '4px 12px', fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>
                App
              </div>
              <s-stack justifyContent="stretch">
                {appNavItems.map((item, index) => (
                  <s-button
                    key={`app-${index}`}
                    variant="tertiary"
                    onClick={() => {
                      // Send navigation message to iframe
                      const iframe = document.getElementById('app-iframe') as HTMLIFrameElement;
                      iframe?.contentWindow?.postMessage({
                        type: 'NAV_MENU_CLICK',
                        href: item.href,
                      }, '*');
                    }}
                  >
                    {item.label}
                  </s-button>
                ))}
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

          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
