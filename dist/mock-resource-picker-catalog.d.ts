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
export declare function flattenVariants(products: MockResourcePickerProduct[]): MockResourcePickerVariant[];
export declare function getDefaultResourcePickerCatalog(): ResourcePickerCatalogResponse;
export declare function mergeResourcePickerCatalog(base: ResourcePickerCatalogResponse, override?: Partial<ResourcePickerCatalogResponse> | null): ResourcePickerCatalogResponse;
//# sourceMappingURL=mock-resource-picker-catalog.d.ts.map