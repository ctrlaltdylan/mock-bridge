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
exports.SHOPIFY_APP_BRIDGE_CDN = void 0;
exports.MockBridgeAppProvider = MockBridgeAppProvider;
/**
 * Mirrors @shopify/shopify-app-react-router AppProvider, with an optional App Bridge script URL.
 * Shopify's AppProvider always loads the CDN script and ignores unknown props such as __APP_BRIDGE_URL.
 */
const react_1 = __importStar(require("react"));
const react_router_1 = require("react-router");
exports.SHOPIFY_APP_BRIDGE_CDN = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
const POLARIS_CDN = 'https://cdn.shopify.com/shopifycloud/polaris.js';
function AppBridgeScript({ apiKey, src }) {
    const navigate = (0, react_router_1.useNavigate)();
    (0, react_1.useEffect)(() => {
        const handleNavigate = (event) => {
            const t = event.target;
            if (!t || !(t instanceof Element))
                return;
            const anchor = t instanceof HTMLAnchorElement ? t : t.closest('a');
            if (!(anchor instanceof HTMLAnchorElement))
                return;
            const href = anchor.href;
            if (href)
                navigate(href);
        };
        document.addEventListener('shopify:navigate', handleNavigate);
        return () => {
            document.removeEventListener('shopify:navigate', handleNavigate);
        };
    }, [navigate]);
    return react_1.default.createElement('script', {
        src,
        'data-api-key': apiKey,
    });
}
function MockBridgeAppProvider(props) {
    const nodes = [];
    if (props.embedded) {
        const { apiKey, appBridgeUrl } = props;
        const src = appBridgeUrl ?? exports.SHOPIFY_APP_BRIDGE_CDN;
        nodes.push(react_1.default.createElement(AppBridgeScript, {
            key: 'app-bridge',
            apiKey,
            src,
        }));
    }
    nodes.push(react_1.default.createElement('script', { key: 'polaris', src: POLARIS_CDN }));
    nodes.push(props.children);
    return react_1.default.createElement(react_1.default.Fragment, null, ...nodes);
}
//# sourceMappingURL=AppProvider.js.map