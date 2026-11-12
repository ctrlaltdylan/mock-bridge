/// <reference types="vitest/config" />
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';
import type { BrowserConfigOptions } from 'vitest/node';
import type { MockShopifyAdminServer } from '../server/index.js';
import type { AdminApiConfig } from '../types/index.js';
import type { MockBridgeEnvironmentOptions } from '../vitest/index.js';

export interface MockBridgeBrowserOptions {
  /** @default [{ browser: 'chromium' }] */
  instances?: BrowserConfigOptions['instances'];
  /** Load Polaris web components (`s-button`, `s-page`, ...) in the test page so they render. @default true */
  polaris?: boolean;
  /** @default Vitest's default */
  headless?: boolean;
}

export interface MockBridgeDevOptions {
  /** Port of the mock admin. @default 3080 */
  port?: number;
  /** Path the admin loads the app at, e.g. `'/app'`. @default '' */
  appPath?: string;
  /** The app's URL, when it isn't Vite's local URL (e.g. behind a proxy or in middleware mode). */
  appUrl?: string;
  /** How Admin API requests from the app are answered. @default 'mock' */
  adminApi?: AdminApiConfig;
  /** Use a mock-bridge server that's already running at this URL instead of starting one. */
  url?: string;
  /** Log mock admin requests. */
  debug?: boolean;
}

export interface MockBridgePluginOptions extends MockBridgeEnvironmentOptions {
  /**
   * Run tests in a real browser with Vitest Browser Mode instead of jsdom, using the
   * Playwright provider (`@vitest/browser-playwright` and `playwright` must be installed).
   * Browser settings already in the Vitest config take precedence.
   */
  browser?: boolean | MockBridgeBrowserOptions;
  /**
   * The Vitest environment to use when the config doesn't set one and Browser Mode is off:
   * - `'jsdom'`: plain jsdom; `window.shopify` is installed by the setup file.
   * - `'mock-bridge'`: jsdom that runs the page's scripts (`environmentOptions.jsdom.html`),
   *   with `window.shopify` installed before parsing and the App Bridge CDN script stubbed.
   * @default 'jsdom'
   */
  environment?: 'jsdom' | 'mock-bridge';
  /**
   * `vite dev`: start the mock admin next to Vite (http://localhost:3080) with the app
   * embedded, and load the mock App Bridge instead of Shopify's CDN script.
   * Never applies to `vite build`, and is refused in production mode.
   * @default process.env.MOCK_BRIDGE is set
   */
  dev?: boolean | MockBridgeDevOptions;
}

const APP_BRIDGE_CDN = /https:\/\/cdn\.shopify\.com\/shopifycloud\/app-bridge\.js/g;
const DEFAULT_DEV_PORT = 3080;

const resolveDist = (path: string) => fileURLToPath(new URL(path, import.meta.url));
// Shipped as source (package.json "files"), so it resolves the same from src/ and dist/.
const TESTER_HTML = resolveDist('../../src/vitest/tester.html');

async function playwrightProvider() {
  try {
    const { playwright } = await import('@vitest/browser-playwright');
    return playwright();
  } catch (error) {
    throw new Error(
      '[mock-bridge] mockBridge({ browser: true }) needs the Playwright provider: ' +
      'npm i -D @vitest/browser-playwright playwright && npx playwright install chromium',
      { cause: error },
    );
  }
}

/** Browser Mode settings the user hasn't set themselves. */
async function browserConfig(user: BrowserConfigOptions, options: MockBridgeBrowserOptions) {
  const config: BrowserConfigOptions = { enabled: true };
  if (!user.provider) config.provider = await playwrightProvider();
  if (!user.instances?.length) config.instances = options.instances ?? [{ browser: 'chromium' }];
  // A page that loads Polaris like the admin does; Vitest injects its tester scripts into it.
  if (!user.testerHtmlPath && options.polaris !== false) config.testerHtmlPath = TESTER_HTML;
  if (user.headless === undefined && options.headless !== undefined) config.headless = options.headless;
  return config;
}

/** The URL the app is served at, once Vite is listening. */
function viteUrl(server: ViteDevServer): string | undefined {
  const address = server.httpServer?.address() as AddressInfo | string | null | undefined;
  if (!address || typeof address === 'string') return undefined;
  const protocol = server.config.server.https ? 'https' : 'http';
  return `${protocol}://localhost:${address.port}${server.config.base.replace(/\/$/, '')}`;
}

