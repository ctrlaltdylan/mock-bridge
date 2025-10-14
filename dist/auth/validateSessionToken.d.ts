import { SessionTokenPayload } from '../auth/token-generator';
export interface AuthResult {
    /** Whether this is a mock token */
    isMock: boolean;
    /** Shop domain from the token */
    shopName: string;
    /** Shop domain with https:// prefix */
    shopDomain: string;
    /** User ID from the token */
    userId: string;
    /** Full decoded JWT payload */
    payload: SessionTokenPayload;
    /** Platform identifier (always 'shopify') */
    platform: 'shopify';
}
export interface ValidateTokenOptions {
    /** Real Shopify client secret */
    shopifySecret: string;
    /** Mock client secret (defaults to standard mock secret) */
    mockSecret?: string;
    /** Only try mock tokens in development (default: true) */
    developmentOnly?: boolean;
}
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
export declare function validateSessionToken(token: string, options: ValidateTokenOptions): Promise<AuthResult | false>;
//# sourceMappingURL=validateSessionToken.d.ts.map