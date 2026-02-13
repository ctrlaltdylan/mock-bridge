/**
 * Configuration for how Admin API requests are handled
 * - 'mock': Return mock data from the mock server (default, works offline)
 * - { proxy: string }: Forward requests to an app-provided proxy endpoint
 * - { accessToken: string }: Make direct requests to Shopify with the provided token
 */
export type AdminApiConfig =
  | 'mock'
  | { proxy: string }
  | { accessToken: string };

export interface MockShopifyAdminConfig {
  port?: number;
  appUrl: string;
  appPath?: string;  // Optional path to append to appUrl (e.g., '/shopify', '/admin', '')
  clientId?: string;
  clientSecret?: string;
  userId?: string;
  shop?: string;
  apiVersion?: string;
  scopes?: string[];
  webhooks?: MockWebhook[];
  debug?: boolean;
  adminApi?: AdminApiConfig;  // How to handle Admin API requests (default: 'mock')
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