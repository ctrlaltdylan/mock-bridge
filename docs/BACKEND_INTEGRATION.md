# Backend Integration Guide

This guide explains how to integrate mock session token support into any Shopify app backend. The authentication utilities provided by this package allow your backend to seamlessly handle both real Shopify tokens and mock tokens for testing, with minimal code changes.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Implementation Patterns](#implementation-patterns)
- [Framework Examples](#framework-examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Installation

```bash
npm install @verdict/shopify-app-bridge-mock --save-dev
```

### 2. Basic Token Validation

Replace your existing Shopify JWT validation:

```typescript
// Before: Only real Shopify tokens
const authData = await isValidShopifySessionJWT(token);

// After: Both real and mock tokens
import { validateSessionToken } from '@verdict/shopify-app-bridge-mock/auth';

const authData = await validateSessionToken(token, {
  shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!
});

if (authData?.isMock) {
  // Handle mock token - skip Shopify API calls
} else {
  // Handle real token - normal Shopify flow
}
```

### 3. Complete Authentication Flow

```typescript
import { 
  validateSessionToken, 
  createMockUser 
} from '@verdict/shopify-app-bridge-mock/auth';

async function authenticate(token: string) {
  const authData = await validateSessionToken(token, {
    shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!
  });

  if (!authData) {
    throw new Error('Invalid token');
  }

  const shop = await getShopByName(authData.shopName);
  if (!shop) {
    throw new Error('Shop not found');
  }

  if (authData.isMock) {
    // Mock authentication - no Shopify API calls
    return {
      shop,
      currentUser: createMockUser({
        shopName: authData.shopName,
        permissions: shop.settings?.defaultStaffPermissions
      }),
      isMock: true
    };
  } else {
    // Real authentication - proceed with Shopify APIs
    const currentUser = await exchangeTokenForUser(token, shop);
    return {
      shop,
      currentUser,
      isMock: false
    };
  }
}
```

## Core Concepts

### Mock vs Real Tokens

The package generates JWT tokens that have the same structure as real Shopify session tokens, but are signed with a different secret. This allows your backend to:

1. **Detect mock tokens** using the mock secret
2. **Skip Shopify API calls** for mock tokens
3. **Use real database lookups** to maintain data consistency
4. **Create mock user objects** for testing

### Token Validation Flow

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Token     │───▶│ Try Mock Secret │───▶│ Mock Token?     │
│   Received  │    │ (Development)   │    │ Skip Shopify    │
└─────────────┘    └─────────────────┘    │ API calls       │
                           │                └─────────────────┘
                           ▼
                   ┌─────────────────┐    ┌─────────────────┐
                   │ Try Real Secret │───▶│ Real Token?     │
                   │ (Always)        │    │ Normal Shopify  │
                   └─────────────────┘    │ flow            │
                                          └─────────────────┘
```

### Security Model

- **Development Only**: Mock tokens only work when `NODE_ENV === 'development'`
- **Fixed Secret**: Mock tokens use a known secret that should never be in production
- **Database Required**: Mock tokens still require the shop to exist in your database
- **No OAuth Bypass**: Mock tokens don't bypass your shop/user authorization logic

## Implementation Patterns

### Pattern 1: Universal Validator (Recommended)

Replace your existing JWT validation with the universal validator:

```typescript
// auth/validateToken.ts
import { validateSessionToken } from '@verdict/shopify-app-bridge-mock/auth';

export async function validateToken(token: string) {
  return await validateSessionToken(token, {
    shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!
  });
}

// middleware/auth.ts
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const authData = await validateToken(token);
  
  if (!authData) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.authData = authData;
  next();
}
```

### Pattern 2: Wrapper Function

Wrap your existing authentication function:

```typescript
import { withMockTokenSupport } from '@verdict/shopify-app-bridge-mock/auth';

// Your existing auth function
async function originalAuth(token: string) {
  // Your existing Shopify authentication logic
}

// Enhanced with mock support
const enhancedAuth = withMockTokenSupport(
  originalAuth,
  process.env.SHOPIFY_API_PRIVATE_KEY!,
  {
    getShopData: (shopName) => getShopByName(shopName),
    onMockToken: (authResult) => createMockUser({
      shopName: authResult.shopName
    })
  }
);
```

### Pattern 3: Conditional Logic

Add mock detection to your existing flow:

```typescript
import { isMockToken } from '@verdict/shopify-app-bridge-mock/auth';

async function authenticate(token: string) {
  if (isMockToken(token)) {
    // Handle mock token
    const decoded = jwt.verify(token, mockSecret);
    const shop = await getShopByName(decoded.dest.replace('https://', ''));
    return {
      shop,
      currentUser: createMockUser({ shopName: shop.name }),
      isMock: true
    };
  } else {
    // Handle real token
    return await originalShopifyAuth(token);
  }
}
```

## Framework Examples

### Next.js API Routes

```typescript
// pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSessionToken } from '@verdict/shopify-app-bridge-mock/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  const authData = await validateSessionToken(token, {
    shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!
  });

  if (!authData) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Shop lookup is the same for both mock and real tokens
  const shop = await getShopByName(authData.shopName);
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  res.json({
    shop: shop.name,
    isMock: authData.isMock,
    user: authData.isMock 
      ? createMockUser({ shopName: authData.shopName })
      : await getShopifyUser(token, shop)
  });
}
```

### Express.js Middleware

```typescript
import express from 'express';
import { validateSessionToken, createMockUser } from '@verdict/shopify-app-bridge-mock/auth';

