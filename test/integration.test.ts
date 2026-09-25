import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}/vitest.config.mts`, import.meta.url));
const vitest = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));

async function runFixture(name: string, env: Record<string, string> = {}) {
  try {
    const { stdout } = await run(process.execPath, [vitest, 'run', '--config', fixture(name)], {
      env: { ...process.env, VITEST: undefined, NO_COLOR: '1', ...env },
    });
    return stdout;
  } catch (error) {
    const { stdout, stderr } = error as { stdout: string; stderr: string };
    throw new Error(`fixture "${name}" failed:\n${stdout}\n${stderr}`);
  }
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

async function polarisReachable() {
  try {
    return (await fetch('https://cdn.shopify.com/shopifycloud/polaris.js', { method: 'HEAD', signal: AbortSignal.timeout(5000) })).ok;
  } catch {
    return false;
  }
}

const chromiumInstalled = await hasChromium();
const online = await polarisReachable();

describe('Vitest integration (built dist)', { timeout: 120_000 }, () => {
  it('dist is built', () => {
    expect(existsSync(fileURLToPath(new URL('../dist/vite/index.mjs', import.meta.url))), 'run `npm run build:esm` first').toBe(true);
  });

  it('jsdom: installs a fresh bridge per test file', async () => {
    expect(await runFixture('jsdom')).toMatch(/Tests\s+6 passed/);
  });

  it('mock-bridge environment: page scripts see window.shopify', async () => {
    expect(await runFixture('environment')).toMatch(/Tests\s+2 passed/);
  });

  it.skipIf(!chromiumInstalled)('Browser Mode: the same tests pass in Chromium, with real Polaris', async () => {
    const output = await runFixture('browser', online ? {} : { MOCK_BRIDGE_OFFLINE: '1' });
    expect(output).toMatch(online ? /Tests\s+7 passed/ : /Tests\s+6 passed/);
  });
});
