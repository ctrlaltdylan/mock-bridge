export interface MockCurrentUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    permissions?: any[];
    [key: string]: any;
}
export interface MockUserOptions {
    /** Shop name for generating email */
    shopName?: string;
    /** User ID (defaults to '123456789') */
    userId?: string;
    /** User email (auto-generated if not provided) */
    email?: string;
    /** First name (defaults to 'Mock') */
    firstName?: string;
    /** Last name (defaults to 'User') */
    lastName?: string;
    /** Display name (auto-generated if not provided) */
    displayName?: string;
    /** Staff permissions array */
    permissions?: any[];
    /** Additional user properties */
    additionalProps?: Record<string, any>;
}
/**
 * Generate a mock current user object for development/testing
 *
 * @param options - Configuration options for the mock user
 * @returns Mock user object with realistic properties
 *
 * @example
 * ```typescript
 * // Basic usage
 * const mockUser = createMockUser();
 *
 * // With shop-specific data
 * const mockUser = createMockUser({
 *   shopName: 'test-shop.myshopify.com',
 *   permissions: shop?.settings?.defaultStaffPermissions
 * });
 *
 * // With custom properties
 * const mockUser = createMockUser({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   additionalProps: {
 *     posBillingTermsAcceptedAt: new Date(),
 *     posTutorialCompletedAt: new Date()
 *   }
 * });
 * ```
 */
export declare function createMockUser(options?: MockUserOptions): MockCurrentUser;
/**
 * Create a mock user specifically for Shopify app contexts
 *
 * @param shopData - Shop configuration object
 * @returns Mock user with shop-specific permissions and properties
 */
export declare function createMockShopifyUser(shopData?: {
    name?: string;
    settings?: {
        defaultStaffPermissions?: any[];
    };
    [key: string]: any;
}): MockCurrentUser;
//# sourceMappingURL=createMockUser.d.ts.map