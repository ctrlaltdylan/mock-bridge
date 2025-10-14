import { AuthResult } from './validateSessionToken';
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
export declare function withMockTokenSupport<T>(authFunction: (token: string) => T | Promise<T>, shopifySecret: string, options?: MockTokenHandlerOptions): (token: string) => Promise<T>;
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
export declare function withMockTokenMiddleware(options: MockTokenHandlerOptions): <T extends Function>(middleware: T) => T;
//# sourceMappingURL=withMockTokenSupport.d.ts.map