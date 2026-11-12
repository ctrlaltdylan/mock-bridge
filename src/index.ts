export { MockShopifyAdminServer } from './server/index.js';
export { TokenGenerator } from './auth/token-generator.js';
export { setupAppBridge, isMockEnvironment, getMockServerUrl } from './client/mock-detector.js';
export * from './types/index.js';
export type { MockEnvironmentConfig } from './client/mock-detector.js';

// Authentication utilities for backend integration
export * from './auth/index.js';

// Convenience function to quickly start a mock server
export async function startMockShopifyAdmin(config: {
  appUrl: string;
  clientId: string;
  clientSecret: string;
  port?: number;
  shop?: string;
  debug?: boolean;
}) {
  const { MockShopifyAdminServer } = await import('./server/index.js');

  const server = new MockShopifyAdminServer(config);
  await server.start();

  return server;
}