/**
 * Mock Environment Detection Utility
 *
 * This utility detects when a Shopify app is running in a mock environment
 * and automatically loads the appropriate App Bridge library.
 */
export interface MockEnvironmentConfig {
    /** Timeout in milliseconds to wait for mock environment signal (default: 200ms) */
    timeout?: number;
    /** Enable debug logging (default: false) */
    debug?: boolean;
    /** Callback when mock environment is detected */
    onMockDetected?: (mockServerUrl: string) => void;
    /** Callback when real Shopify environment is detected */
    onShopifyDetected?: () => void;
}
/**
 * Automatically detects mock environment and loads appropriate App Bridge
 *
 * @param config Configuration options
 * @returns Promise that resolves when App Bridge is loaded
 */
export declare function setupAppBridge(config?: MockEnvironmentConfig): Promise<void>;
/**
 * Check if currently running in a mock environment
 * Note: This only works after setupAppBridge() has been called
 */
export declare function isMockEnvironment(): boolean;
/**
 * Get the mock server URL if running in mock environment
 */
export declare function getMockServerUrl(): string | null;
//# sourceMappingURL=mock-detector.d.ts.map