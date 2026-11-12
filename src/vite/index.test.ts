import { readFileSync } from 'node:fs';
import type { ConfigEnv, IndexHtmlTransformContext, UserConfig } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockBridge } from './index';

type Hook = (config: UserConfig, env: ConfigEnv) => Promise<UserConfig | undefined>;
const config = (plugin: ReturnType<typeof mockBridge>, user: UserConfig = {}, mode = 'test') =>
  (plugin.config as Hook)(user, { mode, command: 'serve' });

const html = '<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>';
const transform = (plugin: ReturnType<typeof mockBridge>, ctx: Partial<IndexHtmlTransformContext>) =>
  (plugin.transformIndexHtml as { handler(html: string, ctx: Partial<IndexHtmlTransformContext>): string }).handler(html, ctx);

describe('mockBridge()', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('adds the setup file, options and jsdom under Vitest', async () => {
    const result = await config(mockBridge({ shop: 'a.myshopify.com', scripts: { 'x.js': null } }));

    expect(result?.test?.setupFiles).toEqual([expect.stringMatching(/vitest\/setup\.js$/)]);
    expect(result?.test?.environment).toBe('jsdom');
    expect(result?.test?.provide).toEqual({ mockBridge: { shop: 'a.myshopify.com' } });
    expect(result?.test?.environmentOptions).toEqual({ mockBridge: { shop: 'a.myshopify.com', scripts: { 'x.js': null } } });
  });

  it('uses the mock-bridge environment by absolute path', async () => {
    expect((await config(mockBridge({ environment: 'mock-bridge' })))?.test?.environment).toMatch(/^\/.*vitest\/environment\.js$/);
  });

  it("leaves the user's environment and Browser Mode alone", async () => {
    expect((await config(mockBridge(), { test: { environment: 'happy-dom' } }))?.test).not.toHaveProperty('environment');
    expect((await config(mockBridge(), { test: { browser: { enabled: true } } }))?.test).not.toHaveProperty('environment');
  });

  it('browser: enables Browser Mode with Playwright Chromium and a Polaris tester page', async () => {
    const test = (await config(mockBridge({ browser: { headless: true } })))?.test;

    expect(test).not.toHaveProperty('environment');
    expect(test?.browser).toMatchObject({
      enabled: true,
      provider: expect.objectContaining({ name: 'playwright' }),
      instances: [{ browser: 'chromium' }],
      headless: true,
      testerHtmlPath: expect.stringMatching(/vitest\/tester\.html$/),
    });
    expect(readFileSync(test!.browser!.testerHtmlPath!, 'utf8')).toContain('https://cdn.shopify.com/shopifycloud/polaris.js');
  });

  it("browser: keeps the user's own browser settings", async () => {
    const provider = { name: 'custom' } as never;
    const user = { test: { browser: { provider, instances: [{ browser: 'firefox' as const }], testerHtmlPath: 'mine.html', headless: false } } };
    const browser = (await config(mockBridge({ browser: { headless: true } }), user))?.test?.browser;

    expect(browser).toEqual({ enabled: true });
  });

  it('browser: polaris: false uses Vitest\'s own tester page', async () => {
    expect((await config(mockBridge({ browser: { polaris: false } })))?.test?.browser).not.toHaveProperty('testerHtmlPath');
  });

  it('does nothing outside Vitest', async () => {
    vi.stubEnv('VITEST', '');
    expect(await config(mockBridge(), {}, 'development')).toBeUndefined();
  });

  it('only applies to the dev server, never to builds', () => {
    const apply = mockBridge({ dev: true }).apply as (config: UserConfig, env: ConfigEnv) => boolean;
    expect(apply({}, { command: 'serve', mode: 'development' })).toBe(true);
    expect(apply({}, { command: 'build', mode: 'production' })).toBe(false);
  });

  describe('dev', () => {
    const server = {} as IndexHtmlTransformContext['server'];
    const resolve = (plugin: ReturnType<typeof mockBridge>, isProduction = false) => {
      const logger = { warn: vi.fn() };
      (plugin.configResolved as (config: object) => void)({ isProduction, logger });
      return { plugin, logger };
    };

    it('swaps the App Bridge CDN script for the mock admin', () => {
      vi.stubEnv('VITEST', '');
      expect(transform(resolve(mockBridge({ dev: true })).plugin, { server })).toBe('<script src="http://localhost:3080/app-bridge.js"></script>');
      expect(transform(resolve(mockBridge({ dev: { port: 4000 } })).plugin, { server })).toContain('http://localhost:4000/app-bridge.js');
      expect(transform(resolve(mockBridge({ dev: { url: 'http://mock.test/' } })).plugin, { server })).toContain('http://mock.test/app-bridge.js');
    });

    it('is off unless enabled, outside the dev server, and under Vitest', () => {
      vi.stubEnv('VITEST', '');
      vi.stubEnv('MOCK_BRIDGE', '');
      expect(transform(resolve(mockBridge()).plugin, { server })).toBe(html);
      expect(transform(resolve(mockBridge({ dev: true })).plugin, {})).toBe(html);

      vi.stubEnv('VITEST', 'true');
      expect(transform(resolve(mockBridge({ dev: true })).plugin, { server })).toBe(html);
    });

    it('turns on with MOCK_BRIDGE', () => {
      vi.stubEnv('VITEST', '');
      vi.stubEnv('MOCK_BRIDGE', '1');
      expect(transform(resolve(mockBridge()).plugin, { server })).toContain('localhost:3080');
    });

    it('refuses production mode', () => {
      vi.stubEnv('VITEST', '');
      const { plugin, logger } = resolve(mockBridge({ dev: true }), true);
      expect(transform(plugin, { server })).toBe(html);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('disabled in production mode'));
    });
  });
});
