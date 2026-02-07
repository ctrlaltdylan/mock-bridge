import { MockShopifyAdminServer } from ".";

const APP_URL = process.env.SHOPIFY_APP_URL;
if (!APP_URL) throw new Error('SHOPIFY_APP_URL is not set');

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
if (!CLIENT_ID) throw new Error('SHOPIFY_CLIENT_ID is not set');

const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
if (!CLIENT_SECRET) throw new Error('SHOPIFY_CLIENT_SECRET is not set');

const SHOP = process.env.SHOPIFY_SHOP;
if (!SHOP) throw new Error('SHOPIFY_SHOP is not set');

const PORT = process.env.SHOPIFY_PORT;
if (!PORT) throw new Error('SHOPIFY_PORT is not set');

const DEBUG = process.env.SHOPIFY_DEBUG;
if (!DEBUG) throw new Error('SHOPIFY_DEBUG is not set');

const MOCK_USER_ID = process.env.MOCK_USER_ID;
if (!MOCK_USER_ID) throw new Error('MOCK_USER_ID is not set');

const server = new MockShopifyAdminServer({
  appUrl: APP_URL,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  userId: MOCK_USER_ID,
  shop: SHOP,
  port: Number(PORT),
  debug: DEBUG === 'true',
});

server.start();