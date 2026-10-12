/**
 * Mock Admin GraphQL `products` / `collections` connections for campaign edit
 * hydration (getProducts / getCollections via /admin/graphql → mock-bridge).
 *
 * IDs match admin-frame Resource Picker catalog so picker selections resolve
 * when the campaign is reloaded.
 *
 * @see apps/story_video/ui/src/apis/admin.ts (fetchProductsGraphQL / fetchCollectionsGraphQL)
 */

export type CatalogProductNode = {
  id: string;
  title: string;
  totalInventory: number;
  handle: string;
  media: {
    nodes: Array<{ preview: { image: { originalSrc: string } } }>;
  };
  options: Array<{
    id: string;
    name: string;
    position: number;
    values: string[];
  }>;
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      price: string;
      availableForSale: boolean;
      inventoryQuantity: number;
      selectedOptions: Array<{ value: string }>;
    }>;
  };
};

export type CatalogCollectionNode = {
  id: string;
  title: string;
  image: { originalSrc: string } | null;
};

function productImage(seed: number) {
  return `https://picsum.photos/seed/mock-product-${seed}/200/200`;
}

function collectionImage(seed: number) {
  return `https://picsum.photos/seed/mock-collection-${seed}/200/200`;
}

function buildProduct(input: {
  id: string;
  title: string;
  handle: string;
  price: string;
  inventory: number;
  seed: number;
}): CatalogProductNode {
  const variantId = `${input.id}01`;
  return {
    id: `gid://shopify/Product/${input.id}`,
    title: input.title,
    totalInventory: input.inventory,
    handle: input.handle,
    media: {
      nodes: [
        {
          preview: {
            image: { originalSrc: productImage(input.seed) },
          },
        },
      ],
    },
    options: [
      {
        id: `gid://shopify/ProductOption/${input.id}`,
        name: 'Title',
        position: 1,
        values: ['Default Title'],
      },
    ],
    variants: {
      nodes: [
        {
          id: `gid://shopify/ProductVariant/${variantId}`,
          title: 'Default Title',
          price: input.price,
          availableForSale: input.inventory > 0,
          inventoryQuantity: input.inventory,
          selectedOptions: [],
        },
      ],
    },
  };
}

/** Same numeric IDs as admin-frame mockCatalog (Resource Picker). */
export const MOCK_CATALOG_PRODUCTS: CatalogProductNode[] = [
  buildProduct({ id: '1001', title: 'Classic Tee', handle: 'classic-tee', price: '29.00', inventory: 42, seed: 11 }),
  buildProduct({ id: '1002', title: 'Denim Jacket', handle: 'denim-jacket', price: '89.00', inventory: 18, seed: 12 }),
  buildProduct({ id: '1003', title: 'Canvas Tote', handle: 'canvas-tote', price: '24.00', inventory: 64, seed: 13 }),
  buildProduct({ id: '1004', title: 'Ceramic Mug', handle: 'ceramic-mug', price: '16.00', inventory: 120, seed: 14 }),
  buildProduct({ id: '1005', title: 'Wireless Earbuds', handle: 'wireless-earbuds', price: '79.00', inventory: 33, seed: 15 }),
  buildProduct({ id: '1006', title: 'Running Shoes', handle: 'running-shoes', price: '110.00', inventory: 27, seed: 16 }),
  buildProduct({ id: '1007', title: 'Draft Hoodie', handle: 'draft-hoodie', price: '55.00', inventory: 0, seed: 17 }),
  buildProduct({ id: '1008', title: 'Archived Cap', handle: 'archived-cap', price: '22.00', inventory: 0, seed: 18 }),
  buildProduct({ id: '1009', title: 'Hidden Sample', handle: 'hidden-sample', price: '1.00', inventory: 5, seed: 19 }),
  buildProduct({ id: '1010', title: 'Scented Candle', handle: 'scented-candle', price: '18.00', inventory: 80, seed: 20 }),
];

export const MOCK_CATALOG_COLLECTIONS: CatalogCollectionNode[] = [
  {
    id: 'gid://shopify/Collection/2001',
    title: 'Summer Essentials',
    image: { originalSrc: collectionImage(31) },
  },
  {
    id: 'gid://shopify/Collection/2002',
    title: 'New Arrivals',
    image: { originalSrc: collectionImage(32) },
  },
  {
    id: 'gid://shopify/Collection/2003',
    title: 'Home & Living',
    image: { originalSrc: collectionImage(33) },
  },
  {
    id: 'gid://shopify/Collection/2004',
    title: 'Gift Ideas',
    image: { originalSrc: collectionImage(34) },
  },
];

export function isProductsConnectionQuery(query: string): boolean {
  return /\bproducts\s*\(/i.test(query);
}

export function isCollectionsConnectionQuery(query: string): boolean {
  return /\bcollections\s*\(/i.test(query);
}

/**
 * Extract the GraphQL `query:` filter from a connection call.
 * story_video inlines it: products (first: 100 , query: "(1001) OR (1002)")
 */
export function extractConnectionSearchQuery(query: string, field: 'products' | 'collections'): string {
  const pattern = new RegExp(
    `\\b${field}\\s*\\([^)]*?query:\\s*"([^"]*)"`,
    'i',
  );
  const match = query.match(pattern);
  return match?.[1] ?? '';
}

/** Parse "(1001) OR (1002)" / "id:1001" style filters into numeric id strings. */
export function parseSearchNumericIds(searchQuery: string): string[] {
  if (!searchQuery.trim()) return [];
  const ids = searchQuery.match(/\d+/g) ?? [];
  return Array.from(new Set(ids));
}

function numericIdFromGid(gid: string): string {
  return gid.match(/\d+$/)?.[0] ?? '';
}

function filterBySearchIds<T extends { id: string; title: string; handle?: string }>(
  items: T[],
  searchQuery: string,
): T[] {
  const ids = parseSearchNumericIds(searchQuery);
  if (ids.length === 0) {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return items;
    return items.filter(item =>
      `${item.title} ${item.handle ?? ''}`.toLowerCase().includes(term),
    );
  }

  const idSet = new Set(ids);
  return items.filter(item => idSet.has(numericIdFromGid(item.id)));
}

export function mockProductsConnection(query: string): { nodes: CatalogProductNode[] } {
  const search = extractConnectionSearchQuery(query, 'products');
  return { nodes: filterBySearchIds(MOCK_CATALOG_PRODUCTS, search) };
}

export function mockCollectionsConnection(query: string): { nodes: CatalogCollectionNode[] } {
  const search = extractConnectionSearchQuery(query, 'collections');
  return { nodes: filterBySearchIds(MOCK_CATALOG_COLLECTIONS, search) };
}
