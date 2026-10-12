/** Mock Shopify catalog for the admin Resource Picker. */

export type MockProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export type MockProductVariant = {
  id: string;
  title: string;
  price: string;
  compareAtPrice: string | null;
  availableForSale: boolean;
  displayName: string;
  barcode: string | null;
  selectedOptions: Array<{ value: string }>;
  fulfillmentService: {
    id: string;
    inventoryManagement: boolean;
    productBased: boolean;
    serviceName: string;
    type: 'MANUAL';
  };
  inventoryItem: { id: string };
  inventoryManagement: 'SHOPIFY';
  inventoryPolicy: 'DENY' | 'CONTINUE';
  inventoryQuantity: number;
  position: number;
  requiresShipping: boolean;
  sku: string | null;
  taxable: boolean;
  weight: number | null;
  weightUnit: 'KILOGRAMS';
  product?: { id: string; title: string; handle: string };
};

export type MockProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  status: MockProductStatus;
  createdAt: string;
  updatedAt: string;
  availablePublicationCount: number;
  descriptionHtml: string;
  hasOnlyDefaultVariant: boolean;
  options: Array<{ id: string; name: string; position: number; values: string[] }>;
  publishedAt: string | null;
  tags: string[];
  templateSuffix: string | null;
  totalInventory: number;
  totalVariants: number;
  tracksInventory: boolean;
  images: Array<{ id: string; originalSrc: string; altText: string }>;
  variants: MockProductVariant[];
  /** Not published on any sales channel when true. */
  hidden: boolean;
};

export type MockCollection = {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  image: { id: string; originalSrc: string; altText: string } | null;
  productsCount: number;
  productsAutomaticallySortedCount: number;
  productsManuallySortedCount: number;
  availablePublicationCount: number;
  publicationCount: number;
  ruleSet: null;
  seo: { title?: string; description?: string };
  sortOrder: 'MANUAL';
  storefrontId: string;
  templateSuffix: string | null;
  updatedAt: string;
};

function productImage(seed: number) {
  return `https://picsum.photos/seed/mock-product-${seed}/200/200`;
}

function collectionImage(seed: number) {
  return `https://picsum.photos/seed/mock-collection-${seed}/200/200`;
}

function buildVariant(
  productId: string,
  productTitle: string,
  handle: string,
  variantId: string,
  title: string,
  price: string,
  position: number,
  inventory: number,
): MockProductVariant {
  return {
    id: `gid://shopify/ProductVariant/${variantId}`,
    title,
    price,
    compareAtPrice: null,
    availableForSale: inventory > 0,
    displayName: `${productTitle} - ${title}`,
    barcode: null,
    selectedOptions: title === 'Default Title' ? [] : [{ value: title }],
    fulfillmentService: {
      id: 'gid://shopify/FulfillmentService/manual',
      inventoryManagement: true,
      productBased: true,
      serviceName: 'manual',
      type: 'MANUAL',
    },
    inventoryItem: { id: `gid://shopify/InventoryItem/${variantId}` },
    inventoryManagement: 'SHOPIFY',
    inventoryPolicy: 'DENY',
    inventoryQuantity: inventory,
    position,
    requiresShipping: true,
    sku: `SKU-${variantId}`,
    taxable: true,
    weight: 0.5,
    weightUnit: 'KILOGRAMS',
    product: {
      id: `gid://shopify/Product/${productId}`,
      title: productTitle,
      handle,
    },
  };
}

function buildProduct(input: {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  status: MockProductStatus;
  hidden?: boolean;
  price: string;
  inventory: number;
  seed: number;
  tags?: string[];
}): MockProduct {
  const gid = `gid://shopify/Product/${input.id}`;
  const variant = buildVariant(
    input.id,
    input.title,
    input.handle,
    `${input.id}01`,
    'Default Title',
    input.price,
    1,
    input.inventory,
  );

  return {
    id: gid,
    title: input.title,
    handle: input.handle,
    vendor: input.vendor,
    productType: input.productType,
    status: input.status,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-06-01T12:00:00Z',
    availablePublicationCount: input.hidden ? 0 : 1,
    descriptionHtml: `<p>${input.title}</p>`,
    hasOnlyDefaultVariant: true,
    options: [{ id: `gid://shopify/ProductOption/${input.id}`, name: 'Title', position: 1, values: ['Default Title'] }],
    publishedAt: input.status === 'ACTIVE' && !input.hidden ? '2024-01-15T10:00:00Z' : null,
    tags: input.tags ?? [],
    templateSuffix: null,
    totalInventory: input.inventory,
    totalVariants: 1,
    tracksInventory: true,
    images: [{
      id: `gid://shopify/ProductImage/${input.id}`,
      originalSrc: productImage(input.seed),
      altText: input.title,
    }],
    variants: [variant],
    hidden: Boolean(input.hidden),
  };
}

