// Authentication utilities for backend integration
export {
  validateSessionToken,
  type AuthResult,
  type ValidateTokenOptions
} from './validateSessionToken.js';

export {
  isMockToken,
  shouldEnableMockTokens
} from './isMockToken.js';

export {
  STANDARD_MOCK_SECRET,
  STANDARD_MOCK_SHOP,
  STANDARD_MOCK_USER_ID
} from './constants.js';

export {
  createMockUser,
  createMockShopifyUser,
  type MockCurrentUser,
  type MockUserOptions
} from './createMockUser.js';

export {
  withMockTokenSupport,
  withMockTokenMiddleware,
  type MockTokenHandlerOptions
} from './withMockTokenSupport.js';

// Isomorphic (WebCrypto) session tokens
export {
  signJwt,
  verifyJwt,
  decodeJwt,
  signSessionToken,
  verifySessionToken,
  type SessionTokenPayload,
  type TokenGeneratorOptions
} from './jwt.js';