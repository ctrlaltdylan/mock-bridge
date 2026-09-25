/**
 * Mock Shopify App Bridge for the browser, served as /app-bridge.js by the mock server.
 * The embedded app talks to the admin-frame (its parent window) over postMessage.
 */

import { createShopify } from '../../src/core/create-shopify';
import { patchFetch } from '../../src/core/fetch';
import { createPostMessageHost } from './host';
import { createLegacyAppBridge } from './legacy';

const host = createPostMessageHost();
const legacy = createLegacyAppBridge(host);

// App Bridge v3 globals.
Object.assign(window, {
  createApp: legacy.createApp,
  shopifyAppBridge: legacy,
});
(window as unknown as { ShopifyAppBridge?: unknown }).ShopifyAppBridge ??= legacy;

// The `shopify` global of App Bridge v4 (and @shopify/app-bridge-react).
window.shopify = createShopify(host, { window });

patchFetch(window, host);

console.log('[MockAppBridge] Client library loaded');
