"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockUser = createMockUser;
exports.createMockShopifyUser = createMockShopifyUser;
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
function createMockUser(options = {}) {
    const { shopName, userId = '123456789', email, firstName = 'Mock', lastName = 'User', displayName, permissions = [], additionalProps = {} } = options;
    // Generate email if not provided
    const userEmail = email || (shopName
        ? `mock@${shopName.replace('.myshopify.com', '')}.com`
        : 'mock@testshop.com');
    // Generate display name if not provided
    const userDisplayName = displayName || `${firstName} ${lastName}`;
    return {
        id: userId,
        email: userEmail,
        firstName,
        lastName,
        displayName: userDisplayName,
        permissions,
        ...additionalProps
    };
}
/**
 * Create a mock user specifically for Shopify app contexts
 *
 * @param shopData - Shop configuration object
 * @returns Mock user with shop-specific permissions and properties
 */
function createMockShopifyUser(shopData) {
    const defaultPermissions = [
        'read_products',
        'write_products',
        'read_orders',
        'write_orders',
        'read_customers',
        'write_customers'
    ];
    return createMockUser({
        shopName: shopData?.name,
        permissions: shopData?.settings?.defaultStaffPermissions || defaultPermissions,
        additionalProps: {
            // Common Shopify user properties that might be expected
            downloadLiabilityAcknowledgedAt: null,
            posBillingTermsAcceptedAt: null,
            posTutorialCompletedAt: null,
            // Add any other shop-specific properties
            ...Object.fromEntries(Object.entries(shopData || {}).filter(([key]) => !['name', 'settings'].includes(key)))
        }
    });
}
//# sourceMappingURL=createMockUser.js.map