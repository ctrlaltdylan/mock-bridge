// Authentication utilities for backend integration
export {
  validateSessionToken,
  type AuthResult,
  type ValidateTokenOptions
} from './validateSessionToken';

export {
  isMockToken,
  shouldEnableMockTokens
} from './isMockToken';

export {
  STANDARD_MOCK_SECRET,
  STANDARD_MOCK_SHOP,
  STANDARD_MOCK_USER_ID
} from './constants';

export {
  createMockUser,
  createMockShopifyUser,
  type MockCurrentUser,
  type MockUserOptions
} from './createMockUser';

export {
  withMockTokenSupport,
  withMockTokenMiddleware,
  type MockTokenHandlerOptions
} from './withMockTokenSupport';

// Isomorphic (WebCrypto) session tokens
export {
  signJwt,
  verifyJwt,
  decodeJwt,
  signSessionToken,
  verifySessionToken,
  type SessionTokenPayload,
  type TokenGeneratorOptions
} from './jwt';