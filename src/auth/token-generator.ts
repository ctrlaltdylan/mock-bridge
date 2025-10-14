import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface SessionTokenPayload {
  iss: string;  // Shop's admin domain
  dest: string; // Shop's domain  
  aud: string;  // Client ID
  sub: string;  // User ID
  exp: number;  // Expiration time
  nbf: number;  // Not before time
  iat: number;  // Issued at time
  jti: string;  // JWT ID
  sid: string;  // Session ID
  sig: string;  // Shopify signature
}

export interface TokenGeneratorOptions {
  shop: string;
  clientId: string;
  clientSecret: string;
  userId?: string;
  sessionId?: string;
  expiresInSeconds?: number;
}

export class TokenGenerator {
  private clientSecret: string;

  constructor(clientSecret: string) {
    this.clientSecret = clientSecret;
  }

  /**
   * Generate a mock Shopify session token that mimics the real structure
   */
  generateSessionToken(options: TokenGeneratorOptions): string {
    const {
      shop,
      clientId,
      userId = '123456789',
      sessionId = crypto.randomBytes(32).toString('hex'),
      expiresInSeconds = 60, // Default 1 minute like real Shopify tokens
    } = options;

    const now = Math.floor(Date.now() / 1000);
    
    const payload: SessionTokenPayload = {
      iss: `https://${shop}/admin`,
      dest: `https://${shop}`,
      aud: clientId,
      sub: userId,
      exp: now + expiresInSeconds,
      nbf: now,
      iat: now,
      jti: uuidv4(),
      sid: sessionId,
      sig: crypto.randomBytes(32).toString('hex'),
    };

    // Sign with HS256 algorithm like Shopify does
    const token = jwt.sign(payload, this.clientSecret, {
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
  verifySessionToken(token: string): SessionTokenPayload {
    try {
      const decoded = jwt.verify(token, this.clientSecret, {
        algorithms: ['HS256'],
      }) as SessionTokenPayload;

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid session token: ${errorMessage}`);
    }
  }

  /**
   * Generate a new session token with the same session but refreshed timestamps
   */
  refreshSessionToken(existingToken: string, expiresInSeconds = 60): string {
    const decoded = this.verifySessionToken(existingToken);
    
    const now = Math.floor(Date.now() / 1000);
    
    const refreshedPayload: SessionTokenPayload = {
      ...decoded,
      exp: now + expiresInSeconds,
      nbf: now,
      iat: now,
      jti: uuidv4(), // New JWT ID for the refreshed token
    };

    return jwt.sign(refreshedPayload, this.clientSecret, {
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
  static extractShopDomain(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as SessionTokenPayload;
      if (decoded && decoded.dest) {
        return new URL(decoded.dest).hostname;
      }
      return null;
    } catch {
      return null;
    }
  }
}