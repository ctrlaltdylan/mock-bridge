# Mock resource picker (products, variants, collections)

In mock admin, `shopify.resourcePicker(options)` opens a **real modal** in the parent admin frame. Items come from **mock catalog data** served by the mock bridge server. The embedded app must load **`app-bridge.js` from the mock server** (not the Shopify CDN); with React Router, use **`EmbeddedShopifyAppProvider`** (or `MockBridgeAppProvider` + `appBridgeUrl`) — see [SHOPIFY_APP_REACT_ROUTER.md](./SHOPIFY_APP_REACT_ROUTER.md#app-bridge-script-mock).

## Flow

1. Embedded app calls `window.shopify.resourcePicker({ type, multiple, selectionIds })`.
2. Mock App Bridge (`app-bridge.js`) posts `FEATURE_ACTION_REQUEST` to the admin frame with a long timeout (picker is interactive).
3. Admin frame opens the picker UI, loads catalog from **`GET /api/resource-picker-catalog?q=`**.
4. On **Add** or **Cancel**, the frame posts `FEATURE_ACTION_RESPONSE` with `{ cancelled, selection }`.
5. The app receives an array of selected resources (empty array on cancel).

## Catalog API

- **URL:** `GET /api/resource-picker-catalog`
- **Query:** `q` — optional search string (title, handle, id, variant SKU, etc.)
- **Response:**

```json
{
  "products": [ { "id": "gid://shopify/Product/1", "title": "...", "handle": "...", "status": "ACTIVE", "variants": [ ... ] } ],
  "variants": [ { "id": "gid://shopify/ProductVariant/101", "displayName": "...", "price": "19.99", "productId": "...", "productTitle": "...", ... } ],
  "collections": [ { "id": "gid://shopify/Collection/1", "title": "...", "handle": "..." } ]
}
```

The picker shows **one** list depending on `options.type`: `product` (default), `variant`, or `collection`.

## Custom catalog (programmatic server)

When creating `MockShopifyAdminServer`, pass **`resourcePickerCatalog`** (partial override merged with defaults):

```typescript
import { MockShopifyAdminServer } from '@getverdict/mock-bridge';

await new MockShopifyAdminServer({
  appUrl: 'http://localhost:3000',
  clientId: process.env.SHOPIFY_API_KEY!,
  clientSecret: process.env.SHOPIFY_API_SECRET!,
  resourcePickerCatalog: {
    products: [
      {
        id: 'gid://shopify/Product/99',
        title: 'Custom Mug',
        handle: 'custom-mug',
        status: 'ACTIVE',
        variants: [
          {
            id: 'gid://shopify/ProductVariant/9901',
            title: 'Default',
            displayName: 'Custom Mug · Default',
            price: '12.00',
            sku: 'MUG-1',
            inventoryQuantity: 10,
            productId: 'gid://shopify/Product/99',
            productTitle: 'Custom Mug',
            productHandle: 'custom-mug',
          },
        ],
      },
    ],
  },
}).start();
```

Override **`collections`** the same way if you use collection pickers.

## Legacy App Bridge `Actions.ResourcePicker`

`ShopifyAppBridge.actions.ResourcePicker.create(...)` **OPEN** now uses the same modal and fires **SELECT** with `{ selection: [...] }` or **CANCEL** handlers if the user cancels.

## Differences vs Shopify native

- UI is simplified (search + list) but behavior is deterministic for tests.
- Returned objects include useful GIDs and display fields; exact shapes may differ slightly from production Admin.
- `multiple` defaults to **single-select** unless `multiple: true` is set.
