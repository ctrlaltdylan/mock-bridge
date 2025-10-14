"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMockTokenSupport = withMockTokenSupport;
exports.withMockTokenMiddleware = withMockTokenMiddleware;
const validateSessionToken_1 = require("./validateSessionToken");
const createMockUser_1 = require("./createMockUser");
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
function withMockTokenSupport(authFunction, shopifySecret, options = {}) {
    const { mockSecret, developmentOnly = true, onMockToken, onRealToken, getShopData } = options;
    return async (token) => {
        // First, try to validate the token
        const authResult = await (0, validateSessionToken_1.validateSessionToken)(token, {
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
                currentUser: (0, createMockUser_1.createMockUser)({
                    shopName: authResult.shopName,
                    permissions: shopData?.settings?.defaultStaffPermissions
                }),
                isMock: true
            };
        }
        else {
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
function withMockTokenMiddleware(options) {
    return function (middleware) {
        return (async (req, res, next) => {
            const token = (req?.headers?.authorization || "").replace(/Bearer /, "");
            if (!token) {
                return middleware(req, res, next);
            }
            try {
                const authResult = await (0, validateSessionToken_1.validateSessionToken)(token, {
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
                    req.currentUser = (0, createMockUser_1.createMockUser)({
                        shopName: authResult.shopName,
                        permissions: req.shop?.settings?.defaultStaffPermissions
                    });
                }
            }
            catch (error) {
                // If mock token validation fails, proceed with normal flow
            }
            return middleware(req, res, next);
        });
    };
}
//# sourceMappingURL=withMockTokenSupport.js.map