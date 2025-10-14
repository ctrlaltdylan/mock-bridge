import { validateSessionToken, AuthResult, ValidateTokenOptions } from './validateSessionToken';
import { createMockUser, MockCurrentUser } from './createMockUser';

export interface MockTokenHandlerOptions {
  /** Mock client secret (defaults to standard mock secret) */
  mockSecret?: string;
  /** Only enable mock tokens in development (default: true) */
  developmentOnly?: boolean;
  /** Custom handler for mock tokens */
  onMockToken?: (authResult: AuthResult) => any | Promise<any>;
  /** Custom handler for real tokens */
  onRealToken?: (authResult: AuthResult) => any | Promise<any>;
  /** Function to get shop data for mock user generation */
  getShopData?: (shopName: string) => any | Promise<any>;
}

/**
 * Wrapper that adds mock token support to existing authentication functions
 * 
 * @param authFunction - Existing authentication function that takes a token
 * @param shopifySecret - Real Shopify client secret
 * @param options - Mock token handling options
 * @returns Enhanced authentication function with mock support
 * 
 * @example
 * ```typescript
 * // Wrap existing auth function
 * const originalAuth = async (token: string) => {
 *   // Your existing Shopify auth logic
 * };
 * 
 * const enhancedAuth = withMockTokenSupport(
 *   originalAuth,
 *   process.env.SHOPIFY_API_PRIVATE_KEY!,
 *   {
 *     getShopData: async (shopName) => await getShopByName(shopName),
 *     onMockToken: async (authResult) => {
 *       // Custom mock token handling
 *       const shop = await getShopByName(authResult.shopName);
 *       if (!shop) throw new Error('Shop not found');
 *       return createMockUser({ shopName: authResult.shopName });
 *     }
 *   }
 * );
 * 
 * // Use enhanced auth in your routes
 * const result = await enhancedAuth(token);
 * ```
 */
export function withMockTokenSupport<T>(
  authFunction: (token: string) => T | Promise<T>,
  shopifySecret: string,
  options: MockTokenHandlerOptions = {}
) {
  const {
    mockSecret,
    developmentOnly = true,
    onMockToken,
    onRealToken,
    getShopData
  } = options;

  return async (token: string): Promise<T> => {
    // First, try to validate the token
    const authResult = await validateSessionToken(token, {
      shopifySecret,
      mockSecret,
      developmentOnly
    });

    if (!authResult) {
      // Token is invalid, proceed with original function which should handle this
      return await authFunction(token);
    }

    if (authResult.isMock) {
      // Handle mock token
      if (onMockToken) {
        return await onMockToken(authResult);
      }

      // Default mock token handling
      let shopData = null;
      if (getShopData) {
        shopData = await getShopData(authResult.shopName);
        if (!shopData) {
          throw new Error(`Shop ${authResult.shopName} not found for mock token`);
        }
      }

      // Return mock authentication result
      return {
        platform: 'shopify',
        sessionToken: authResult.payload,
        shopDomain: authResult.shopDomain,
        shopName: authResult.shopName,
        shop: shopData,
        currentUser: createMockUser({
          shopName: authResult.shopName,
          permissions: shopData?.settings?.defaultStaffPermissions
        }),
        isMock: true
      } as any;

    } else {
      // Handle real token
      if (onRealToken) {
        return await onRealToken(authResult);
      }

      // For real tokens, proceed with original authentication function
      return await authFunction(token);
    }
  };
}

/**
 * Higher-order function that creates a mock-aware authentication middleware
 * 
 * @param options - Configuration for mock token support
 * @returns Function that can wrap authentication middleware
 * 
 * @example
 * ```typescript
 * const createAuthMiddleware = withMockTokenMiddleware({
 *   getShopData: (shopName) => getShopByName(shopName),
 *   developmentOnly: true
 * });
 * 
 * export const withAuth = createAuthMiddleware((req, res, next) => {
 *   // Your auth middleware logic
 * });
 * ```
 */
export function withMockTokenMiddleware(options: MockTokenHandlerOptions) {
  return function<T extends Function>(middleware: T): T {
    return (async (req: any, res: any, next: any) => {
      const token = (req?.headers?.authorization || "").replace(/Bearer /, "");
      
      if (!token) {
        return middleware(req, res, next);
      }

      try {
        const authResult = await validateSessionToken(token, {
          shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY || '',
          mockSecret: options.mockSecret,
          developmentOnly: options.developmentOnly
        });

        if (authResult && authResult.isMock) {
          // Add mock auth data to request
          req.isMockAuth = true;
          req.mockAuthResult = authResult;
          
          if (options.getShopData) {
            req.shop = await options.getShopData(authResult.shopName);
          }
          
          req.currentUser = createMockUser({
            shopName: authResult.shopName,
            permissions: req.shop?.settings?.defaultStaffPermissions
          });
        }
      } catch (error) {
        // If mock token validation fails, proceed with normal flow
      }

      return middleware(req, res, next);
    }) as any;
  };
}