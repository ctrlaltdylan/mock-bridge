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
export function createMockUser(options: MockUserOptions = {}): MockCurrentUser {
  const {
    shopName,
    userId = '123456789',
    email,
    firstName = 'Mock',
    lastName = 'User',
    displayName,
    permissions = [],
    additionalProps = {}
  } = options;

  // Generate email if not provided
  const userEmail = email || (shopName 
    ? `mock@${shopName.replace('.myshopify.com', '')}.com`
    : 'mock@testshop.com'
  );

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
export function createMockShopifyUser(shopData?: {
  name?: string;
  settings?: {
    defaultStaffPermissions?: any[];
  };
  [key: string]: any;
}): MockCurrentUser {
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
      ...Object.fromEntries(
        Object.entries(shopData || {}).filter(([key]) => 
          !['name', 'settings'].includes(key)
        )
      )
    }
  });
}