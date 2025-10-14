export { MockShopifyAdminServer } from './server';
export { TokenGenerator } from './auth/token-generator';
export { setupAppBridge, isMockEnvironment, getMockServerUrl } from './client/mock-detector';
export * from './types';
export type { MockEnvironmentConfig } from './client/mock-detector';
export * from './auth';
export declare function startMockShopifyAdmin(config: {
    appUrl: string;
    clientId: string;
    clientSecret: string;
    port?: number;
    shop?: string;
    debug?: boolean;
}): Promise<import("./server").MockShopifyAdminServer>;
//# sourceMappingURL=index.d.ts.map