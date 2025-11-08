import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { TokenGenerator } from '../auth/token-generator';
import { MockShopifyAdminConfig, MockShop, MockUser } from '../types';
import { STANDARD_MOCK_CLIENT_ID, STANDARD_MOCK_SECRET } from '../auth/constants';

export class MockShopifyAdminServer {
  private app: Express;
  private config: MockShopifyAdminConfig;
  private tokenGenerator: TokenGenerator;
  private server: any;
  private mockShop: MockShop;
  private mockUser: MockUser;

  constructor(config: MockShopifyAdminConfig) {
    this.config = {
      port: 3080,
      shop: 'test-shop.myshopify.com',
      clientId: STANDARD_MOCK_CLIENT_ID,
      clientSecret: STANDARD_MOCK_SECRET,
      apiVersion: '2024-01',
      scopes: ['read_products', 'write_products', 'read_orders', 'write_orders'],
      debug: false,
      ...config,
    };

    this.app = express();
    this.tokenGenerator = new TokenGenerator(this.config.clientSecret!);

    // Initialize mock data
    this.mockShop = {
      domain: this.config.shop!,
      name: 'Mock Shop',
      email: 'mock@shop.com',
      plan: 'developer',
      createdAt: new Date().toISOString(),
    };

    this.mockUser = {
      id: this.config.userId || '123456789',
      email: 'test@mockshop.com',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
    };

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS for all origins in mock mode
    this.app.use(cors({
      origin: true,
      credentials: true,
    }));

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Serve static files from client directory
    this.app.use('/static', express.static(path.join(__dirname, '../client')));
    this.app.use(express.static(path.join(__dirname, '../../admin-frame/dist')));

    // Mock Shopify Admin page with embedded app
    this.app.use('/admin/apps/:clientId', (req: Request, res: Response, next) => {
      // const { host, shop } = req.query;

      // Set CSP header to allow iframe embedding
      res.setHeader('Content-Security-Policy',
        `frame-src 'self' ${this.config.appUrl}; ` +
        `frame-ancestors 'self' localhost:*; ` +
        `script-src 'self' 'unsafe-inline' 'unsafe-eval';`
      );

      // res.send(this.getAdminHTML(host as string, shop as string));
      next();
    });

    // this.app.use('/admin', express.static(path.join(__dirname, '../../admin-frame/dist')));

    // Debug logging
    if (this.config.debug) {
      this.app.use((req, res, next) => {
        console.log(`[MockShopify] ${req.method} ${req.url}`);
        next();
      });
    }
  }

  private setupRoutes(): void {
    // Serve logo images
    this.app.get('/logo', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../../assets/img/mock-bridge-logo-200px.jpg'));
    });

