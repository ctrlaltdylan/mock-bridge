import '@shopify/shopify-api/adapters/web-api';
import { type ApiVersion } from '@shopify/shopify-api';
import type { shopifyApp } from '@shopify/shopify-app-react-router/server';
type ShopifyAppInstance = ReturnType<typeof shopifyApp>;
export type MockBridgeAuthReflectConfig = {
    apiKey: string | undefined;
    apiSecretKey: string;
    apiVersion: ApiVersion;
    scopes: string[] | undefined;
    appUrl: string;
    useOnlineTokens?: boolean;
    customShopDomains?: string[];
};
/**
 * When SHOPIFY_MOCK_BRIDGE_AUTH=1, wraps authenticate.admin only; webhook and other methods unchanged.
 */
export declare function withMockBridgeAdminAuthForReactRouter(shopify: ShopifyAppInstance, reflectConfig: MockBridgeAuthReflectConfig): ShopifyAppInstance["authenticate"];
export {};
//# sourceMappingURL=withMockBridgeAdminAuthForReactRouter.d.ts.map