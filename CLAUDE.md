# Mock Bridge

Shopify embedded app testing solution - test locally without real credentials.

## Quick Start
- `npm install` - Install dependencies
- `npm run build` - Build TypeScript
- `npx ts-node src/cli/index.ts <app-url>` - Run dev server

## Architecture
- `src/server/` - Express server (MockShopifyAdminServer)
- `src/auth/` - JWT token generation/validation
- `src/client/` - Browser-side mock detection
- `src/cli/` - Commander.js CLI

## Key Files
- `src/server/index.ts` - Core server, routes, admin UI HTML
- `src/auth/token-generator.ts` - JWT creation/verification
- `src/auth/validateSessionToken.ts` - Universal token validator
- `src/client/mock-detector.ts` - Client environment detection

## Testing
Server runs on port 3080 by default. Navigate to http://localhost:3080 to see mock admin.

## Default Config
- Port: 3080
- Shop: test-shop.myshopify.com
- Client ID: shopify-mock-dev-client-2024
