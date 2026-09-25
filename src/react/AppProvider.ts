/**
 * Mirrors @shopify/shopify-app-react-router AppProvider, with an optional App Bridge script URL.
 * Shopify's AppProvider always loads the CDN script and ignores unknown props such as __APP_BRIDGE_URL.
 */
import React, { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

export const SHOPIFY_APP_BRIDGE_CDN =
  'https://cdn.shopify.com/shopifycloud/app-bridge.js';
const POLARIS_CDN = 'https://cdn.shopify.com/shopifycloud/polaris.js';

interface BaseProps {
  children: ReactNode;
}

interface EmbeddedProps extends BaseProps {
  embedded: true;
  apiKey: string;
  /** e.g. http://localhost:3080/app-bridge.js when using MockShopifyAdminServer */
  appBridgeUrl?: string;
}

interface NonEmbeddedProps extends BaseProps {
  embedded?: false;
}

export type MockBridgeAppProviderProps = EmbeddedProps | NonEmbeddedProps;

function AppBridgeScript({ apiKey, src }: { apiKey: string; src: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const t = event.target;
      if (!t || !(t instanceof Element)) return;
      const anchor =
        t instanceof HTMLAnchorElement ? t : t.closest('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.href;
      if (href) navigate(href);
    };

    document.addEventListener('shopify:navigate', handleNavigate);

    return () => {
      document.removeEventListener('shopify:navigate', handleNavigate);
    };
  }, [navigate]);

  return React.createElement('script', {
    src,
    'data-api-key': apiKey,
  });
}

export function MockBridgeAppProvider(props: MockBridgeAppProviderProps) {
  const nodes: React.ReactNode[] = [];

  if (props.embedded) {
    const { apiKey, appBridgeUrl } = props;
    const src = appBridgeUrl ?? SHOPIFY_APP_BRIDGE_CDN;
    nodes.push(
      React.createElement(AppBridgeScript, {
        key: 'app-bridge',
        apiKey,
        src,
      }),
    );
  }

  nodes.push(React.createElement('script', { key: 'polaris', src: POLARIS_CDN }));
  nodes.push(props.children);

  return React.createElement(React.Fragment, null, ...nodes);
}
