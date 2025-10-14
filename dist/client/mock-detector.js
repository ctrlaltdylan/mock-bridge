"use strict";
/**
 * Mock Environment Detection Utility
 *
 * This utility detects when a Shopify app is running in a mock environment
 * and automatically loads the appropriate App Bridge library.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAppBridge = setupAppBridge;
exports.isMockEnvironment = isMockEnvironment;
exports.getMockServerUrl = getMockServerUrl;
/**
 * Automatically detects mock environment and loads appropriate App Bridge
 *
 * @param config Configuration options
 * @returns Promise that resolves when App Bridge is loaded
 */
function setupAppBridge(config = {}) {
    const { timeout = 200, debug = false, onMockDetected, onShopifyDetected } = config;
    return new Promise((resolve, reject) => {
        let isResolved = false;
        let isMockEnvironment = false;
        let mockServerUrl = null;
        const log = (message, ...args) => {
            if (debug) {
                console.log(`[MockDetector] ${message}`, ...args);
            }
        };
        // Function to load Shopify CDN App Bridge
        const loadShopifyCDN = () => {
            if (isResolved)
                return;
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
        const loadMockAppBridge = (serverUrl) => {
            if (isResolved)
                return;
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
        const messageHandler = (event) => {
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
function isMockEnvironment() {
    return !!window.__mockShopifyEnvironment;
}
/**
 * Get the mock server URL if running in mock environment
 */
function getMockServerUrl() {
    return window.__mockShopifyEnvironment?.serverUrl || null;
}
// Mark environment as mock when detected (used by the functions above)
if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'MOCK_SHOPIFY_ENVIRONMENT') {
            window.__mockShopifyEnvironment = {
                serverUrl: event.data.mockServerUrl,
                shop: event.data.shop,
                clientId: event.data.clientId
            };
        }
    });
}
//# sourceMappingURL=mock-detector.js.map