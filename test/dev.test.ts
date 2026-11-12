import { readFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const root = fileURLToPath(new URL('./fixtures/dev-app', import.meta.url));
const pluginPath = fileURLToPath(new URL('../dist/vite/index.js', import.meta.url));

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createNetServer().listen(0, () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    }).on('error', reject);
  });
}

async function hasChromium() {
  try {
    const { chromium } = await import('playwright');
    await (await chromium.launch()).close();
    return true;
  } catch {
    return false;
  }
}

const chromiumInstalled = await hasChromium();

describe('vite dev with mockBridge({ dev })', { timeout: 60_000 }, () => {
  let server: ViteDevServer;
  let appUrl: string;
  let adminUrl: string;

  beforeAll(async () => {
    // The plugin stays out of the way under Vitest; this test is `vite dev`.
    vi.stubEnv('VITEST', '');
    const { createServer } = await import('vite');
    const { mockBridge } = await import(pluginPath);
    const [vitePort, mockPort] = [await freePort(), await freePort()];
    appUrl = `http://localhost:${vitePort}`;
    adminUrl = `http://localhost:${mockPort}`;

    server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      server: { port: vitePort, strictPort: true },
      plugins: [mockBridge({ shop: 'dev.myshopify.com', dev: { port: mockPort } })],
    });
    await server.listen();
    await vi.waitFor(() => fetch(`${adminUrl}/api/config`), { timeout: 10_000 });
  });

  afterAll(async () => {
    await server?.close();
    vi.unstubAllEnvs();
  });

  it('starts the mock admin pointed at the Vite server', async () => {
    const config = await (await fetch(`${adminUrl}/api/config`)).json();
    expect(config).toMatchObject({ appUrl, shop: 'dev.myshopify.com' });
    expect((await fetch(`${adminUrl}/app-bridge.js`)).status).toBe(200);
  });

  it('serves index.html with the mock App Bridge instead of the CDN script', async () => {
    const html = await (await fetch(`${appUrl}/`)).text();
    expect(html).toContain(`${adminUrl}/app-bridge.js`);
    expect(html).not.toContain('cdn.shopify.com/shopifycloud/app-bridge.js');
  });

  it.skipIf(!chromiumInstalled)('runs the app inside the mock admin', async () => {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(`${adminUrl}/`);
      await page.locator('#app-iframe').waitFor({ state: 'attached' });
      const frame = await vi.waitFor(() => {
        const found = page.frames().find(f => f.url().startsWith(appUrl));
        if (!found) throw new Error('app frame not loaded');
        return found;
      }, { timeout: 10_000 });
      await frame.waitForFunction(() => (window as unknown as { results?: unknown }).results);

      expect(await frame.evaluate(() => (window as unknown as { results: unknown }).results))
        .toEqual({ shop: 'dev.myshopify.com', shopName: 'Mock Shop', token: 3 });
      await page.locator('.toast', { hasText: 'Hello from vite dev' }).waitFor({ timeout: 5000 });
    } finally {
      await browser.close();
    }
  });

  it.skipIf(!chromiumInstalled)('mirrors navigation, share sheets and app windows in the admin', async () => {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    type AppWindow = { show(): Promise<void>; contentWindow: Window | null };
    try {
      const page = await browser.newPage();
      const appFrame = (path = '/') => vi.waitFor(() => {
        const found = page.frames().find(f => f.url().startsWith(`${appUrl}${path}`) && f.name() !== 'app-window-editor');
        if (!found) throw new Error(`app frame at ${path} not loaded`);
        return found;
      }, { timeout: 10_000 });

      await page.goto(`${adminUrl}/`);
      let frame = await appFrame();
      await frame.waitForFunction(() => (window as unknown as { results?: unknown }).results);

      // The admin's URL follows the app's history, and deep links reload the app there.
      await frame.evaluate(() => history.pushState(null, '', '/settings?tab=general'));
      await page.waitForURL(/\/admin\/apps\/[^/]+\/settings\?tab=general$/);
      await page.reload();
      frame = await appFrame('/settings?tab=general');
      await frame.waitForFunction(() => window.shopify);

      // navigator.share() opens the admin's share sheet.
      const shared = frame.evaluate(() => navigator.share({ title: 'Fee rules', url: '/fees' }).then(() => 'shared', (error: Error) => error.name));
      await page.locator('.share-sheet', { hasText: 'Fee rules' }).waitFor();
      await page.getByRole('button', { name: 'Share', exact: true }).click();
      expect(await shared).toBe('shared');

      // <s-app-window> opens full screen, reachable through contentWindow.
      await frame.evaluate(() => {
        document.body.insertAdjacentHTML('beforeend', '<s-app-window id="editor" src="/editor"></s-app-window>');
      });
      await frame.waitForFunction(() => typeof (document.getElementById('editor') as unknown as AppWindow).show === 'function');
      expect(await frame.evaluate(async () => {
        const editor = document.getElementById('editor') as unknown as AppWindow & HTMLElement;
        editor.addEventListener('hide', () => { editor.dataset.closed = 'yes'; });
        await editor.show();
        return editor.contentWindow !== null;
      })).toBe(true);
      await page.locator('.app-window[data-app-window="editor"] iframe[name="app-window-editor"]').waitFor();
      await page.locator('.app-window').getByText('Close').click();
      await frame.waitForFunction(() => document.getElementById('editor')?.dataset.closed === 'yes');

      // The admin's nav menu follows the app's own links.
      await frame.evaluate(() => {
        document.body.insertAdjacentHTML('beforeend', '<ui-nav-menu><a href="/fees">Fees</a></ui-nav-menu>');
      });
      await page.locator('.navigation').getByText('Fees').click();
      await page.waitForURL(/\/admin\/apps\/[^/]+\/fees$/);

      // shopify://admin links leave the app for an admin page; back returns to the app.
      frame = await appFrame('/fees');
      await frame.waitForFunction(() => window.shopify);
      await frame.evaluate(() => {
        const link = Object.assign(document.createElement('a'), { href: 'shopify://admin/products', textContent: 'Products' });
        document.body.append(link);
        link.click();
      });
      await page.locator('.admin-page[data-admin-path="/products"]').waitFor();
      expect(new URL(page.url()).pathname).toBe('/admin/products');
      await page.goBack();
      await page.waitForURL(/\/admin\/apps\/[^/]+\/fees$/);
      await appFrame('/fees');
    } finally {
      await browser.close();
    }
  });

  it('stops the mock admin with the Vite server', async () => {
    await server.close();
    await vi.waitFor(async () => {
      await expect(fetch(`${adminUrl}/api/config`)).rejects.toThrow();
    }, { timeout: 5000 });
  });
});

describe('vite build with mockBridge({ dev: true })', () => {
  it('leaves the output untouched', async () => {
    const { build } = await import('vite');
    const { mockBridge } = await import(pluginPath);
    const outDir = join(tmpdir(), `mock-bridge-build-${process.pid}`);

    await build({ root, configFile: false, logLevel: 'silent', plugins: [mockBridge({ dev: true })], build: { outDir, emptyOutDir: true } });

    const html = await readFile(join(outDir, 'index.html'), 'utf8');
    expect(html).toContain('https://cdn.shopify.com/shopifycloud/app-bridge.js');
    expect(html).not.toMatch(/localhost|mock/i);
  });
});
