export interface MockShopifyAdminConfig {
    port?: number;
    appUrl: string;
    appPath?: string;
    clientId?: string;
    clientSecret?: string;
    userId?: string;
    shop?: string;
    apiVersion?: string;
    scopes?: string[];
    webhooks?: MockWebhook[];
    debug?: boolean;
}
export interface MockWebhook {
    topic: string;
    address: string;
}
export interface AppBridgeConfig {
    apiKey: string;
    host: string;
    forceRedirect?: boolean;
}
export interface MockAppInstance {
    dispatch: (action: any) => void;
    subscribe: (callback: Function) => () => void;
    getState: () => Promise<AppState>;
    error: (callback: Function) => () => void;
}
export interface AppState {
    staffMember?: {
        id: string;
        name: string;
        email: string;
    };
    shop?: {
        domain: string;
        name: string;
    };
}
export interface SessionTokenRequest {
    type: 'SESSION_TOKEN_REQUEST';
}
export interface SessionTokenResponse {
    type: 'SESSION_TOKEN_RESPONSE';
    token: string;
}
export interface AppBridgeMessage {
    type: string;
    payload?: any;
    source?: 'app' | 'host';
}
export interface MockShop {
    domain: string;
    name: string;
    email: string;
    plan: string;
    createdAt: string;
}
export interface MockUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
}
export interface AuthenticatedFetchOptions extends RequestInit {
    headers?: HeadersInit;
}
//# sourceMappingURL=index.d.ts.map