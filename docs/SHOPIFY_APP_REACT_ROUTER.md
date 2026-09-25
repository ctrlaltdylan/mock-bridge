# Shopify App React Router

Use this guide if your app is built with [`@shopify/shopify-app-react-router`](https://shopify.dev/docs/api/shopify-app-react-router) (Shopify CLI React Router template).

## Problem

`shopify.authenticate.admin(request)` decodes the session JWT, loads a session from your configured storage, and may call Shopify’s token exchange when no session exists. Mock Bridge issues embedded session JWTs for local testing; when those tokens are signed with your real app secret, decoding succeeds, but Shopify will not exchange a mock-issued token. Without a row in session storage, admin authentication fails (redirect or error).

## Solution

When `SHOPIFY_MOCK_BRIDGE_AUTH=1`, wrap **only** `authenticate.admin` with `withMockBridgeAdminAuthForReactRouter` from `@getverdict/mock-bridge/auth`. It decodes the session token using `@shopify/shopify-api` (same audience checks as the framework), seeds a minimal offline or online `Session` if needed, then calls the real `shopify.authenticate.admin(request)`. Webhooks and other `authenticate.*` methods are unchanged.

## Environment variables

| Variable                           | When          | Purpose                                                                                                            |
| ---------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `SHOPIFY_MOCK_BRIDGE_AUTH`         | E2E / CI only | Must be `"1"` for the wrapper to seed a session before delegating to `authenticate.admin`.                         |
| `SHOPIFY_MOCK_BRIDGE_ACCESS_TOKEN` | Optional      | If set, stored on the seeded session as `accessToken` so tests that call the real Admin API can use a valid token. |

**Never set `SHOPIFY_MOCK_BRIDGE_AUTH` in production.** It bypasses normal session acquisition for admin requests when enabled.

## Align JWT verification with the mock server

`MockShopifyAdminServer` must sign session tokens with the **same secret** your app uses for JWT verification: set `clientSecret` to your app’s `SHOPIFY_API_SECRET` / `apiSecretKey` when you rely on that signing path. Otherwise `decodeSessionToken` will reject mock tokens.

## `shopify.server.ts` example

After `const shopify = shopifyApp({ ... })`, export `authenticate` like this (mirror the same `apiKey`, `apiSecretKey`, `apiVersion`, `scopes`, `appUrl`, and `customShopDomains` as `shopifyApp`):

```typescript
import {
  shopifyApp,
  ApiVersion
} from '@shopify/shopify-app-react-router/server';
import { withMockBridgeAdminAuthForReactRouter } from '@getverdict/mock-bridge/auth';

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(',') ?? [],
  appUrl: process.env.SHOPIFY_APP_URL!
  // sessionStorage, authPathPrefix, etc.
});

export default shopify;

export const authenticate =
  process.env.SHOPIFY_MOCK_BRIDGE_AUTH === '1'
    ? withMockBridgeAdminAuthForReactRouter(shopify, {
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET!,
        apiVersion: ApiVersion.October25,
        scopes: process.env.SCOPES?.split(',') ?? [],
        appUrl: process.env.SHOPIFY_APP_URL!
      })
    : shopify.authenticate;
```

Set `useOnlineTokens: true` in the reflect config if your app uses online tokens and you need the same session id strategy as production.

## App Bridge script (mock)

`@shopify/shopify-app-react-router/react` **`AppProvider`** always injects `https://cdn.shopify.com/shopifycloud/app-bridge.js`. Unknown props such as `__APP_BRIDGE_URL` are ignored, so the mock bridge script is never loaded and APIs like `shopify.resourcePicker()` will not talk to the mock admin.

Use **`EmbeddedShopifyAppProvider`** from `@getverdict/mock-bridge/react`: it picks **`MockBridgeAppProvider`** vs Shopify’s **`AppProvider`** internally, so you avoid the TypeScript error **`'Provider' cannot be used as a JSX component`** (a union of two components is not a valid JSX type).

```tsx
import { Outlet, useLoaderData } from 'react-router';
import { EmbeddedShopifyAppProvider } from '@getverdict/mock-bridge/react';

const mockOrigin = import.meta.env.VITE_MOCK_BRIDGE_ORIGIN as string | undefined;

export default function App() {
  const { apiKey } = useLoaderData() as { apiKey: string };

  return (
    <EmbeddedShopifyAppProvider embedded apiKey={apiKey} mockOrigin={mockOrigin}>
      <s-app-nav>{/* ... */}</s-app-nav>
      <Outlet />
    </EmbeddedShopifyAppProvider>
  );
}
```

Resolve **`mockOrigin`** from loader/env/CI as you prefer. Omit it or pass **`undefined`** in production so the Shopify CDN App Bridge script is used.

**Optional — `const Provider = mockOrigin ? MockBridgeAppProvider : AppProvider`**

TypeScript will reject `<Provider />` unless you assert a single component type, for example:

```tsx
import type { ComponentType, ReactNode } from 'react';
import { AppProvider } from '@shopify/shopify-app-react-router/react';
import { MockBridgeAppProvider } from '@getverdict/mock-bridge/react';

type EmbeddedRootProps = {
  embedded: true;
  apiKey: string;
  appBridgeUrl?: string;
  children: ReactNode;
};

const Provider = (
  mockOrigin ? MockBridgeAppProvider : AppProvider
) as ComponentType<EmbeddedRootProps>;
```

Then pass **`appBridgeUrl`** only when mocking (same URL shape as before), or use two explicit JSX branches and skip the variable entirely.

### `Cannot find module '@getverdict/mock-bridge/react'`

The **`./react`** entry is defined only under the root **`package.json` `exports`** and resolves to **`dist/react/`** (compiled from **`src/react/`**). There is **no** separate top-level **`react/`** package folder in the repo: a nested **`react/package.json`** that pointed at **`dist/react`** was removed because it broke incremental **`tsc`** (TypeScript treated emitted **`.d.ts`** files as program inputs).

TypeScript must use **`moduleResolution`** **`Bundler`** (typical Vite `tsconfig.app.json`), **`NodeNext`**, or **`Node16`**. Legacy **`moduleResolution`: `Node`** does not follow **`exports`**, so the subpath will not resolve.

Also ensure the installed package includes a built **`dist/react/`** (run **`npm run build`** in the repo, or use a published version that ships that folder).

## CSP

Relax **`frame-ancestors`** (and related directives) for the mock admin origin in development so the embedded app can load inside the mock iframe. See [Shopify app remix](./SHOPIFY_APP_REMIX.md) for a `frame-ancestors` example (port may differ).

## Runtime dependency

The helper imports `@shopify/shopify-api/adapters/web-api` before calling `shopifyApi` (same adapter as `@shopify/shopify-app-react-router/server`), so `shopifyApi` works even when your bundler loads mock-bridge before the framework entry. Your app must still install **`@shopify/shopify-app-react-router`** and peers (`react`, `react-dom`, `react-router`) as required by Shopify’s template.

## Install from npm or Git

```bash
npm install @getverdict/mock-bridge --save-dev
# or a branch:
# "@getverdict/mock-bridge": "github:bevycommerce/mock-bridge#feature/react-router-admin-auth"
```

## Related

- [Backend integration](./BACKEND_INTEGRATION.md) — token-string validators and `withMockTokenSupport` (not a substitute for `authenticate.admin(request)`).
