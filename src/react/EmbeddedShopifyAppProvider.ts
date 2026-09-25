/**
 * TypeScript-friendly alternative to `const Provider = mock ? A : B` (unions are not valid JSX components).
 */
import React, { type ReactNode } from 'react';
import { AppProvider } from '@shopify/shopify-app-react-router/react';
import { MockBridgeAppProvider } from './AppProvider';

export type EmbeddedShopifyAppProviderProps = {
  embedded: true;
  apiKey: string;
  children: ReactNode;
  /**
   * Mock admin origin (e.g. `http://localhost:3080`). When set, loads `app-bridge.js` from that host.
   */
  mockOrigin?: string | null;
};

export function EmbeddedShopifyAppProvider({
  embedded,
  apiKey,
  children,
  mockOrigin,
}: EmbeddedShopifyAppProviderProps) {
  const origin = mockOrigin?.trim();
  if (origin) {
    const base = origin.replace(/\/$/, '');
    return React.createElement(MockBridgeAppProvider, {
      embedded,
      apiKey,
      appBridgeUrl: `${base}/app-bridge.js`,
      children,
    });
  }

  return React.createElement(AppProvider, { embedded, apiKey, children });
}
