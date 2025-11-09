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
      const srcPath = path.join(__dirname, '../../app-bridge/dist/index.iife.js');
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