function createAuthMiddleware() {
  return async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const authData = await validateSessionToken(token, {
        shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!
      });

      if (!authData) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const shop = await getShopByName(authData.shopName);
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      // Add auth data to request
      req.shop = shop;
      req.isMockAuth = authData.isMock;
      
      if (authData.isMock) {
        req.currentUser = createMockUser({
          shopName: authData.shopName,
          permissions: shop.settings?.defaultStaffPermissions
        });
      } else {
        req.currentUser = await exchangeTokenForUser(token, shop);
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

const app = express();
app.use('/api/protected/*', createAuthMiddleware());
```

### Fastify Plugin

```typescript
import fastify from 'fastify';
import { validateSessionToken, createMockUser } from '@verdict/shopify-app-bridge-mock/auth';

async function authPlugin(fastify: any) {
  fastify.decorateRequest('shop', null);
  fastify.decorateRequest('currentUser', null);
  fastify.decorateRequest('isMockAuth', false);

  fastify.addHook('preHandler', async (request: any, reply: any) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      reply.code(401).send({ error: 'No token provided' });
      return;
    }

    const authData = await validateSessionToken(token, {
      shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!
    });

    if (!authData) {
      reply.code(401).send({ error: 'Invalid token' });
      return;
    }

    const shop = await getShopByName(authData.shopName);
    if (!shop) {
      reply.code(404).send({ error: 'Shop not found' });
      return;
    }

    request.shop = shop;
    request.isMockAuth = authData.isMock;
    
    if (authData.isMock) {
      request.currentUser = createMockUser({
        shopName: authData.shopName,
        permissions: shop.settings?.defaultStaffPermissions
      });
    } else {
      request.currentUser = await exchangeTokenForUser(token, shop);
    }
  });
}

const app = fastify();
app.register(authPlugin);
```

### Custom Backend Framework

```typescript
// Generic implementation for any framework
import { validateSessionToken, createMockUser } from '@verdict/shopify-app-bridge-mock/auth';

class ShopifyAuth {
  constructor(private shopifySecret: string) {}

  async authenticate(token: string) {
    const authData = await validateSessionToken(token, {
      shopifySecret: this.shopifySecret
    });

    if (!authData) {
      throw new AuthenticationError('Invalid token');
    }

    const shop = await this.getShop(authData.shopName);
    if (!shop) {
      throw new AuthenticationError('Shop not found');
    }

    if (authData.isMock) {
      return {
        shop,
        currentUser: createMockUser({
          shopName: authData.shopName,
          permissions: shop.settings?.defaultStaffPermissions
        }),
        isMock: true
      };
    } else {
      const currentUser = await this.exchangeToken(token, shop);
      return {
        shop,
        currentUser,
        isMock: false
      };
    }
  }

  private async getShop(shopName: string) {
    // Your shop lookup logic
  }

  private async exchangeToken(token: string, shop: any) {
    // Your token exchange logic
  }
}

