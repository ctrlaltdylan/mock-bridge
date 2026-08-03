"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddedShopifyAppProvider = EmbeddedShopifyAppProvider;
/**
 * TypeScript-friendly alternative to `const Provider = mock ? A : B` (unions are not valid JSX components).
 */
const react_1 = __importDefault(require("react"));
const react_2 = require("@shopify/shopify-app-react-router/react");
const AppProvider_1 = require("./AppProvider");
function EmbeddedShopifyAppProvider({ embedded, apiKey, children, mockOrigin, }) {
    const origin = mockOrigin?.trim();
    if (origin) {
        const base = origin.replace(/\/$/, '');
        return react_1.default.createElement(AppProvider_1.MockBridgeAppProvider, {
            embedded,
            apiKey,
            appBridgeUrl: `${base}/app-bridge.js`,
            children,
        });
    }
    return react_1.default.createElement(react_2.AppProvider, { embedded, apiKey, children });
}
//# sourceMappingURL=EmbeddedShopifyAppProvider.js.map