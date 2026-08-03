/**
 * Shared mock catalog for resource picker API and optional server config override.
 */

export type MockResourcePickerCollection = {
  id: string;
  title: string;
  handle: string;
};

export type MockResourcePickerVariant = {
  id: string;
  title: string;
  displayName: string;
  price: string;
  sku?: string;
  inventoryQuantity?: number;
  productId: string;
  productTitle: string;
  productHandle: string;
};

export type MockResourcePickerProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  variants: MockResourcePickerVariant[];
};

export type ResourcePickerCatalogResponse = {
  products: MockResourcePickerProduct[];
  variants: MockResourcePickerVariant[];
  collections: MockResourcePickerCollection[];
};

/** Flattened variant rows for variant-only picker */
export function flattenVariants(products: MockResourcePickerProduct[]): MockResourcePickerVariant[] {
  return products.flatMap((p) => p.variants);
}

export function getDefaultResourcePickerCatalog(): ResourcePickerCatalogResponse {
  const products: MockResourcePickerProduct[] = [
    {
      id: 'gid://shopify/Product/1',
      title: 'Mock Product 1',
      handle: 'mock-product-1',
      status: 'ACTIVE',
      variants: [
        {
          id: 'gid://shopify/ProductVariant/101',
          title: 'Default Title',
          displayName: 'Mock Product 1 · Default',
          price: '19.99',
          sku: 'MOCK-1-DEFAULT',
          inventoryQuantity: 100,
          productId: 'gid://shopify/Product/1',
          productTitle: 'Mock Product 1',
          productHandle: 'mock-product-1',
        },
        {
          id: 'gid://shopify/ProductVariant/102',
          title: 'Alternate',
          displayName: 'Mock Product 1 · Alternate',
          price: '21.99',
          sku: 'MOCK-1-ALT',
          inventoryQuantity: 25,
          productId: 'gid://shopify/Product/1',
          productTitle: 'Mock Product 1',
          productHandle: 'mock-product-1',
        },
      ],
    },
    {
      id: 'gid://shopify/Product/2',
      title: 'Mock Product 2',
      handle: 'mock-product-2',
      status: 'ACTIVE',
      variants: [
        {
          id: 'gid://shopify/ProductVariant/201',
          title: 'Default Title',
          displayName: 'Mock Product 2 · Default',
          price: '29.99',
          sku: 'MOCK-2-DEFAULT',
          inventoryQuantity: 50,
          productId: 'gid://shopify/Product/2',
          productTitle: 'Mock Product 2',
          productHandle: 'mock-product-2',
        },
      ],
    },
  ];

  const collections: MockResourcePickerCollection[] = [
    {
      id: 'gid://shopify/Collection/1',
      title: 'Mock Collection — Featured',
      handle: 'mock-featured',
    },
    {
      id: 'gid://shopify/Collection/2',
      title: 'Mock Collection — Sale',
      handle: 'mock-sale',
    },
  ];

  return {
    products,
    variants: flattenVariants(products),
    collections,
  };
}

export function mergeResourcePickerCatalog(
  base: ResourcePickerCatalogResponse,
  override?: Partial<ResourcePickerCatalogResponse> | null,
): ResourcePickerCatalogResponse {
  if (!override) return base;
  const products = override.products !== undefined ? override.products : base.products;
  const collections =
    override.collections !== undefined ? override.collections : base.collections;
  const variants =
    override.variants !== undefined ? override.variants : flattenVariants(products);

  return {
    products,
    variants,
    collections,
  };
}
