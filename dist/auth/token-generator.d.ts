export interface SessionTokenPayload {
    iss: string;
    dest: string;
    aud: string;
    sub: string;
    exp: number;
    nbf: number;
    iat: number;
    jti: string;
    sid: string;
    sig: string;
}
export interface TokenGeneratorOptions {
    shop: string;
    clientId: string;
    clientSecret: string;
    userId?: string;
    sessionId?: string;
    expiresInSeconds?: number;
}
export declare class TokenGenerator {
    private clientSecret;
    constructor(clientSecret: string);
    /**
     * Generate a mock Shopify session token that mimics the real structure
     */
    generateSessionToken(options: TokenGeneratorOptions): string;
    /**
     * Verify a session token using the client secret
     */
    verifySessionToken(token: string): SessionTokenPayload;
    /**
     * Generate a new session token with the same session but refreshed timestamps
     */
    refreshSessionToken(existingToken: string, expiresInSeconds?: number): string;
    /**
     * Extract shop domain from a session token without verification
     * Useful for routing before full verification
     */
    static extractShopDomain(token: string): string | null;
}
//# sourceMappingURL=token-generator.d.ts.map