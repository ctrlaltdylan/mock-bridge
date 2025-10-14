"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockServerUrl = exports.isMockEnvironment = exports.setupAppBridge = exports.TokenGenerator = exports.MockShopifyAdminServer = void 0;
exports.startMockShopifyAdmin = startMockShopifyAdmin;
var server_1 = require("./server");
Object.defineProperty(exports, "MockShopifyAdminServer", { enumerable: true, get: function () { return server_1.MockShopifyAdminServer; } });
var token_generator_1 = require("./auth/token-generator");
Object.defineProperty(exports, "TokenGenerator", { enumerable: true, get: function () { return token_generator_1.TokenGenerator; } });
var mock_detector_1 = require("./client/mock-detector");
Object.defineProperty(exports, "setupAppBridge", { enumerable: true, get: function () { return mock_detector_1.setupAppBridge; } });
Object.defineProperty(exports, "isMockEnvironment", { enumerable: true, get: function () { return mock_detector_1.isMockEnvironment; } });
Object.defineProperty(exports, "getMockServerUrl", { enumerable: true, get: function () { return mock_detector_1.getMockServerUrl; } });
__exportStar(require("./types"), exports);
// Authentication utilities for backend integration
__exportStar(require("./auth"), exports);
// Convenience function to quickly start a mock server
async function startMockShopifyAdmin(config) {
    const { MockShopifyAdminServer } = await Promise.resolve().then(() => __importStar(require('./server')));
    const server = new MockShopifyAdminServer(config);
    await server.start();
    return server;
}
//# sourceMappingURL=index.js.map