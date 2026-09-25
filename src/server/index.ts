import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { TokenGenerator } from '../auth/token-generator';
import { MockShopifyAdminConfig, MockShop, MockUser } from '../types';
import { STANDARD_MOCK_CLIENT_ID, STANDARD_MOCK_SECRET } from '../auth/constants';
import { mockFileUploadGraphql } from './file-upload';
import { isFilesListQuery, mockFilesConnection } from './files-query';
import {
  isCollectionsConnectionQuery,
  isProductsConnectionQuery,
  mockCollectionsConnection,
  mockProductsConnection,
} from './catalog-query';

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
      adminApi: 'mock',
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

    // Must run before static, otherwise admin-frame/dist/index.html swallows "/".
    this.app.get('/', (_req: Request, res: Response) => {
      res.redirect(`/admin/apps/${this.config.clientId}`);
    });

    // Serve static files from client directory
    this.app.use('/static', express.static(path.join(__dirname, '../client')));
    this.app.use(express.static(path.join(__dirname, '../../admin-frame/dist')));

    // Mock Shopify Admin page with embedded app.
    // /admin/apps/:clientId/campaigns is the same screen as the app route /campaigns.
    this.app.use('/admin/apps/:clientId', (req: Request, res: Response, next) => {
      const frameSrc = this.config.proxy ? `'self'` : `'self' ${this.config.appUrl}`;
      res.setHeader('Content-Security-Policy',
        `frame-src ${frameSrc}; ` +
        `frame-ancestors 'self' localhost:*; ` +
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com;`
      );

      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (path.extname(req.path)) return next();

      res.sendFile(path.join(__dirname, '../../admin-frame/dist/index.html'));
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

    this.app.get('/api/config', (req: Request, res: Response) => {
      res.json({
        clientId: this.config.clientId,
        shop: this.config.shop,
        appUrl: this.config.appUrl,
        appPath: this.config.appPath,
        adminApi: this.config.adminApi,
        proxy: this.config.proxy,
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

      const query = typeof req.body?.query === 'string' ? req.body.query : '';
      const upload = this.mockUploadGraphql(query, req.body?.variables);
      if (upload) return res.json(upload);

      if (isFilesListQuery(query)) {
        return res.json({
          data: { files: mockFilesConnection(req.body?.variables) },
        });
      }

      if (isProductsConnectionQuery(query)) {
        return res.json({ data: { products: mockProductsConnection(query) } });
      }

      if (isCollectionsConnectionQuery(query)) {
        return res.json({
          data: { collections: mockCollectionsConnection(query) },
        });
      }

      // For mock purposes, return basic shop data
      res.json({
        data: {
          shop: {
            name: this.mockShop.name,
            email: this.mockShop.email,
            domain: this.mockShop.domain,
            currencyCode: 'USD',
            currencyFormats: { moneyFormat: '${{amount}}' },
          },
        },
      });
    });

    // Mock Admin API proxy endpoint - handles intercepted fetch calls from App Bridge
    this.app.post('/mock-admin-api', (req: Request, res: Response) => {
      const { url, method, body } = req.body;

      if (this.config.debug) {
        console.log(`[MockShopify] Admin API proxy: ${method} ${url}`);
      }

      // Handle GraphQL requests
      if (url.includes('/graphql.json')) {
        return this.handleMockGraphQL(req, res, body);
      }

      // Handle REST API requests
      return this.handleMockRestApi(req, res, url, method);
    });

    // Browser posts the staged file here. Shopify's real target is GCS;
    // e2e stays on this server so the upload does not leave the mock flow.
    const acceptStagedUpload = (req: Request, res: Response) => {
      const done = () => {
        if (!res.headersSent) res.status(201).end();
      };
      if (req.readableEnded) {
        done();
        return;
      }
      req.on('end', done);
      req.on('error', done);
      req.resume();
    };
    this.app.post('/mock-staged-uploads', acceptStagedUpload);
    this.app.post('/mock-staged-uploads/*', acceptStagedUpload);
    this.app.put('/mock-staged-uploads', acceptStagedUpload);
    this.app.put('/mock-staged-uploads/*', acceptStagedUpload);

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
      const srcPath = path.join(__dirname, '../../app-bridge/dist/index.js');
      res.sendFile(srcPath);
    });

    // Same-origin reverse proxy for Cypress compatibility
    if (this.config.proxy) {
      this.app.use('/__proxy', createProxyMiddleware({
        target: this.config.appUrl,
        changeOrigin: true,
        ws: true,
        pathRewrite: { '^/__proxy': '' },
        on: {
          proxyReq: (proxyReq, req) => {
            if (this.config.debug) {
              console.log(`[MockShopify] Proxy: ${req.method} ${req.url} -> ${this.config.appUrl}${req.url}`);
            }
          },
        },
      }));
    }

    // Catch-all for undefined routes
    this.app.use('*', (req: Request, res: Response) => {
      if (this.config.debug) {
        console.log(`[MockShopify] Unhandled route: ${req.method} ${req.originalUrl}`);
      }
      res.status(404).json({ error: 'Not found' });
    });
  }

  /**
   * Handle mock GraphQL Admin API requests
   */
  private handleMockGraphQL(req: Request, res: Response, body: any): void {
    const query = typeof body === 'string' ? body : body?.query || '';
    const variables = typeof body === 'string' ? {} : body?.variables ?? {};

    const upload = this.mockUploadGraphql(query, variables);
    if (upload) {
      res.json(upload);
      return;
    }

    // Parse the GraphQL query to determine what data to return
    const mockData: any = { data: {} };

    // files connection — story_video list/search of READY videos (e2e mock only)
    if (isFilesListQuery(query)) {
      mockData.data.files = mockFilesConnection(variables);
    }

    // products / collections — getProducts / getCollections (nodes + id filter)
    if (isProductsConnectionQuery(query)) {
      mockData.data.products = mockProductsConnection(query);
    }

    if (isCollectionsConnectionQuery(query)) {
      mockData.data.collections = mockCollectionsConnection(query);
    }

    // Shop queries
    if (/\bshop\b/.test(query) && !isProductsConnectionQuery(query) && !isCollectionsConnectionQuery(query)) {
      mockData.data.shop = {
        id: 'gid://shopify/Shop/1',
        name: this.mockShop.name,
        email: this.mockShop.email,
        domain: this.mockShop.domain,
        myshopifyDomain: this.config.shop,
        currencyCode: 'USD',
        currencyFormats: { moneyFormat: '${{amount}}' },
        plan: { displayName: 'Developer' },
        primaryDomain: { url: `https://${this.mockShop.domain}` },
      };
    }

    // Orders queries
    if (query.includes('orders')) {
      mockData.data.orders = {
        edges: [
          {
            node: {
              id: 'gid://shopify/Order/1001',
              name: '#1001',
              createdAt: new Date().toISOString(),
              displayFinancialStatus: 'PAID',
              displayFulfillmentStatus: 'UNFULFILLED',
              totalPriceSet: {
                shopMoney: { amount: '49.99', currencyCode: 'USD' },
              },
              customer: {
                id: 'gid://shopify/Customer/1',
                displayName: 'John Doe',
                email: 'john@example.com',
              },
            },
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Customers queries
    if (query.includes('customers')) {
      mockData.data.customers = {
        edges: [
          {
            node: {
              id: 'gid://shopify/Customer/1',
              displayName: 'John Doe',
              email: 'john@example.com',
              phone: '+1234567890',
              ordersCount: '5',
              totalSpentV2: { amount: '249.95', currencyCode: 'USD' },
            },
            cursor: 'cursor1',
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // If no specific data matched, return empty data object
    if (Object.keys(mockData.data).length === 0) {
      mockData.data = { __typename: 'QueryRoot' };
    }

    res.json(mockData);
  }

  private mockUploadGraphql(query: string, variables: unknown) {
    return mockFileUploadGraphql(query, variables, `http://127.0.0.1:${this.config.port}`);
  }

  /**
   * Handle mock REST Admin API requests
   */
  private handleMockRestApi(req: Request, res: Response, url: string, method: string): void {
    // Parse the URL to determine the resource
    const urlParts = url.split('/');
    const resource = urlParts.find((part, i) =>
      urlParts[i - 1]?.match(/^\d{4}-\d{2}$/) // Find part after API version
    );

    switch (resource) {
      case 'shop.json':
        res.json({ shop: this.mockShop });
        break;

      case 'products.json':
        res.json({
          products: [
            {
              id: 1,
              title: 'Mock Product 1',
              handle: 'mock-product-1',
              status: 'active',
              variants: [
                { id: 1, price: '19.99', inventory_quantity: 100 },
              ],
            },
            {
              id: 2,
              title: 'Mock Product 2',
              handle: 'mock-product-2',
              status: 'active',
              variants: [
                { id: 2, price: '29.99', inventory_quantity: 50 },
              ],
            },
          ],
        });
        break;

      case 'orders.json':
        res.json({
          orders: [
            {
              id: 1001,
              name: '#1001',
              created_at: new Date().toISOString(),
              financial_status: 'paid',
              fulfillment_status: null,
              total_price: '49.99',
              customer: { id: 1, email: 'john@example.com' },
            },
          ],
        });
        break;

      case 'customers.json':
        res.json({
          customers: [
            {
              id: 1,
              email: 'john@example.com',
              first_name: 'John',
              last_name: 'Doe',
              orders_count: 5,
              total_spent: '249.95',
            },
          ],
        });
        break;

      default:
        // Return empty response for unknown resources
        if (this.config.debug) {
          console.log(`[MockShopify] Unknown REST resource: ${resource}`);
        }
        res.json({});
    }
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
🎯 App URL: ${this.config.appUrl}${this.config.proxy ? '\n🔀 Proxy: /__proxy/ -> ' + this.config.appUrl : ''}
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