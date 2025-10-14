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
export function setupAppBridge(config: MockEnvironmentConfig = {}): Promise<void> {
  const {
    timeout = 200,
    debug = false,
    onMockDetected,
    onShopifyDetected
  } = config;

  return new Promise((resolve, reject) => {
    let isResolved = false;
    let isMockEnvironment = false;
    let mockServerUrl: string | null = null;

    const log = (message: string, ...args: any[]) => {
      if (debug) {
        console.log(`[MockDetector] ${message}`, ...args);
      }
    };

    // Function to load Shopify CDN App Bridge
    const loadShopifyCDN = () => {
      if (isResolved) return;
      
      log('Loading Shopify CDN App Bridge');
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
      cdnScript.onload = () => {
        log('Shopify CDN App Bridge loaded successfully');
        onShopifyDetected?.();
        isResolved = true;
        resolve();
      };
      cdnScript.onerror = () => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error('Failed to load Shopify App Bridge from CDN'));
        }
      };
      document.head.appendChild(cdnScript);
    };

    // Function to load mock App Bridge
    const loadMockAppBridge = (serverUrl: string) => {
      if (isResolved) return;
      
      log('Loading Mock App Bridge from:', serverUrl);
      const mockScript = document.createElement('script');
      mockScript.src = `${serverUrl}/app-bridge.js`;
      mockScript.onload = () => {
        log('Mock App Bridge loaded successfully');
        onMockDetected?.(serverUrl);
        isResolved = true;
        resolve();
      };
      mockScript.onerror = () => {
        log('Failed to load Mock App Bridge, falling back to CDN');
        loadShopifyCDN();
      };
      document.head.appendChild(mockScript);
    };

    // Listen for mock environment signal from parent frame
    const messageHandler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MOCK_SHOPIFY_ENVIRONMENT') {
        isMockEnvironment = true;
        mockServerUrl = event.data.mockServerUrl;
        log('Mock environment detected:', mockServerUrl);
        
        // Remove listener and load mock App Bridge
        window.removeEventListener('message', messageHandler);
        if (mockServerUrl) {
          loadMockAppBridge(mockServerUrl);
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // Wait for mock environment signal, then fall back to CDN
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      
      if (!isMockEnvironment && !isResolved) {
        log('No mock environment detected, loading Shopify CDN App Bridge');
        loadShopifyCDN();
      }
    }, timeout);
  });
}

/**
 * Check if currently running in a mock environment
 * Note: This only works after setupAppBridge() has been called
 */
export function isMockEnvironment(): boolean {
  return !!(window as any).__mockShopifyEnvironment;
}

/**
 * Get the mock server URL if running in mock environment
 */
export function getMockServerUrl(): string | null {
  return (window as any).__mockShopifyEnvironment?.serverUrl || null;
}

// Mark environment as mock when detected (used by the functions above)
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'MOCK_SHOPIFY_ENVIRONMENT') {
      (window as any).__mockShopifyEnvironment = {
        serverUrl: event.data.mockServerUrl,
        shop: event.data.shop,
        clientId: event.data.clientId
      };
    }
  });
}