    this.app.get('/favicon.ico', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../../assets/img/mock-bridge-logo-200px.jpg'));
    });

    // Main admin route - serves the mock Shopify Admin page
    this.app.get('/', (req: Request, res: Response) => {
      const hostBase64 = Buffer.from(`https://${this.config.shop}`).toString('base64');
      res.redirect(`/admin/apps/${this.config.clientId}?host=${hostBase64}&shop=${this.config.shop}`);
    });

    this.app.get('/api/config', (req: Request, res: Response) => {
      res.json({
        clientId: this.config.clientId,
        shop: this.config.shop,
        appUrl: this.config.appUrl,
        appPath: this.config.appPath,
      });
    });

    // Session token endpoint
    this.app.post('/api/session-token', (req: Request, res: Response) => {
      const token = this.tokenGenerator.generateSessionToken({
        shop: this.config.shop!,
        clientId: this.config.clientId!,
        clientSecret: this.config.clientSecret!,
        userId: this.mockUser.id,
      });

      res.json({ token });
    });

    // Mock GraphQL Admin API endpoint
    this.app.post('/admin/api/:version/graphql.json', (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          errors: [{ message: 'Unauthorized' }]
        });
      }

      // For mock purposes, return basic shop data
      res.json({
        data: {
          shop: {
            name: this.mockShop.name,
            email: this.mockShop.email,
            domain: this.mockShop.domain,
          },
        },
      });
    });

    // Mock OAuth token exchange endpoint
    this.app.post('/admin/oauth/access_token', (req: Request, res: Response) => {
      const { client_id, client_secret, subject_token } = req.body;

      if (client_id !== this.config.clientId! || client_secret !== this.config.clientSecret!) {
        return res.status(401).json({ error: 'invalid_client' });
      }

      try {
        // Verify the session token
        this.tokenGenerator.verifySessionToken(subject_token);

        // Return mock access tokens
        res.json({
          access_token: 'mock_access_token_' + Date.now(),
          scope: this.config.scopes?.join(',') || '',
          expires_in: 86400, // 24 hours
        });
      } catch (error) {
        res.status(400).json({ error: 'invalid_grant' });
      }
    });

    // Mock REST API endpoints
    this.app.get('/admin/api/:version/shop.json', (req: Request, res: Response) => {
      res.json({
        shop: this.mockShop,
      });
    });

    // Mock app bridge script (served for embedded apps)
    this.app.get('/app-bridge.js', (req: Request, res: Response) => {
      res.type('application/javascript');
      // The mock-app-bridge.js is a plain JS file, so it stays in src
      const srcPath = path.join(__dirname, '../../src/client/mock-app-bridge.js');
      res.sendFile(srcPath);
    });

    // Catch-all for undefined routes
    this.app.use('*', (req: Request, res: Response) => {
      if (this.config.debug) {
        console.log(`[MockShopify] Unhandled route: ${req.method} ${req.originalUrl}`);
      }
      res.status(404).json({ error: 'Not found' });
    });
  }

  private getAdminHTML(host: string, shop: string): string {
    const appUrl = new URL(this.config.appUrl);
    const basePath = this.config.appPath || '';
    const iframeSrc = `${this.config.appUrl}${basePath}?host=${host}&shop=${shop}&embedded=1`;

    // Extract shop name for Shopify admin URLs (e.g., "test-shop" from "test-shop.myshopify.com")
    const shopName = shop.replace('.myshopify.com', '');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mock Shopify Admin - ${this.mockShop.name}</title>
  <link rel="icon" type="image/jpeg" href="/favicon.ico">
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f9fafb;
      color: #202223;
    }
    
    .admin-layout {
      display: flex;
      height: 100vh;
    }
    
    .admin-sidebar {
      width: 240px;
      background: #f9fafb;
      border-right: 1px solid #e3e3e3;
      flex-shrink: 0;
      overflow-y: auto;
    }
    
    .admin-nav {
      padding: 16px 0;
    }
    
    .nav-title {
      padding: 16px 16px 12px 16px;
      border-bottom: 1px solid #e3e3e3;
      margin-bottom: 12px;
    }
    
    .nav-title a {
      color: #202223;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .nav-title a:hover .nav-text {
      color: #005bd3;
    }
    
    .nav-title .logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      flex-shrink: 0;
    }
    
    .nav-title .nav-text {
      display: flex;
      flex-direction: column;
    }
    
    .nav-title .title {
      font-size: 16px;
      font-weight: 600;
      color: #202223;
    }
    
    .nav-title .subtitle {
      font-size: 12px;
      font-weight: 400;
      color: #637381;
      margin-top: 2px;
    }
    
    .nav-section {
      padding: 0 8px;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      color: #202223;
      text-decoration: none;
      border-radius: 8px;
      margin: 2px 0;
      transition: background-color 0.15s ease;
      font-size: 14px;
      font-weight: 500;
    }
    
    .nav-item:hover {
      background-color: #e3e3e3;
    }
    
    .nav-item.selected {
      background-color: #005bd3;
      color: white;
    }
    
    .nav-item.selected:hover {
      background-color: #004293;
    }
    
    .nav-icon {
      width: 20px;
      height: 20px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    
    .admin-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: white;
    }
    
    .admin-header {
      background: #1a1c1d;
      color: white;
      height: 56px;
      display: flex;
      align-items: center;
      padding: 0 20px;
      border-bottom: 1px solid #e3e3e3;
    }
    
    .admin-header h1 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    
    .admin-header .shop-domain {
      font-size: 14px;
      font-weight: 400;
      opacity: 0.8;
      margin-top: 2px;
    }
    
    .admin-content {
      flex: 1;
      background: white;
      overflow: hidden;
      position: relative;
    }
    
    #app-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 18px;
      color: #637381;
    }
    
    .error {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #d72c0d;
      text-align: center;
    }
    
    .debug-info {
      background: #f6f6f7;
      border: 1px solid #e3e3e3;
      padding: 10px;
      margin: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #637381;
      display: ${this.config.debug ? 'block' : 'none'};
    }
  </style>