export const MOCK_PRODUCTS: MockProduct[] = [
  buildProduct({ id: '1001', title: 'Classic Tee', handle: 'classic-tee', vendor: 'ReelPik', productType: 'Apparel', status: 'ACTIVE', price: '29.00', inventory: 42, seed: 11, tags: ['apparel'] }),
  buildProduct({ id: '1002', title: 'Denim Jacket', handle: 'denim-jacket', vendor: 'ReelPik', productType: 'Apparel', status: 'ACTIVE', price: '89.00', inventory: 18, seed: 12, tags: ['apparel', 'outerwear'] }),
  buildProduct({ id: '1003', title: 'Canvas Tote', handle: 'canvas-tote', vendor: 'ReelPik', productType: 'Accessories', status: 'ACTIVE', price: '24.00', inventory: 64, seed: 13, tags: ['bags'] }),
  buildProduct({ id: '1004', title: 'Ceramic Mug', handle: 'ceramic-mug', vendor: 'Home Co', productType: 'Home', status: 'ACTIVE', price: '16.00', inventory: 120, seed: 14 }),
  buildProduct({ id: '1005', title: 'Wireless Earbuds', handle: 'wireless-earbuds', vendor: 'Audio Lab', productType: 'Electronics', status: 'ACTIVE', price: '79.00', inventory: 33, seed: 15 }),
  buildProduct({ id: '1006', title: 'Running Shoes', handle: 'running-shoes', vendor: 'Stride', productType: 'Footwear', status: 'ACTIVE', price: '110.00', inventory: 27, seed: 16 }),
  buildProduct({ id: '1007', title: 'Draft Hoodie', handle: 'draft-hoodie', vendor: 'ReelPik', productType: 'Apparel', status: 'DRAFT', price: '55.00', inventory: 0, seed: 17 }),
  buildProduct({ id: '1008', title: 'Archived Cap', handle: 'archived-cap', vendor: 'ReelPik', productType: 'Accessories', status: 'ARCHIVED', price: '22.00', inventory: 0, seed: 18 }),
  buildProduct({ id: '1009', title: 'Hidden Sample', handle: 'hidden-sample', vendor: 'ReelPik', productType: 'Sample', status: 'ACTIVE', price: '1.00', inventory: 5, seed: 19, hidden: true }),
  buildProduct({ id: '1010', title: 'Scented Candle', handle: 'scented-candle', vendor: 'Home Co', productType: 'Home', status: 'ACTIVE', price: '18.00', inventory: 80, seed: 20 }),
];

