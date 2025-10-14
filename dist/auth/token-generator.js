"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenGenerator = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
class TokenGenerator {
    constructor(clientSecret) {
        this.clientSecret = clientSecret;
    }
    /**
     * Generate a mock Shopify session token that mimics the real structure
     */
    generateSessionToken(options) {
        const { shop, clientId, userId = '123456789', sessionId = crypto_1.default.randomBytes(32).toString('hex'), expiresInSeconds = 60, // Default 1 minute like real Shopify tokens
         } = options;
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: `https://${shop}/admin`,
            dest: `https://${shop}`,
            aud: clientId,
            sub: userId,
            exp: now + expiresInSeconds,
            nbf: now,
            iat: now,
            jti: (0, uuid_1.v4)(),
            sid: sessionId,
            sig: crypto_1.default.randomBytes(32).toString('hex'),
        };
        // Sign with HS256 algorithm like Shopify does
        const token = jsonwebtoken_1.default.sign(payload, this.clientSecret, {
            algorithm: 'HS256',
            header: {
                alg: 'HS256',
                typ: 'JWT',
            },
        });
        return token;
    }
    /**
     * Verify a session token using the client secret
     */
    verifySessionToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.clientSecret, {
                algorithms: ['HS256'],
            });
            // Additional Shopify-specific validations
            const now = Math.floor(Date.now() / 1000);
            if (decoded.exp <= now) {
                throw new Error('Token has expired');
            }
            if (decoded.nbf > now) {
                throw new Error('Token is not yet valid');
            }
            // Verify that iss and dest domains match (top-level domain)
            const issDomain = new URL(decoded.iss).hostname.split('.').slice(-2).join('.');
            const destDomain = new URL(decoded.dest).hostname.split('.').slice(-2).join('.');
            if (issDomain !== destDomain) {
                throw new Error('Token iss and dest domains do not match');
            }
            return decoded;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Invalid session token: ${errorMessage}`);
        }
    }
    /**
     * Generate a new session token with the same session but refreshed timestamps
     */
    refreshSessionToken(existingToken, expiresInSeconds = 60) {
        const decoded = this.verifySessionToken(existingToken);
        const now = Math.floor(Date.now() / 1000);
        const refreshedPayload = {
            ...decoded,
            exp: now + expiresInSeconds,
            nbf: now,
            iat: now,
            jti: (0, uuid_1.v4)(), // New JWT ID for the refreshed token
        };
        return jsonwebtoken_1.default.sign(refreshedPayload, this.clientSecret, {
            algorithm: 'HS256',
            header: {
                alg: 'HS256',
                typ: 'JWT',
            },
        });
    }
    /**
     * Extract shop domain from a session token without verification
     * Useful for routing before full verification
     */
    static extractShopDomain(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.dest) {
                return new URL(decoded.dest).hostname;
            }
            return null;
        }
        catch {
            return null;
        }
    }
}
exports.TokenGenerator = TokenGenerator;
//# sourceMappingURL=token-generator.js.map