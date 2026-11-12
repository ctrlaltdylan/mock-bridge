/**
 * Mock Shopify App Bridge for the browser, served as /app-bridge.js by the mock server.
 * The embedded app talks to the admin-frame (its parent window) over postMessage.
 */

import { createShopify } from '../../src/core/create-shopify';
import { patchFetch } from '../../src/core/fetch';
import { createPostMessageHost } from './host';

const host = createPostMessageHost();

// The `shopify` global of App Bridge v4 (and @shopify/app-bridge-react).
window.shopify = createShopify(host, { window });

patchFetch(window, host);

console.log('[MockAppBridge] Client library loaded');
