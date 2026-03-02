import { MockShopifyAdminConfig } from '../types';
export declare class MockShopifyAdminServer {
    private app;
    private config;
    private tokenGenerator;
    private server;
    private mockShop;
    private mockUser;
    constructor(config: MockShopifyAdminConfig);
    private setupMiddleware;
    private setupRoutes;
    /**
     * Handle mock GraphQL Admin API requests
     */
    private handleMockGraphQL;
    /**
     * Handle mock REST Admin API requests
     */
    private handleMockRestApi;
    start(): Promise<void>;
    stop(): Promise<void>;
    getConfig(): MockShopifyAdminConfig;
}
//# sourceMappingURL=index.d.ts.map