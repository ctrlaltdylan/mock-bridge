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

// Re-export token generator types for convenience
export {
  type SessionTokenPayload,
  type TokenGeneratorOptions
} from '../auth/token-generator';