"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMockBridgeAdminAuthForReactRouter = withMockBridgeAdminAuthForReactRouter;
require("@shopify/shopify-api/adapters/web-api");
const shopify_api_1 = require("@shopify/shopify-api");
function sessionTokenFromRequest(request) {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer "))
        return auth.slice(7).trim();
    const url = new URL(request.url);
    return url.searchParams.get("id_token")?.trim() || undefined;
}
/** Resolves shop hostname from JWT `dest` (full URL or bare hostname). */
function shopHostnameFromDest(dest) {
    try {
        return new URL(dest).hostname;
    }
    catch {
        try {
            return new URL(`https://${dest}`).hostname;
        }
        catch {
            return undefined;
        }
    }
}
function buildDecodeApi(config) {
    const appUrl = new URL(config.appUrl);
    const rawScheme = appUrl.protocol.replace(":", "") || "https";
    const hostScheme = rawScheme === "http" ? "http" : "https";
    return (0, shopify_api_1.shopifyApi)({
        apiKey: config.apiKey || "",
        apiSecretKey: config.apiSecretKey,
        apiVersion: config.apiVersion,
        scopes: config.scopes ?? [],
        hostName: appUrl.host,
        hostScheme,
        isEmbeddedApp: true,
        ...(config.customShopDomains?.length
            ? { customShopDomains: config.customShopDomains }
            : {}),
    });
}
/**
 * When SHOPIFY_MOCK_BRIDGE_AUTH=1, wraps authenticate.admin only; webhook and other methods unchanged.
 */
function withMockBridgeAdminAuthForReactRouter(shopify, reflectConfig) {
    const baseAdmin = shopify.authenticate.admin.bind(shopify.authenticate);
    const storage = shopify.sessionStorage;
    if (!storage) {
        return shopify.authenticate;
    }
    const decodeApi = buildDecodeApi(reflectConfig);
    const scopeString = (reflectConfig.scopes ?? []).filter(Boolean).join(",");
    return {
        ...shopify.authenticate,
        admin: async (request) => {
            if (process.env.SHOPIFY_MOCK_BRIDGE_AUTH !== "1") {
                return baseAdmin(request);
            }
            const token = sessionTokenFromRequest(request);
            if (!token || !reflectConfig.apiSecretKey) {
                return baseAdmin(request);
            }
            let payload;
            try {
                payload = await decodeApi.session.decodeSessionToken(token);
            }
            catch {
                return baseAdmin(request);
            }
            const dest = payload.dest;
            if (typeof dest !== "string" || !payload.sub) {
                return baseAdmin(request);
            }
            const shop = shopHostnameFromDest(dest.trim());
            if (!shop) {
                return baseAdmin(request);
            }
            const sessionId = reflectConfig.useOnlineTokens
                ? decodeApi.session.getJwtSessionId(shop, String(payload.sub))
                : decodeApi.session.getOfflineId(shop);
            const existing = await storage.loadSession(sessionId);
            const withinMs = 5 * 60 * 1000;
            if (!existing?.isActive(undefined, withinMs)) {
                const mockSession = new shopify_api_1.Session({
                    id: sessionId,
                    shop,
                    state: "mock-bridge-e2e",
                    isOnline: Boolean(reflectConfig.useOnlineTokens),
                    scope: scopeString,
                    accessToken: process.env.SHOPIFY_MOCK_BRIDGE_ACCESS_TOKEN ?? "mock-access-token",
                });
                await storage.storeSession(mockSession);
            }
            return baseAdmin(request);
        },
    };
}
//# sourceMappingURL=withMockBridgeAdminAuthForReactRouter.js.map