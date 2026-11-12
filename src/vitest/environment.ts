/**
 * Vitest environment: jsdom that runs the page's scripts, with `window.shopify`
 * installed before parsing and the App Bridge CDN script stubbed out.
 * Enabled with `mockBridge({ environment: 'mock-bridge' })`.
 */
import type { DOMWindow } from 'jsdom';
import { builtinEnvironments, type Environment } from 'vitest/runtime';
import { createTestBridge } from '../testing/index.js';
import { BRIDGE_KEY, type MockBridgeEnvironmentOptions } from './index.js';

const STUB = '/* @getverdict/mock-bridge: window.shopify is provided by the test environment */';

const PAGE_LOAD_TIMEOUT = 10_000;

const DEFAULT_SCRIPTS: Record<string, string | null> = {
  'https://cdn.shopify.com/shopifycloud/app-bridge.js': STUB,
  'https://cdn.shopify.com/shopifycloud/polaris.js': '/* @getverdict/mock-bridge: Polaris is not loaded in jsdom */',
};

type JSDOMModule = typeof import('jsdom');
type JSDOMOptions = Record<string, unknown> & { resources?: unknown; beforeParse?: (window: DOMWindow) => void };

/** Serves `scripts` in place of the real URLs, for both jsdom's resource APIs. */
function createResources(jsdom: JSDOMModule, userResources: unknown, scripts: Record<string, string | null>) {
  const stubFor = (url: string) => {
    const withoutQuery = url.split(/[?#]/)[0];
    return scripts[url] ?? scripts[withoutQuery] ?? undefined;
  };

  // jsdom >= 28: an options object with undici interceptors.
  if ('requestInterceptor' in jsdom) {
    const base = typeof userResources === 'object' && userResources ? userResources as { interceptors?: unknown[] } : {};
    const interceptor = (jsdom as unknown as { requestInterceptor: (fn: (request: Request) => Response | undefined) => unknown })
      .requestInterceptor(request => {
        const body = stubFor(request.url);
        return body === undefined ? undefined : new Response(body, { headers: { 'Content-Type': 'application/javascript' } });
      });
    return { ...base, interceptors: [interceptor, ...(base.interceptors ?? [])] };
  }

  // jsdom < 28: a ResourceLoader subclass.
  const { ResourceLoader } = jsdom as unknown as {
    ResourceLoader: new (options?: object) => { fetch(url: string, options: object): Promise<Buffer> | null };
  };
  class StubbingResourceLoader extends ResourceLoader {
    fetch(url: string, options: object) {
      const body = stubFor(url);
      return body === undefined ? super.fetch(url, options) : Promise.resolve(Buffer.from(body));
    }
  }
  return userResources instanceof ResourceLoader ? userResources : new StubbingResourceLoader();
}

export default {
  name: 'mock-bridge',
  viteEnvironment: 'client',
  async setup(global, options) {
    const { mockBridge = {}, jsdom: jsdomOptions = {} } = options as {
      mockBridge?: MockBridgeEnvironmentOptions;
      jsdom?: JSDOMOptions;
    };
    const { scripts, ...bridgeOptions } = mockBridge;
    const jsdom = await import('jsdom');
    const bridge = createTestBridge(bridgeOptions);
    const uninstalls: Array<() => void> = [];

    const environment = await builtinEnvironments.jsdom.setup(global, {
      ...options,
      jsdom: {
        ...jsdomOptions,
        runScripts: 'dangerously',
        resources: createResources(jsdom, jsdomOptions.resources, { ...DEFAULT_SCRIPTS, ...scripts }),
        beforeParse(window: DOMWindow) {
          (window as unknown as Record<string, unknown>)[BRIDGE_KEY] = bridge;
          uninstalls.push(bridge.install(window));
          jsdomOptions.beforeParse?.(window);
        },
      },
    });

    // Test code runs against Node's global, which proxies most of the window but keeps its own fetch.
    global[BRIDGE_KEY] = bridge;
    uninstalls.push(bridge.install(global));

    // Page scripts after an external <script> run once it loads; start tests after they have.
    const { window } = global.jsdom as { window: DOMWindow };
    if (window.document.readyState !== 'complete') {
      await new Promise<void>(resolve => {
        const timeout = setTimeout(resolve, PAGE_LOAD_TIMEOUT);
        window.addEventListener('load', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    }

    return {
      async teardown(global) {
        uninstalls.reverse().forEach(uninstall => uninstall());
        bridge.dispose();
        delete global[BRIDGE_KEY];
        await environment.teardown(global);
      },
    };
  },
} satisfies Environment;