// Usage
const auth = new ShopifyAuth(process.env.SHOPIFY_API_PRIVATE_KEY!);
const result = await auth.authenticate(token);
```

## API Reference

### validateSessionToken(token, options)

Universal session token validator.

**Parameters:**
- `token: string` - JWT session token to validate
- `options: ValidateTokenOptions` - Validation options

**Options:**
- `shopifySecret: string` - Real Shopify client secret (required)
- `mockSecret?: string` - Mock client secret (default: "real-id-dev-secret-12345")
- `developmentOnly?: boolean` - Only try mock tokens in development (default: true)

**Returns:** `AuthResult | false`

**AuthResult:**
```typescript
{
  isMock: boolean;         // Whether this is a mock token
  shopName: string;        // Shop domain without https://
  shopDomain: string;      // Full shop domain with https://
  userId: string;          // User ID from token
  payload: object;         // Full decoded JWT payload
  platform: 'shopify';    // Platform identifier
}
```

### isMockToken(token, mockSecret?)

Quick check if a token is a mock token.

**Parameters:**
- `token: string` - JWT session token to check
- `mockSecret?: string` - Mock secret (default: "real-id-dev-secret-12345")

**Returns:** `boolean`

### createMockUser(options?)

Generate mock user objects for testing.

**Parameters:**
- `options?: MockUserOptions` - User configuration options

**Options:**
- `shopName?: string` - Shop name for generating email
- `userId?: string` - User ID (default: '123456789')
- `email?: string` - User email (auto-generated if not provided)
- `firstName?: string` - First name (default: 'Mock')
- `lastName?: string` - Last name (default: 'User')
- `displayName?: string` - Display name (auto-generated if not provided)
- `permissions?: any[]` - Staff permissions array
- `additionalProps?: Record<string, any>` - Additional user properties

**Returns:** `MockCurrentUser`

### withMockTokenSupport(authFunction, shopifySecret, options?)

Wrapper that adds mock token support to existing auth functions.

**Parameters:**
- `authFunction: (token: string) => T | Promise<T>` - Existing auth function
- `shopifySecret: string` - Real Shopify client secret
- `options?: MockTokenHandlerOptions` - Mock handling options

**Options:**
- `mockSecret?: string` - Mock client secret
- `developmentOnly?: boolean` - Only enable mock tokens in development
- `onMockToken?: (authResult: AuthResult) => any` - Custom mock token handler
- `onRealToken?: (authResult: AuthResult) => any` - Custom real token handler
- `getShopData?: (shopName: string) => any` - Function to get shop data

**Returns:** Enhanced authentication function

## Best Practices

### 1. Database Consistency

Always ensure shops exist in your database before accepting mock tokens:

```typescript
const authData = await validateSessionToken(token, options);
if (authData) {
  const shop = await getShopByName(authData.shopName);
  if (!shop) {
    throw new Error('Shop not found - required for both mock and real tokens');
  }
}
```

### 2. Environment Safety

Never enable mock tokens in production:

```typescript
const authData = await validateSessionToken(token, {
  shopifySecret: process.env.SHOPIFY_API_PRIVATE_KEY!,
  developmentOnly: true // Always use this in production
});
```

### 3. API Call Skipping

Skip Shopify API calls for mock tokens:

```typescript
if (authData.isMock) {
  // Use mock data or skip API calls
  return { products: mockProducts };
} else {
  // Make real Shopify API calls
  const products = await shopify.rest.Product.all({ session });
  return { products };
}
```

### 4. Error Handling

Handle authentication errors gracefully:

```typescript
try {
  const authData = await validateSessionToken(token, options);
  // ... handle auth data
} catch (error) {
  if (error.message.includes('expired')) {
    // Handle token expiration
  } else if (error.message.includes('invalid')) {
    // Handle invalid token
  } else {
    // Handle other auth errors
  }
}
```

### 5. Testing

Test both mock and real authentication flows:

```typescript
describe('Authentication', () => {
  it('should handle mock tokens', async () => {
    const mockToken = generateMockToken();
    const result = await authenticate(mockToken);
    expect(result.isMock).toBe(true);
    expect(result.shop).toBeDefined();
  });

  it('should handle real tokens', async () => {
    const realToken = generateRealToken();
    const result = await authenticate(realToken);
    expect(result.isMock).toBe(false);
    expect(result.currentUser).toBeDefined();
  });
});
```

## Troubleshooting

### Mock Tokens Not Working

**Issue:** Mock tokens are rejected in development

**Solutions:**
1. Check `NODE_ENV` is set to `'development'`
2. Verify mock secret matches between frontend and backend
3. Ensure `developmentOnly: true` in validateSessionToken options

### Shop Not Found Errors

**Issue:** "Shop not found" errors with mock tokens

**Solutions:**
1. Ensure the shop exists in your database
2. Check the shop name in the mock token matches your database
3. Verify your `getShopByName` function works correctly

### Real Tokens Stop Working

**Issue:** Real Shopify tokens are rejected after adding mock support

**Solutions:**
1. Verify `SHOPIFY_API_PRIVATE_KEY` environment variable is set
2. Check that your real secret is passed correctly to `validateSessionToken`
3. Ensure the secret array order (mock first, then real) in development

### TypeScript Errors

**Issue:** TypeScript compilation errors with auth functions

**Solutions:**
1. Import types explicitly: `import type { AuthResult } from '@verdict/shopify-app-bridge-mock/auth'`
2. Ensure your `tsconfig.json` includes the package in `moduleResolution`
3. Add proper type annotations to your auth functions

### Production Issues

**Issue:** Mock tokens work in production (security risk)

**Solutions:**
1. Always set `developmentOnly: true` in options
2. Check `NODE_ENV` is properly set in production
3. Never include mock secrets in production environment variables

### Performance Issues

**Issue:** Authentication is slower with mock support

**Solutions:**
1. The overhead is minimal (one extra JWT verification attempt)
2. Consider caching authentication results if needed
3. Use `isMockToken()` for quick checks if performance is critical

For additional support, please check the [main README](../README.md) or open an issue on GitHub.