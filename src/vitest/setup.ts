/**
 * Vitest setup file: installs the mock `window.shopify` for each test file.
 * Added automatically by `mockBridge()` from `@getverdict/mock-bridge/vite`.
 */
import { afterAll, afterEach, beforeEach, inject } from 'vitest';
import { createTestBridge, type TestBridge } from '../testing';
import { BRIDGE_KEY } from './index';

const scope = globalThis as Record<string, unknown>;

function installBridge(): TestBridge {
  const created = createTestBridge(inject('mockBridge'));
  const uninstall = created.install(globalThis);
  scope[BRIDGE_KEY] = created;
  afterAll(() => {
    uninstall();
    created.dispose();
    delete scope[BRIDGE_KEY];
  });
  return created;
}

// The mock-bridge environment installs the bridge before the page parses; otherwise do it here.
const bridge = (scope[BRIDGE_KEY] as TestBridge | undefined) ?? installBridge();

// Handlers registered at the top level or in beforeAll persist; ones added during a test don't.
let checkpointed = false;
beforeEach(() => {
  if (!checkpointed) bridge.checkpoint();
  checkpointed = true;
});
afterEach(() => bridge.reset());