/**
 * Mocks Shopify App Bridge.
 *
 * - Vitest: installs `window.shopify` and Admin API fetch routing for every test file,
 *   in jsdom or (with `browser`) a real browser.
 * - `vite dev` (with `dev`, or `MOCK_BRIDGE=1`): serves the app inside a mock Shopify admin.
 *
 * The plugin only applies to the dev server (which Vitest also uses); `vite build` output is untouched.
 */
export function mockBridge(options: MockBridgePluginOptions = {}): Plugin {
  const {
    browser,
    environment = 'jsdom',
    dev = !!process.env.MOCK_BRIDGE,
    scripts,
    ...bridgeOptions
  } = options;
  const devOptions: MockBridgeDevOptions | undefined = dev === true ? {} : dev || undefined;
  const mockAdminUrl = (devOptions?.url ?? `http://localhost:${devOptions?.port ?? DEFAULT_DEV_PORT}`).replace(/\/$/, '');
  let devEnabled = false;

  return {
    name: 'mock-bridge',
    // Vitest reads the browser settings in its own config hook, so ours must run first.
    enforce: 'pre',
    // Dev server and Vitest only: never part of a production build.
    apply: (_config, env) => env.command === 'serve',

    async config(config, env) {
      if (!process.env.VITEST && env.mode !== 'test') return;

      const test = config.test ?? {};
      const browserOptions = browser === true ? {} : browser || undefined;
      const inBrowser = !!(browserOptions || test.browser?.enabled);
      return {
        test: {
          setupFiles: [resolveDist('../vitest/setup.js')],
          provide: { mockBridge: bridgeOptions },
          environmentOptions: { mockBridge: { ...bridgeOptions, scripts } },
          ...(browserOptions && { browser: await browserConfig(test.browser ?? {}, browserOptions) }),
          ...(!test.environment && !inBrowser && {
            environment: environment === 'mock-bridge' ? resolveDist('../vitest/environment.js') : 'jsdom',
          }),
        },
      };
    },

    configResolved(config) {
      devEnabled = !!devOptions && !process.env.VITEST;
      if (devEnabled && config.isProduction) {
        config.logger.warn('[mock-bridge] The mock admin is disabled in production mode.');
        devEnabled = false;
      }
    },

    configureServer(server) {
      if (!devEnabled || !devOptions) return;
      const { logger } = server.config;

      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        printUrls();
        logger.info(`  ➜  Mock admin: ${mockAdminUrl}/`);
      };

      // An external mock-bridge server is managed by whoever started it.
      if (devOptions.url) return;

      let mockServer: MockShopifyAdminServer | undefined;
      const start = async () => {
        const appUrl = devOptions.appUrl ?? viteUrl(server);
        if (!appUrl) {
          logger.warn('[mock-bridge] Set dev.appUrl: the app URL is unknown without an HTTP server.');
          return;
        }
        // Loaded on demand: express and friends aren't needed for tests or builds.
        const { MockShopifyAdminServer } = await import('../server/index.js');
        const candidate = new MockShopifyAdminServer({
          appUrl,
          appPath: devOptions.appPath,
          port: devOptions.port ?? DEFAULT_DEV_PORT,
          adminApi: devOptions.adminApi,
          debug: devOptions.debug,
          shop: bridgeOptions.shop,
          clientId: bridgeOptions.apiKey,
          clientSecret: bridgeOptions.clientSecret,
          userId: bridgeOptions.userId,
          quiet: true,
        });
        try {
          await candidate.start();
          mockServer = candidate;
        } catch (error) {
          logger.error(`[mock-bridge] Couldn't start the mock admin at ${mockAdminUrl}: ${(error as Error).message}`);
        }
      };

      if (server.httpServer) {
        server.httpServer.once('listening', () => void start());
        server.httpServer.once('close', () => void mockServer?.stop());
      } else {
        void start();
      }
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!devEnabled || !ctx.server) return html;
        return html.replace(APP_BRIDGE_CDN, `${mockAdminUrl}/app-bridge.js`);
      },
    },
  };
}

export default mockBridge;
