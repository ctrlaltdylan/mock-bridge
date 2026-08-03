import '@shopify/shopify-api/adapters/web-api';
import { shopifyApi, Session, type ApiVersion } from '@shopify/shopify-api';
import type { shopifyApp } from '@shopify/shopify-app-react-router/server';

type ShopifyAppInstance = ReturnType<typeof shopifyApp>;

export type MockBridgeAuthReflectConfig = {
  apiKey: string | undefined;
  apiSecretKey: string;
  apiVersion: ApiVersion;
  scopes: string[] | undefined;
  appUrl: string;
  useOnlineTokens?: boolean;
  customShopDomains?: string[];
};

function sessionTokenFromRequest(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const url = new URL(request.url);
  return url.searchParams.get("id_token")?.trim() || undefined;
}

/** Resolves shop hostname from JWT `dest` (full URL or bare hostname). */
function shopHostnameFromDest(dest: string): string | undefined {
  try {
    return new URL(dest).hostname;
  } catch {
    try {
      return new URL(`https://${dest}`).hostname;
    } catch {
      return undefined;
    }
  }
}

function buildDecodeApi(config: MockBridgeAuthReflectConfig) {
  const appUrl = new URL(config.appUrl);
  const rawScheme = appUrl.protocol.replace(":", "") || "https";
  const hostScheme = rawScheme === "http" ? "http" : "https";
  return shopifyApi({
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
export function withMockBridgeAdminAuthForReactRouter(
  shopify: ShopifyAppInstance,
  reflectConfig: MockBridgeAuthReflectConfig,
): ShopifyAppInstance["authenticate"] {
  const baseAdmin = shopify.authenticate.admin.bind(shopify.authenticate);
  const storage = shopify.sessionStorage;

  if (!storage) {
    return shopify.authenticate;
  }

  const decodeApi = buildDecodeApi(reflectConfig);
  const scopeString = (reflectConfig.scopes ?? []).filter(Boolean).join(",");

  return {
    ...shopify.authenticate,
    admin: async (request: Request) => {
      if (process.env.SHOPIFY_MOCK_BRIDGE_AUTH !== "1") {
        return baseAdmin(request);
      }

      const token = sessionTokenFromRequest(request);
      if (!token || !reflectConfig.apiSecretKey) {
        return baseAdmin(request);
      }

      let payload: Awaited<
        ReturnType<typeof decodeApi.session.decodeSessionToken>
      >;
      try {
        payload = await decodeApi.session.decodeSessionToken(token);
      } catch {
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
        const mockSession = new Session({
          id: sessionId,
          shop,
          state: "mock-bridge-e2e",
          isOnline: Boolean(reflectConfig.useOnlineTokens),
          scope: scopeString,
          accessToken:
            process.env.SHOPIFY_MOCK_BRIDGE_ACCESS_TOKEN ?? "mock-access-token",
        });
        await storage.storeSession(mockSession);
      }

      return baseAdmin(request);
    },
  } as ShopifyAppInstance["authenticate"];
}
