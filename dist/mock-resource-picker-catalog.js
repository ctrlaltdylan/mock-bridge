"use strict";
/**
 * Shared mock catalog for resource picker API and optional server config override.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenVariants = flattenVariants;
exports.getDefaultResourcePickerCatalog = getDefaultResourcePickerCatalog;
exports.mergeResourcePickerCatalog = mergeResourcePickerCatalog;
/** Flattened variant rows for variant-only picker */
function flattenVariants(products) {
    return products.flatMap((p) => p.variants);
}
function getDefaultResourcePickerCatalog() {
    const products = [
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
    const collections = [
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
function mergeResourcePickerCatalog(base, override) {
    if (!override)
        return base;
    const products = override.products !== undefined ? override.products : base.products;
    const collections = override.collections !== undefined ? override.collections : base.collections;
    const variants = override.variants !== undefined ? override.variants : flattenVariants(products);
    return {
        products,
        variants,
        collections,
    };
}
//# sourceMappingURL=mock-resource-picker-catalog.js.map