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
    private getAdminHTML;
    start(): Promise<void>;
    stop(): Promise<void>;
    getConfig(): MockShopifyAdminConfig;
}
//# sourceMappingURL=index.d.ts.map