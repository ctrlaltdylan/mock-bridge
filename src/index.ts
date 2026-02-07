export { MockShopifyAdminServer } from './server';
export { TokenGenerator } from './auth/token-generator';
export { setupAppBridge, isMockEnvironment, getMockServerUrl } from './client/mock-detector';
export * from './types';
export type { MockEnvironmentConfig } from './client/mock-detector';

// Authentication utilities for backend integration
export * from './auth';

// Convenience function to quickly start a mock server
export async function startMockShopifyAdmin(config: {
  appUrl: string;
  clientId: string;
  clientSecret: string;
  port?: number;
  shop?: string;
  debug?: boolean;
}) {
  const { MockShopifyAdminServer } = await import('./server');

  const server = new MockShopifyAdminServer(config);
  await server.start();

  return server;
}