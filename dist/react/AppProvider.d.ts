/**
 * Mirrors @shopify/shopify-app-react-router AppProvider, with an optional App Bridge script URL.
 * Shopify's AppProvider always loads the CDN script and ignores unknown props such as __APP_BRIDGE_URL.
 */
import React, { type ReactNode } from 'react';
export declare const SHOPIFY_APP_BRIDGE_CDN = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
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
export declare function MockBridgeAppProvider(props: MockBridgeAppProviderProps): React.FunctionComponentElement<React.FragmentProps>;
export {};
//# sourceMappingURL=AppProvider.d.ts.map