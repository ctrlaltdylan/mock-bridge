import type { TestBridge, TestBridgeOptions } from '../testing/index.js';

export { createTestBridge } from '../testing/index.js';
export type {
  AdminHandler,
  AdminRequest,
  AppWindowState,
  FeatureCall,
  ModalState,
  NavigationEntry,
  NavigationState,
  NavItem,
  SaveBarState,
  ShareOutcome,
  ShareRequest,
  TestBridge,
  TestBridgeOptions,
  TitleBarAction,
  TitleBarGroup,
  TitleBarState,
  Toast,
} from '../testing/index.js';

/** Options the environment reads from `environmentOptions.mockBridge`. */
export interface MockBridgeEnvironmentOptions extends TestBridgeOptions {
  /**
   * Replacement bodies for scripts the page loads, keyed by URL; `null` loads the real script.
   * The App Bridge and Polaris CDN scripts are stubbed by default.
   */
  scripts?: Record<string, string | null>;
}

declare module 'vitest' {
  interface ProvidedContext {
    mockBridge?: TestBridgeOptions;
  }
}

/** Where the current test file's bridge lives, shared by the environment, setup file and tests. */
export const BRIDGE_KEY = '__mockBridge';

/** The bridge installed for the current test file. */
export function getMockBridge(): TestBridge {
  const bridge = (globalThis as Record<string, unknown>)[BRIDGE_KEY] as TestBridge | undefined;
  if (!bridge) {
    throw new Error('[mock-bridge] No bridge installed. Add mockBridge() from "@getverdict/mock-bridge/vite" to your Vitest plugins, or "@getverdict/mock-bridge/vitest/setup" to setupFiles.');
  }
  return bridge;
}

/** The current test file's bridge; safe to import before it is installed. */
export const bridge: TestBridge = new Proxy({} as TestBridge, {
  get(_, key) {
    const current = getMockBridge();
    const value = Reflect.get(current, key, current);
    return typeof value === 'function' ? value.bind(current) : value;
  },
});
