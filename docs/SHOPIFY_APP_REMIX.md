# Shopify app remix

Follow this guide if you're using the Shopify app remix template.

## Set App Bridge script URL

Passing `__APP_BRIDGE_URL` (or any extra prop) into Shopify’s **Remix** or **React Router** `AppProvider` does **not** change which script loads: those providers render a `<script>` with a fixed CDN `src`. You must either override that script in your own provider or use the mock-bridge React helper.

For **`@shopify/shopify-app-react-router`**, replace `AppProvider` with `MockBridgeAppProvider` from `@getverdict/mock-bridge/react` and pass **`appBridgeUrl`** (same origin as `MockShopifyAdminServer`, usually `http://localhost:3080/app-bridge.js`). See [Shopify App React Router](./SHOPIFY_APP_REACT_ROUTER.md#app-bridge-script-mock).

For classic **Remix** templates, point your embedded route at the same URL (custom `AppProvider` / root script) so the iframe loads `app-bridge.js` from the mock server instead of the Shopify CDN.

## Set CSP headers

In your `entry.sever.tsx`, add this step AFTER you call `addDocumentResponseHeaders`:

```ts
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  addDocumentResponseHeaders(request, responseHeaders);

  if (process.env.NODE_ENV !== 'production') {
    responseHeaders.set('Content-Security-Policy', "frame-ancestors 'self' http://localhost:3080");
  }
}
```

(TODO: This library should maybe export a function like `setMockBridgeResponseHeaders(responseHeaders))` to take care of this.)

Again, your port may be different. 