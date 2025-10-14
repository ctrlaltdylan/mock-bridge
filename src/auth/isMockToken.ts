import jwt from 'jsonwebtoken';
import { STANDARD_MOCK_SECRET } from './constants';

/**
 * Check if a session token is a mock token by attempting to verify it with the mock secret
 * 
 * @param token - JWT session token to check
 * @param mockSecret - Mock client secret (defaults to standard mock secret)
 * @returns true if token is a mock token, false otherwise
 * 
 * @example
 * ```typescript
 * if (isMockToken(token)) {
 *   // Handle mock token - skip Shopify API calls
 *   console.log('Mock environment detected');
 * } else {
 *   // Handle real Shopify token
 *   console.log('Real Shopify environment');
 * }
 * ```
 */
export function isMockToken(
  token: string,
  mockSecret: string = STANDARD_MOCK_SECRET
): boolean {
  try {
    jwt.verify(token, mockSecret, { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if mock tokens should be enabled based on environment
 * 
 * @param developmentOnly - Whether mock tokens should only work in development (default: true)
 * @returns true if mock tokens should be enabled
 */
export function shouldEnableMockTokens(developmentOnly: boolean = true): boolean {
  if (!developmentOnly) {
    return true;
  }
  
  return process.env.NODE_ENV === 'development';
}