export const MOCK_COLLECTIONS: MockCollection[] = [
  {
    id: 'gid://shopify/Collection/2001',
    title: 'Summer Essentials',
    handle: 'summer-essentials',
    description: 'Warm-weather bestsellers',
    descriptionHtml: '<p>Warm-weather bestsellers</p>',
    image: { id: 'gid://shopify/CollectionImage/2001', originalSrc: collectionImage(31), altText: 'Summer Essentials' },
    productsCount: 12,
    productsAutomaticallySortedCount: 12,
    productsManuallySortedCount: 0,
    availablePublicationCount: 1,
    publicationCount: 1,
    ruleSet: null,
    seo: { title: 'Summer Essentials' },
    sortOrder: 'MANUAL',
    storefrontId: 'gid://shopify/CollectionStorefront/2001',
    templateSuffix: null,
    updatedAt: '2024-05-01T09:00:00Z',
  },
  {
    id: 'gid://shopify/Collection/2002',
    title: 'New Arrivals',
    handle: 'new-arrivals',
    description: 'Latest drops',
    descriptionHtml: '<p>Latest drops</p>',
    image: { id: 'gid://shopify/CollectionImage/2002', originalSrc: collectionImage(32), altText: 'New Arrivals' },
    productsCount: 8,
    productsAutomaticallySortedCount: 0,
    productsManuallySortedCount: 8,
    availablePublicationCount: 1,
    publicationCount: 1,
    ruleSet: null,
    seo: { title: 'New Arrivals' },
    sortOrder: 'MANUAL',
    storefrontId: 'gid://shopify/CollectionStorefront/2002',
    templateSuffix: null,
    updatedAt: '2024-06-10T09:00:00Z',
  },
  {
    id: 'gid://shopify/Collection/2003',
    title: 'Home & Living',
    handle: 'home-living',
    description: 'Comfort for every room',
    descriptionHtml: '<p>Comfort for every room</p>',
    image: { id: 'gid://shopify/CollectionImage/2003', originalSrc: collectionImage(33), altText: 'Home & Living' },
    productsCount: 15,
    productsAutomaticallySortedCount: 15,
    productsManuallySortedCount: 0,
    availablePublicationCount: 1,
    publicationCount: 1,
    ruleSet: null,
    seo: { title: 'Home & Living' },
    sortOrder: 'MANUAL',
    storefrontId: 'gid://shopify/CollectionStorefront/2003',
    templateSuffix: null,
    updatedAt: '2024-04-20T09:00:00Z',
  },
  {
    id: 'gid://shopify/Collection/2004',
    title: 'Gift Ideas',
    handle: 'gift-ideas',
    description: 'Ready to wrap',
    descriptionHtml: '<p>Ready to wrap</p>',
    image: { id: 'gid://shopify/CollectionImage/2004', originalSrc: collectionImage(34), altText: 'Gift Ideas' },
    productsCount: 20,
    productsAutomaticallySortedCount: 20,
    productsManuallySortedCount: 0,
    availablePublicationCount: 1,
    publicationCount: 1,
    ruleSet: null,
    seo: { title: 'Gift Ideas' },
    sortOrder: 'MANUAL',
    storefrontId: 'gid://shopify/CollectionStorefront/2004',
    templateSuffix: null,
    updatedAt: '2024-03-12T09:00:00Z',
  },
];

export type ResourcePickerOptions = {
  type: 'product' | 'collection' | 'variant';
  action?: 'add' | 'select' | string;
  multiple?: boolean | number;
  query?: string;
  selectionIds?: Array<{ id: string; variants?: Array<{ id: string }> }>;
  filter?: {
    hidden?: boolean;
    variants?: boolean;
    draft?: boolean | undefined;
    archived?: boolean | undefined;
    query?: string;
  };
};

function matchesQuery(text: string, query: string) {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export function listPickerResources(options: ResourcePickerOptions) {
  const search = options.query || options.filter?.query || '';

  if (options.type === 'collection') {
    return MOCK_COLLECTIONS.filter(collection => matchesQuery(`${collection.title} ${collection.handle}`, search));
  }

  if (options.type === 'variant') {
    return MOCK_PRODUCTS
      .filter(product => product.status === 'ACTIVE')
      .flatMap(product => product.variants.map(variant => ({
        ...variant,
        product: { id: product.id, title: product.title, handle: product.handle },
        image: product.images[0] ?? null,
      })))
      .filter(variant => matchesQuery(`${variant.displayName} ${variant.sku ?? ''}`, search));
  }

  return MOCK_PRODUCTS.filter(product => {
    if (options.filter?.draft === false && product.status === 'DRAFT') return false;
    if (options.filter?.archived === false && product.status === 'ARCHIVED') return false;
    if (options.filter?.hidden === false && product.hidden) return false;
    return matchesQuery(`${product.title} ${product.handle} ${product.vendor}`, search);
  });
}

export function resolveSelection(
  options: ResourcePickerOptions,
  selectedIds: string[],
) {
  if (options.type === 'collection') {
    return MOCK_COLLECTIONS.filter(item => selectedIds.includes(item.id));
  }

  if (options.type === 'variant') {
    return MOCK_PRODUCTS
      .flatMap(product => product.variants.map(variant => ({
        ...variant,
        product: { id: product.id, title: product.title, handle: product.handle },
        image: product.images[0] ?? null,
      })))
      .filter(item => selectedIds.includes(item.id));
  }

  return MOCK_PRODUCTS.filter(item => selectedIds.includes(item.id));
}
