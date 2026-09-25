# Mock Bridge

Shopify embedded app testing solution - test locally without real credentials.

## Quick Start
- `npm install` - Install dependencies
- `npm run build` - Build TypeScript
- `npx ts-node src/cli/index.ts <app-url>` - Run dev server

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
- `admin-frame/` - React mock admin; renders the shared stores from `src/core/stores.ts`

`src/core`, `src/testing`, `src/vite` and `src/vitest` are ESM-only: `tsconfig.esm.json` emits their declarations and `scripts/build.mjs esm` bundles them with Vite to `dist/**/*.mjs`. `scripts/build.mjs app-bridge` bundles the browser build to `app-bridge/dist/index.js`. Everything else is CommonJS via `tsconfig.json`.

## Key Files
- `src/server/index.ts` - Core server, routes, admin UI HTML
- `src/auth/token-generator.ts` - JWT creation/verification
- `src/auth/validateSessionToken.ts` - Universal token validator
- `src/client/mock-detector.ts` - Client environment detection

## Testing
- `npm test` - builds the ESM entries, then runs unit tests and the fixture projects in `test/fixtures` (jsdom, the mock-bridge environment, and Browser Mode with Polaris when Chromium is installed)
- `npm run typecheck`

Server runs on port 3080 by default. Navigate to http://localhost:3080 to see mock admin.

## Default Config
- Port: 3080
- Shop: test-shop.myshopify.com
- Client ID: shopify-mock-dev-client-2024
