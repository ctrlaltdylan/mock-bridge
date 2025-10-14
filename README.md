<div align="center">
  <img src="assets/img/mock-bridge-logo.png" alt="Mock Bridge Logo" width="200" />
  
  # Shopify Mock Bridge
  
  A comprehensive browser testing solution for Shopify embedded apps. Mock the Shopify Admin environment and App Bridge APIs locally without needing real Shopify credentials, captchas, or 2FA.
  
  [![npm version](https://badge.fury.io/js/@getverdict%2Fmock-bridge.svg)](https://www.npmjs.com/package/@getverdict/mock-bridge)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

## 🎯 Why Use This Package?

**Testing Shopify embedded apps is hard:**

- 🚫 Shopify Admin requires 2FA and captchas
- 🤖 Playwright/automation tools can't bypass security
- 🔒 Chrome DevTools MCP can't interact with your embedded Shopify app
- 🌐 CI/CD pipelines need internet and credentials
- 🐛 Manual testing in real admin is slow and unreliable

**This package solves all of that:**

- ✅ No captchas, 2FA, or real Shopify account needed
- ✅ Full Playwright and automation support
- ✅ Chrome MCP and DevTools compatibility
- ✅ Works offline and in CI/CD pipelines
- ✅ Real database integration for comprehensive testing

## 🗺️ Roadmap

### Core Features

- ✅ iFrame embed
- ✅ Session token issuance

### App Bridge APIs

- [ ] Direct admin API fetch overrides
- [ ] Toast implementation
- [ ] Resource picker
- [ ] Dynamic scopes

## 📦 Installation

```bash
npm install @getverdict/mock-bridge --save-dev
# or
yarn add @getverdict/mock-bridge --dev
# or
pnpm add @getverdict/mock-bridge --save-dev
```

## ⚡ Quick Start (2 Commands)

```bash
# 1. Install the package
npm install @getverdict/mock-bridge --save-dev

# 2. Start the mock (just provide your app URL)
npx @getverdict/mock-bridge http://localhost:3000
```

**That's it!** Your app is now running in a mock Shopify Admin at http://localhost:3080

## 🚀 Quick Start Guide

### Step 1: Start the Mock Server

#### Option A: One-Command Start (Recommended)

```bash
# Simplest - just provide your app URL
npx @getverdict/mock-bridge http://localhost:3000

# Auto-detects client ID from SHOPIFY_API_KEY environment variable
# Auto-detects common app paths and configurations
```

#### Option B: Configuration File

```bash
# Generate a config file
npx @getverdict/mock-bridge init

# Edit the generated mock.config.js, then run:
npx @getverdict/mock-bridge
```

```bash
# Add to package.json scripts for easy access
{
  "scripts": {
    "dev": "next dev",
    "mock:admin": "mock-bridge http://localhost:3000",
    "dev:mock": "concurrently \"npm run dev\" \"npm run mock:admin\""
  }
}
```

#### Option C: Programmatic API

If you need more control, you can still use the programmatic API:

```javascript
// scripts/start-mock-admin.js
const { MockShopifyAdminServer } = require("@verdict/mock-bridge");

async function startMockAdmin() {
  const server = new MockShopifyAdminServer({
    appUrl: "http://localhost:3000",
    clientId: process.env.SHOPIFY_API_KEY,
    clientSecret: "mock-secret-12345",
    port: 3080,
    debug: true,
  });

  await server.start();
  console.log("🎉 Mock Shopify Admin ready at http://localhost:3080");
}

startMockAdmin().catch(console.error);
```

### Step 2: Frontend Integration

Enable your app to detect and use the mock environment:

#### Option A: Automatic Detection (Recommended)

Replace your App Bridge script loading:

```html
<!-- Before: Direct CDN loading -->
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>

<!-- After: Smart loading with mock support -->
<script>
  // Check if we're in a mock environment
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedded = urlParams.get("embedded") === "1";
  const host = urlParams.get("host");

  let isMockEnvironment = false;

  // Detect mock environment from URL parameters
  if (isEmbedded && host) {
    try {
      const decodedHost = atob(host);
      if (
        decodedHost.includes("localhost") ||
        decodedHost.includes("mock") ||
        window.location.hostname === "localhost"
      ) {
        isMockEnvironment = true;
      }
    } catch (e) {
      // Ignore decode errors
    }
  }

  // Load appropriate App Bridge
  if (isMockEnvironment) {
    console.log("Loading Mock App Bridge");
    const script = document.createElement("script");
    script.src = "http://localhost:3080/app-bridge.js";
    script.onerror = () => {
      // Fallback to real CDN if mock fails
      const fallback = document.createElement("script");
      fallback.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  } else {
    console.log("Loading Real Shopify App Bridge");
    const script = document.createElement("script");
    script.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
    document.head.appendChild(script);
  }
</script>
```

#### Option B: Package Utility (TypeScript)

```typescript
// app.tsx or _app.tsx
import { setupAppBridge } from "@getverdict/mock-bridge/client";

useEffect(() => {
  setupAppBridge({
    debug: true,
    onMockDetected: (mockServerUrl) => {
      console.log("Mock environment detected:", mockServerUrl);
    },
    onShopifyDetected: () => {
      console.log("Real Shopify environment detected");
    },
  })
    .then(() => {
      console.log("App Bridge loaded successfully");
    })
    .catch(console.error);
}, []);
```

### Step 3: Backend Integration

Make your backend support mock session tokens alongside real ones:

#### Quick Integration (Replace existing JWT validation)

```typescript
// Before: Only real Shopify tokens
import { verifyShopifyJWT } from "./your-auth";

export async function authenticate(token: string) {
  const authData = await verifyShopifyJWT(token);
  // ... rest of auth logic
}
```

```typescript
// After: Support both real and mock tokens
import {
  validateSessionToken,
  createMockUser,
} from "@getverdict/mock-bridge/auth";

export async function authenticate(token: string) {
  const authData = await validateSessionToken(token, {
    shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!,
  });

  if (!authData) {
    throw new Error("Invalid token");
  }

  // Get shop from your database (same for both mock and real)
  const shop = await getShopByName(authData.shopName);
  if (!shop) {
    throw new Error("Shop not found");
  }

  if (authData.isMock) {
    // Mock environment - skip Shopify API calls
    return {
      shop,
      currentUser: createMockUser({
        shopName: authData.shopName,
        permissions: shop.settings?.defaultStaffPermissions,
      }),
      isMock: true,
    };
  } else {
    // Real environment - proceed with normal Shopify flow
    const currentUser = await exchangeTokenForUser(token, shop);
    return {
      shop,
      currentUser,
      isMock: false,
    };
  }
}
```

#### Framework-Specific Examples

**Next.js API Routes:**

```typescript
// pages/api/products.ts
import { validateSessionToken } from "@getverdict/mock-bridge/auth";

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  const authData = await validateSessionToken(token, {
    shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!,
  });

  if (!authData) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (authData.isMock) {
    // Return mock data for testing
    return res.json({
      products: [
        { id: "1", title: "Mock Product 1", price: "19.99" },
        { id: "2", title: "Mock Product 2", price: "29.99" },
      ],
    });
  } else {
    // Fetch real products from Shopify
    const products = await fetchShopifyProducts(authData.shopName);
    return res.json({ products });
  }
}
```

**Express.js Middleware:**

```typescript
import {
  validateSessionToken,
  createMockUser,
} from "@getverdict/mock-bridge/auth";

function createAuthMiddleware() {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    const authData = await validateSessionToken(token, {
      shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!,
    });

    if (!authData) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const shop = await getShopByName(authData.shopName);
    req.shop = shop;
    req.isMockAuth = authData.isMock;

    if (authData.isMock) {
      req.currentUser = createMockUser({ shopName: authData.shopName });
    } else {
      req.currentUser = await exchangeTokenForUser(token, shop);
    }

    next();
  };
}

app.use("/api/*", createAuthMiddleware());
```

### Step 4: Database Setup

Ensure your mock shop exists in the database:

```typescript
// Add this to your database seed or setup script
async function setupMockShop() {
  const mockShop = {
    name: "test-shop.myshopify.com",
    displayName: "Mock Test Shop",
    accessToken: "mock-access-token",
    active: true,
    settings: {
      defaultStaffPermissions: [
        "read_products",
        "write_products",
        "read_orders",
        "write_orders",
      ],
    },
  };

  await createOrUpdateShop(mockShop);
  console.log("Mock shop created for testing");
}

// Run during development setup
if (process.env.NODE_ENV === "development") {
  setupMockShop();
}
```

### Step 5: Start Development

```bash
# Option 1: CLI command (simplest)
npx @getverdict/mock-bridge http://localhost:3000

# Option 2: Package.json scripts
npm run dev:mock

# Option 3: Separate terminals
npm run dev                    # Terminal 1: Your app
npm run mock:admin            # Terminal 2: Mock admin
```

**Then navigate to:**

- **Your app**: http://localhost:3000
- **Mock Shopify Admin**: http://localhost:3080
- **Your app embedded in mock admin**: http://localhost:3080 (automatically embeds your app)

## 🖥️ CLI Reference

### Quick Commands

```bash
# Basic usage with auto-detection
npx @getverdict/mock-bridge http://localhost:3000

# If installed locally, you can use the shorter command:
# npm install @getverdict/mock-bridge --save-dev
# npx mock-bridge http://localhost:3000

# Full configuration
npx @getverdict/mock-bridge http://localhost:3000/shopify \
  --client-id your-client-id \
  --port 3080 \
  --debug

# Using config file
npx @getverdict/mock-bridge init           # Create config file
npx @getverdict/mock-bridge                # Use config file

# Help and version
npx @getverdict/mock-bridge --help
npx @getverdict/mock-bridge --version
```

### CLI Options

| Option            | Description                          | Default                         |
| ----------------- | ------------------------------------ | ------------------------------- |
| `[app-url]`       | Your app's URL (positional argument) | Auto-detected from package.json |
| `--client-id`     | Shopify app client ID                | `$SHOPIFY_API_KEY`              |
| `--client-secret` | Mock client secret                   | `"mock-secret-12345"`           |
| `--shop`          | Mock shop domain                     | `"test-shop.myshopify.com"`     |
| `--port`          | Mock admin port                      | `3080`                          |
| `--config`        | Config file path                     | `"mock.config.js"`              |
| `--debug`         | Enable debug logging                 | `false`                         |

### Environment Variables

The CLI automatically reads these environment variables:

```bash
SHOPIFY_API_KEY=your-client-id      # Used for --client-id
NODE_ENV=development                # Enables mock token support
```

### Configuration File

Generate a configuration file with `npx @getverdict/mock-bridge init`:

```javascript
// mock.config.js
module.exports = {
  appUrl: "http://localhost:3000/shopify", // Include path in URL
  clientId: process.env.SHOPIFY_API_KEY,
  clientSecret: "mock-secret-12345",
  port: 3080,
  shop: "test-shop.myshopify.com",
  debug: true,
  scopes: ["read_products", "write_products", "read_orders", "write_orders"],
};
```

## 🎭 How It Works

### Architecture Overview

```
┌─────────────────────────────────────┐
│   Mock Shopify Admin (Port 3080)   │
│  ┌─────────────────────────────┐   │
│  │     Shopify Admin UI         │   │
│  │     (Navigation, etc.)       │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │   Your App (iframe)          │   │  ← Embedded like real Shopify
│  │   - Mock App Bridge loaded   │   │
│  │   - Gets mock session tokens │   │
│  │   - Makes API calls to your  │   │
│  │     backend                  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
         ↕ PostMessage API
┌─────────────────────────────────────┐
│    Your Backend                     │
│    - Validates mock tokens          │  ← Same backend, enhanced auth
│    - Skips Shopify API calls        │
│    - Uses real database             │
│    - Returns mock/real data         │
└─────────────────────────────────────┘
```

### Mock vs Real Flow

**Mock Environment (Testing):**

1. Mock admin serves your app in iframe
2. Mock App Bridge provides session tokens
3. Your frontend makes API calls to your backend
4. Backend detects mock tokens and skips Shopify APIs
5. Returns mock data or uses database directly

**Real Environment (Production):**

1. Real Shopify admin serves your app in iframe
2. Real App Bridge provides session tokens
3. Your frontend makes API calls to your backend
4. Backend detects real tokens and calls Shopify APIs
5. Returns real data from Shopify

## 🔧 Configuration Options

### Mock Server Configuration

```typescript
const server = new MockShopifyAdminServer({
  // Required
  appUrl: "http://localhost:3000/shopify", // Your app's URL (with path)
  clientId: "your-shopify-client-id", // Your Shopify app's client ID
  clientSecret: "mock-secret-12345", // Mock secret (dev only)

  // Optional
  port: 3080, // Mock admin port
  shop: "test-shop.myshopify.com", // Mock shop domain
  apiVersion: "2024-01", // Shopify API version
  scopes: [
    // Your app's scopes
    "read_products",
    "write_products",
    "read_orders",
    "write_orders",
  ],
  debug: true, // Enable debug logging
});
```

### Authentication Options

```typescript
const authData = await validateSessionToken(token, {
  shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!, // Required
  mockSecret: "custom-mock-secret", // Optional
  developmentOnly: true, // Only try mock in dev
});
```

### Mock User Options

```typescript
const mockUser = createMockUser({
  shopName: "test-shop.myshopify.com",
  userId: "123456789", // Custom user ID
  email: "test@shop.com", // Custom email
  firstName: "Test", // Custom first name
  lastName: "User", // Custom last name
  permissions: ["read_products"], // Custom permissions
  additionalProps: {
    // Any additional props
    posBillingTermsAcceptedAt: new Date(),
    customField: "value",
  },
});
```

## 🎪 Testing with Automation Tools

### Playwright Example

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { MockShopifyAdminServer } from "@getverdict/mock-bridge";

let mockServer: MockShopifyAdminServer;

export default defineConfig({
  globalSetup: async () => {
    mockServer = new MockShopifyAdminServer({
      appUrl: "http://localhost:3000",
      clientId: "test-client-id",
      clientSecret: "mock-secret-12345",
      port: 3080,
    });
    await mockServer.start();
  },

  globalTeardown: async () => {
    await mockServer?.stop();
  },

  use: {
    baseURL: "http://localhost:3080",
  },
});
```

```typescript
// tests/app.spec.ts
import { test, expect } from "@playwright/test";

test("should load app in mock Shopify admin", async ({ page }) => {
  await page.goto("/");

  // Wait for app to load in iframe
  const appFrame = page.frameLocator("#app-iframe");

  // Test your app functionality
  await expect(appFrame.locator("h1")).toContainText("Your App Title");

  // Test App Bridge actions
  await appFrame.locator('button:has-text("Show Toast")').click();
  await expect(page.locator(".toast")).toContainText("Success!");

  // Test API calls
  await appFrame.locator('button:has-text("Load Products")').click();
  await expect(appFrame.locator(".product-list")).toBeVisible();
});

test("should handle authentication", async ({ page }) => {
  await page.goto("/");

  const appFrame = page.frameLocator("#app-iframe");

  // Your app should be authenticated automatically
  await expect(appFrame.locator(".user-info")).toContainText("Mock User");
  await expect(appFrame.locator(".shop-info")).toContainText(
    "test-shop.myshopify.com"
  );
});
```

### Jest Integration Testing

```typescript
// tests/api.test.ts
import { MockShopifyAdminServer } from "@getverdict/mock-bridge";
import {
  createMockUser,
  validateSessionToken,
} from "@verdict/shopify-app-bridge-mock/auth";

describe("API with Mock Tokens", () => {
  let mockServer: MockShopifyAdminServer;

  beforeAll(async () => {
    mockServer = new MockShopifyAdminServer({
      appUrl: "http://localhost:3000",
      clientId: "test-client",
      clientSecret: "mock-secret-12345",
    });
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  it("should authenticate with mock token", async () => {
    // Generate mock token
    const token = mockServer.tokenGenerator.generateSessionToken({
      shop: "test-shop.myshopify.com",
      clientId: "test-client",
      clientSecret: "mock-secret-12345",
    });

    // Test authentication
    const authData = await validateSessionToken(token, {
      shopifySecret: "real-secret",
      mockSecret: "mock-secret-12345",
    });

    expect(authData?.isMock).toBe(true);
    expect(authData?.shopName).toBe("test-shop.myshopify.com");
  });

  it("should create mock users", async () => {
    const mockUser = createMockUser({
      shopName: "test-shop.myshopify.com",
      permissions: ["read_products"],
    });

    expect(mockUser.email).toBe("mock@test-shop.com");
    expect(mockUser.permissions).toContain("read_products");
  });
});
```

## 🛡️ Security Considerations

### Development Only

Mock tokens are designed for development and testing only:

```typescript
// ✅ Good: Mock tokens only in development
const authData = await validateSessionToken(token, {
  shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!,
  developmentOnly: true, // Default: true
});

// ❌ Bad: Never allow mock tokens in production
const authData = await validateSessionToken(token, {
  shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!,
  developmentOnly: false, // Don't do this!
});
```

### Environment Variables

Keep mock secrets out of production:

```bash
# .env.local (development only)
SHOPIFY_API_PRIVATE_KEY=your-real-shopify-secret
MOCK_SECRET=mock-secret-12345

# .env.production (no mock secrets)
SHOPIFY_API_PRIVATE_KEY=your-real-shopify-secret
# No MOCK_SECRET in production!
```

### Database Requirements

Mock tokens still require valid shops in your database:

```typescript
// Always verify shop exists, even for mock tokens
const authData = await validateSessionToken(token, options);
if (authData) {
  const shop = await getShopByName(authData.shopName);
  if (!shop) {
    // Reject both mock and real tokens if shop doesn't exist
    throw new Error("Shop not found");
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**App not loading in mock admin:**

- Check CSP headers allow iframe embedding
- Verify your app URL is correct in mock config
- Ensure your app accepts `embedded=1` parameter

**Mock tokens not working:**

- Verify `NODE_ENV=development`
- Check mock secret matches between frontend and backend
- Ensure shop exists in your database

**Real tokens broken:**

- Verify `SHOPIFY_API_PRIVATE_KEY` is set correctly
- Check that real secret is passed to `validateSessionToken`
- Ensure your existing Shopify auth flow is preserved

### Debug Mode

Enable debug logging to troubleshoot:

```typescript
// Mock server with debug
const server = new MockShopifyAdminServer({
  // ... config
  debug: true,
});

// Frontend with debug
setupAppBridge({
  debug: true,
  onMockDetected: (url) => console.log("Mock detected:", url),
  onShopifyDetected: () => console.log("Real Shopify detected"),
});
```

### Environment Check

Verify your environment setup:

```typescript
// Add to your app startup
console.log("Environment:", process.env.NODE_ENV);
console.log("Has Shopify Secret:", !!process.env.SHOPIFY_API_PRIVATE_KEY);
console.log("Mock tokens enabled:", process.env.NODE_ENV === "development");
```

## 📚 API Reference

### Authentication Functions

#### `validateSessionToken(token, options)`

Universal validator for both real and mock tokens.

**Parameters:**

- `token: string` - JWT session token
- `options.shopifySecret: string` - Real Shopify client secret
- `options.mockSecret?: string` - Mock secret (default: "mock-secret-12345")
- `options.developmentOnly?: boolean` - Only try mock tokens in development (default: true)

**Returns:** `AuthResult | false`

#### `isMockToken(token, mockSecret?)`

Quick check if token is a mock token.

**Returns:** `boolean`

#### `createMockUser(options?)`

Generate mock user objects for testing.

**Returns:** `MockCurrentUser`

#### `withMockTokenSupport(authFunction, shopifySecret, options?)`

Wrapper to add mock support to existing auth functions.

### Server Classes

#### `MockShopifyAdminServer`

Main mock server class.

**Methods:**

- `start()` - Start the mock server
- `stop()` - Stop the mock server
- `getConfig()` - Get server configuration

### Client Utilities

#### `setupAppBridge(options?)`

Automatically detect mock environment and load appropriate App Bridge.

**Returns:** `Promise<void>`

For complete API documentation, see [Backend Integration Guide](./docs/BACKEND_INTEGRATION.md).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup

```bash
git clone <repository>
cd packages/shopify-app-bridge-mock
pnpm install
pnpm build
pnpm test
```

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built for the Shopify developer community
- Inspired by the need for better testing tools
- Thanks to all contributors and users

---

**Made with ❤️ for Shopify developers who want to test without pain**
