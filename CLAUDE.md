# Mock Bridge

Shopify embedded app testing solution - test locally without real credentials.

## Quick Start
- `npm install` - Install dependencies
- `npm run build` - Build TypeScript
- `node dist/cli/index.js <app-url>` - Run the mock server (after building)
- `npm run dev` - Rebuild on change and run `src/server/dev.ts` with `.env`

## Architecture
- `src/server/` - Express server (MockShopifyAdminServer)
- `src/auth/` - JWT token generation/validation (`jwt.ts` is WebCrypto, runs anywhere)
- `src/client/` - Browser-side mock detection
- `src/cli/` - Commander.js CLI
- `src/core/` - The mock `window.shopify` (`createShopify(host)`), its fetch patch, and the admin-side feature stores. A `BridgeHost` plays the Shopify admin:
  - `app-bridge/src/host.ts` - postMessage to the admin-frame (the browser bundle served as /app-bridge.js)
  - `src/testing/` - in-process host for unit tests (`createTestBridge`)
- `src/vitest/` - Vitest setup file, `bridge` accessor, and the `mock-bridge` jsdom environment
- `src/vite/` - `mockBridge()` plugin: wires up Vitest (jsdom or Browser Mode), and with `dev` runs the app inside the mock admin during `vite dev` (serve only, never builds)
- `admin-frame/` - Preact + signals mock admin; renders the shared stores from `src/core/stores.ts`

The package is ESM (`"type": "module"`): `tsc` compiles `src/` to `dist/` (relative imports need `.js` extensions). CommonJS consumers can still `require()` it via Node's require(esm). `app-bridge/vite.config.ts` bundles the browser build (an IIFE) to `app-bridge/dist/index.js`. `src/vitest/tester.html` ships as source.

## Key Files
- `src/server/index.ts` - Core server, routes, admin UI HTML
- `src/auth/token-generator.ts` - JWT creation/verification
- `src/auth/validateSessionToken.ts` - Universal token validator
- `src/client/mock-detector.ts` - Client environment detection

## Testing
- `npm test` - builds the ESM entries, then runs unit tests and the fixture projects in `test/fixtures` (jsdom, the mock-bridge environment, and Browser Mode with Polaris when Chromium is installed)
- `npm run typecheck`
- `npm run lint` - oxlint with type-aware rules (tsgolint) over the whole repo; `admin-frame/.oxlintrc.json` adds its hooks rules

Server runs on port 3080 by default. Navigate to http://localhost:3080 to see mock admin.

## Default Config
- Port: 3080
- Shop: test-shop.myshopify.com
- Client ID: shopify-mock-dev-client-2024