</head>
<body>
  <div class="admin-layout">
    <!-- Navigation Sidebar -->
    <div class="admin-sidebar">
      <nav class="admin-nav">
        <div class="nav-title">
          <a href="https://github.com/ctrlaltdylan/mock-bridge" target="_blank">
            <img src="/logo" alt="Mock Bridge Logo" class="logo" />
            <div class="nav-text">
              <div class="title">Mock Bridge</div>
              <div class="subtitle">Shopify Admin Mock</div>
            </div>
          </a>
        </div>
        <div class="nav-section">
          <a href="https://admin.shopify.com/store/${shopName}/orders" target="_blank" class="nav-item">
            <span class="nav-icon">📦</span>
            <span>Orders</span>
          </a>
          <a href="https://admin.shopify.com/store/${shopName}/products" target="_blank" class="nav-item">
            <span class="nav-icon">🛍️</span>
            <span>Products</span>
          </a>
          <a href="https://admin.shopify.com/store/${shopName}/customers" target="_blank" class="nav-item">
            <span class="nav-icon">👥</span>
            <span>Customers</span>
          </a>
          <a href="https://admin.shopify.com/store/${shopName}/analytics" target="_blank" class="nav-item">
            <span class="nav-icon">📊</span>
            <span>Analytics</span>
          </a>
          <a href="https://admin.shopify.com/store/${shopName}/marketing" target="_blank" class="nav-item">
            <span class="nav-icon">📢</span>
            <span>Marketing</span>
          </a>
          <a href="#" class="nav-item selected">
            <span class="nav-icon">🧩</span>
            <span>Apps</span>
          </a>
          <a href="https://admin.shopify.com/store/${shopName}/settings" target="_blank" class="nav-item">
            <span class="nav-icon">⚙️</span>
            <span>Settings</span>
          </a>
        </div>
      </nav>
    </div>

    <!-- Main Content Area -->
    <div class="admin-main">
      <div class="admin-header">
        <div>
          <h1>Mock Shopify Admin</h1>
          <div class="shop-domain">${shop}</div>
        </div>
      </div>
      
      <div class="admin-content">
        <!-- Debug Information -->
        <div class="debug-info">
          App URL: ${iframeSrc}<br>
          Shop: ${shop}<br>
          Host: ${host}<br>
          Client ID: ${this.config.clientId}
        </div>

        <!-- Loading State -->
        <div id="loading" class="loading">
          Loading your app...
        </div>

        <!-- Error State -->
        <div id="error" class="error">
          <h2>App failed to load</h2>
          <p>Check the console for errors or verify your app is running</p>
          <button onclick="location.reload()">Reload</button>
        </div>

        <!-- App iframe content area -->
        <iframe 
          id="app-iframe" 
          src="${iframeSrc}"
          style="display: none; width: 100%; height: 100%; border: none;"
          allow="clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
        ></iframe>
      </div>
    </div>
  </div>
  
  <script>
    // Mock Shopify Admin functionality
    window.mockShopifyAdmin = {
      shop: '${shop}',
      host: '${host}',
      clientId: '${this.config.clientId}',
      apiUrl: 'http://localhost:${this.config.port}',
    };
    
    // Handle iframe loading
    const iframe = document.getElementById('app-iframe');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    let loadTimeout;
    
    // Set a timeout for loading
    loadTimeout = setTimeout(() => {
      console.error('[MockAdmin] App failed to load within 10 seconds');
      loading.style.display = 'none';
      error.style.display = 'flex';
    }, 10000);
    
    iframe.onload = function() {
      clearTimeout(loadTimeout);
      console.log('[MockAdmin] App loaded successfully');
      loading.style.display = 'none';
      iframe.style.display = 'block';
    };
    
    iframe.onerror = function() {
      clearTimeout(loadTimeout);
      console.error('[MockAdmin] App failed to load');
      loading.style.display = 'none';
      error.style.display = 'flex';
    };
    
    // Also log any console errors
    window.addEventListener('error', function(e) {
      console.error('[MockAdmin] Error:', e.error);
    });
    
    // Note: We can't inject scripts directly due to cross-origin restrictions
    // Instead, the embedded app should detect it's in a mock environment and load the mock App Bridge

    // Handle postMessage communication with embedded app
    window.addEventListener('message', function(event) {
      // Handle App Bridge messages from the embedded app
      if (event.data && event.data.type) {
        console.log('[MockAdmin] Received message:', event.data);
        
        // Handle session token requests
        if (event.data.type === 'SESSION_TOKEN_REQUEST') {
          // Generate and send back a session token
          fetch('http://localhost:${this.config.port}/api/session-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shop: '${shop}' }),
          })
          .then(res => res.json())
          .then(data => {
            iframe.contentWindow.postMessage({
              type: 'SESSION_TOKEN_RESPONSE',
              token: data.token,
            }, '*');
          });
        }
      }
    });

    // Signal to the iframe that it's in a mock environment
    // Send the signal multiple times to ensure it's received before the timeout
    const sendMockSignal = () => {
      try {
        iframe.contentWindow.postMessage({
          type: 'MOCK_SHOPIFY_ENVIRONMENT',
          mockServerUrl: 'http://localhost:${this.config.port}',
          shop: '${shop}',
          clientId: '${this.config.clientId}'
        }, '*');
        console.log('[MockAdmin] Mock environment signal sent');
      } catch (e) {
        console.warn('[MockAdmin] Could not signal mock environment:', e.message);
      }
    };

    // Send signal immediately when iframe starts loading
    iframe.addEventListener('load', () => {
      // Send signal immediately
      sendMockSignal();
      
      // Send signal a few more times to ensure delivery before timeout
      setTimeout(sendMockSignal, 10);
      setTimeout(sendMockSignal, 50);
      setTimeout(sendMockSignal, 100);
    });
    
    // Log that mock admin is ready
    console.log('[MockShopifyAdmin] Ready - Shop: ${shop}, Client ID: ${this.config.clientId}');
  </script>
</body>
</html>
    `;
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`
🚀 Mock Shopify Admin Server Started!
====================================
📍 URL: http://localhost:${this.config.port}
🏪 Shop: ${this.config.shop}
🔑 Client ID: ${this.config.clientId}
🎯 App URL: ${this.config.appUrl}
====================================
        `);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock Shopify Admin Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getConfig(): MockShopifyAdminConfig {
    return this.config;
  }
}