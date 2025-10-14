"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSessionToken = validateSessionToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Universal session token validator that supports both real Shopify tokens and mock tokens
 *
 * @param token - JWT session token to validate
 * @param options - Validation options including secrets
 * @returns AuthResult if valid, false if invalid
 *
 * @example
 * ```typescript
 * const authData = await validateSessionToken(token, {
 *   shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!,
 * });
 *
 * if (authData) {
 *   if (authData.isMock) {
 *     // Handle mock token - skip Shopify API calls
 *     console.log('Mock environment:', authData.shopName);
 *   } else {
 *     // Handle real token - proceed with normal Shopify flow
 *     console.log('Real Shopify environment:', authData.shopName);
 *   }
 * }
 * ```
 */
async function validateSessionToken(token, options) {
    const { shopifySecret, mockSecret = "real-id-dev-secret-12345", developmentOnly = true } = options;
    // Determine which secrets to try based on environment and options
    const secretsToTry = [];
    // In development, try mock secret first if enabled
    if ((!developmentOnly || process.env.NODE_ENV === 'development') && mockSecret) {
        secretsToTry.push({ secret: mockSecret, isMock: true });
    }
    // Always try real Shopify secret
    if (shopifySecret) {
        secretsToTry.push({ secret: shopifySecret, isMock: false });
    }
    // Try each secret until one works
    for (const { secret, isMock } of secretsToTry) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, secret, {
                algorithms: ['HS256']
            });
            // Validate token structure
            if (!decoded.dest || !decoded.sub) {
                continue; // Invalid token structure, try next secret
            }
            // Extract shop information
            const shopDomain = decoded.dest;
            const shopName = shopDomain.replace('https://', '').replace('http://', '');
            return {
                isMock,
                shopName,
                shopDomain,
                userId: decoded.sub,
                payload: decoded,
                platform: 'shopify'
            };
        }
        catch (error) {
            // Token validation failed with this secret, try the next one
            continue;
        }
    }
    // All validation attempts failed
    return false;
}
//# sourceMappingURL=validateSessionToken.js.map