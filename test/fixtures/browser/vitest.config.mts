import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { mockBridge } from '../../../dist/vite/index.mjs';

// Polaris loads from Shopify's CDN; the integration test sets this when it's unreachable.
const offline = !!process.env.MOCK_BRIDGE_OFFLINE;

export default defineConfig({
  plugins: [mockBridge({ shop: 'fixture.myshopify.com', browser: { headless: true, polaris: !offline } })],
  test: {
    root: fileURLToPath(new URL('..', import.meta.url)),
    // The jsdom fixture's tests, plus ones that need real Polaris components.
    include: ['shared/*.spec.ts', ...(offline ? [] : ['browser/*.spec.ts'])],
  },
});
