/**
 * The contract between the mock `window.shopify` and whatever plays the role of
 * the Shopify admin: the admin-frame (over postMessage) in a browser, or an
 * in-process host in unit tests.
 */

export interface BridgeConfig {
  apiKey: string;
  shop: string;
  locale: string;
}

export interface BridgeEnvironment {
  embedded: boolean;
  mobile: boolean;
  pos: boolean;
  intent: boolean;
}

export interface AdminFetchRequest {
  /** The URL exactly as the app passed it, e.g. `shopify:admin/api/2025-10/graphql.json`. */
  url: string;
  init: RequestInit;
}

export interface BridgeHost {
  config: BridgeConfig;
  /** Overrides the environment derived from the window. */
  environment?: Partial<BridgeEnvironment>;
  /** Runs a feature action in the admin, e.g. `invoke('saveBar', 'show', { id })`, resolving to its result. */
  invoke(feature: string, action: string, payload?: unknown): Promise<unknown>;
  idToken(): Promise<string>;
  /** Answers an Admin API request. `fetch` is the unpatched fetch. */
  adminFetch(request: AdminFetchRequest, fetch: typeof globalThis.fetch): Promise<Response>;
}

/** postMessage protocol between the embedded app and the admin-frame. */
export type FeatureActionRequestMessage = {
  type: 'FEATURE_ACTION_REQUEST';
  action_id: string;
  feature: string;
  action: string;
  payload?: unknown;
};

export type FeatureActionResponseMessage = {
  type: 'FEATURE_ACTION_RESPONSE';
  action_id: string;
  payload?: unknown;
};
