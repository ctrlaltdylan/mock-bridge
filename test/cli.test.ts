import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';

const cli = fileURLToPath(new URL('../dist/cli/index.js', import.meta.url));
const running: ChildProcess[] = [];

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer().listen(0, () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    }).on('error', reject);
  });
}

async function startCli(args: string[], cwd?: string) {
  cwd ??= await mkdtemp(join(tmpdir(), 'mock-bridge-cli-'));
  const child = spawn(process.execPath, [cli, ...args], { cwd, env: { ...process.env, SHOPIFY_API_KEY: '' } });
  running.push(child);
  return cwd;
}

const config = (port: number) => vi.waitFor(async () => (await fetch(`http://localhost:${port}/api/config`)).json(), { timeout: 10_000 });

afterEach(() => {
  running.splice(0).forEach(child => child.kill());
});

describe('mock-bridge CLI', { timeout: 20_000 }, () => {
  it("uses the config file's port", async () => {
    const port = await freePort();
    const cwd = await mkdtemp(join(tmpdir(), 'mock-bridge-config-'));
    const file = join(cwd, 'mock.config.json');
    await writeFile(file, JSON.stringify({ appUrl: 'http://localhost:1', port, clientId: 'from-config' }));

    await startCli(['--config', file]);

    expect(await config(port)).toMatchObject({ clientId: 'from-config' });
  });

  it('lets --port override the config file', async () => {
    const [configPort, flagPort] = [await freePort(), await freePort()];
    const cwd = await mkdtemp(join(tmpdir(), 'mock-bridge-config-'));
    const file = join(cwd, 'mock.config.mjs');
    await writeFile(file, `export default { appUrl: 'http://localhost:1', port: ${configPort} };`);

    await startCli(['--config', file, '--port', String(flagPort)]);

    expect(await config(flagPort)).toMatchObject({ appUrl: 'http://localhost:1' });
  });

  it('init writes a config file that loads in an ES module project', async () => {
    const port = await freePort();
    const cwd = await mkdtemp(join(tmpdir(), 'mock-bridge-init-'));
    await writeFile(join(cwd, 'package.json'), JSON.stringify({ type: 'module' }));
    await promisify(execFile)(process.execPath, [cli, 'init'], { cwd });

    await startCli(['--config', 'mock.config.mjs', '--port', String(port)], cwd);

    expect(await config(port)).toMatchObject({ appUrl: 'http://localhost:3000/shopify' });
  });

  it('rejects token exchanges whose body it cannot parse as an invalid client', async () => {
    const port = await freePort();
    await startCli(['http://localhost:1', '--port', String(port)]);
    await config(port);

    const post = (path: string) => fetch(`http://localhost:${port}${path}`, { method: 'POST', body: 'client_id=x', headers: { 'content-type': 'text/plain' } });
    const exchange = await post('/admin/oauth/access_token');
    expect(exchange.status).toBe(401);
    expect(await exchange.json()).toEqual({ error: 'invalid_client' });
    expect((await post('/mock-admin-api')).status).toBe(400);
  });
});
