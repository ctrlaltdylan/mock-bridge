"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMockTokenMiddleware = exports.withMockTokenSupport = exports.createMockShopifyUser = exports.createMockUser = exports.STANDARD_MOCK_USER_ID = exports.STANDARD_MOCK_SHOP = exports.STANDARD_MOCK_SECRET = exports.shouldEnableMockTokens = exports.isMockToken = exports.validateSessionToken = void 0;
// Authentication utilities for backend integration
var validateSessionToken_1 = require("./validateSessionToken");
Object.defineProperty(exports, "validateSessionToken", { enumerable: true, get: function () { return validateSessionToken_1.validateSessionToken; } });
var isMockToken_1 = require("./isMockToken");
Object.defineProperty(exports, "isMockToken", { enumerable: true, get: function () { return isMockToken_1.isMockToken; } });
Object.defineProperty(exports, "shouldEnableMockTokens", { enumerable: true, get: function () { return isMockToken_1.shouldEnableMockTokens; } });
var constants_1 = require("./constants");
Object.defineProperty(exports, "STANDARD_MOCK_SECRET", { enumerable: true, get: function () { return constants_1.STANDARD_MOCK_SECRET; } });
Object.defineProperty(exports, "STANDARD_MOCK_SHOP", { enumerable: true, get: function () { return constants_1.STANDARD_MOCK_SHOP; } });
Object.defineProperty(exports, "STANDARD_MOCK_USER_ID", { enumerable: true, get: function () { return constants_1.STANDARD_MOCK_USER_ID; } });
var createMockUser_1 = require("./createMockUser");
Object.defineProperty(exports, "createMockUser", { enumerable: true, get: function () { return createMockUser_1.createMockUser; } });
Object.defineProperty(exports, "createMockShopifyUser", { enumerable: true, get: function () { return createMockUser_1.createMockShopifyUser; } });
var withMockTokenSupport_1 = require("./withMockTokenSupport");
Object.defineProperty(exports, "withMockTokenSupport", { enumerable: true, get: function () { return withMockTokenSupport_1.withMockTokenSupport; } });
Object.defineProperty(exports, "withMockTokenMiddleware", { enumerable: true, get: function () { return withMockTokenSupport_1.withMockTokenMiddleware; } });
//# sourceMappingURL=index.js.map