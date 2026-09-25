/**
 * TypeScript-friendly alternative to `const Provider = mock ? A : B` (unions are not valid JSX components).
 */
import React, { type ReactNode } from 'react';
export type EmbeddedShopifyAppProviderProps = {
    embedded: true;
    apiKey: string;
    children: ReactNode;
    /**
     * Mock admin origin (e.g. `http://localhost:3080`). When set, loads `app-bridge.js` from that host.
     */
    mockOrigin?: string | null;
};
export declare function EmbeddedShopifyAppProvider({ embedded, apiKey, children, mockOrigin, }: EmbeddedShopifyAppProviderProps): React.FunctionComponentElement<import("./AppProvider").MockBridgeAppProviderProps> | React.FunctionComponentElement<import("@shopify/shopify-app-react-router/react").AppProviderProps>;
//# sourceMappingURL=EmbeddedShopifyAppProvider.d.ts.map