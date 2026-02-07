# Shopify app remix

Follow this guide if you're using the Shopify app remix template.

## Set app bridge path

You likely have the `<AppProvider>` component rendered in your `app.tsx`. Set the `__APP_BRIDGE_URL` prop:

```tsx
<AppProvider isEmbeddedApp apiKey={apiKey} __APP_BRIDGE_URL="http://localhost:3080/app-bridge.js">
  {/* ... */}
</AppProvider>
```

The port you choose to run `@getverdict/mock-bridge` might be different than `3080` so keep that in mind.

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