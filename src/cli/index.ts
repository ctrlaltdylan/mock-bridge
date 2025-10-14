#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { MockShopifyAdminServer } from '../server';
import type { MockShopifyAdminConfig } from '../types';
import { STANDARD_MOCK_SECRET } from '../auth/constants';

const program = new Command();

// Version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
);

interface CLIConfig extends Partial<MockShopifyAdminConfig> {
  config?: string;
}

/**
 * Load configuration from file if provided
 */
function loadConfigFile(configPath: string): Partial<MockShopifyAdminConfig> {
  try {
    const fullPath = path.resolve(process.cwd(), configPath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(chalk.red(`❌ Config file not found: ${fullPath}`));
      process.exit(1);
    }

    const ext = path.extname(fullPath);
    let config: Partial<MockShopifyAdminConfig>;

    if (ext === '.json') {
      config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } else if (ext === '.js' || ext === '.mjs') {
      // Dynamic import for ES modules
      delete require.cache[fullPath];
      const moduleExports = require(fullPath);
      config = moduleExports;
      if (moduleExports && typeof moduleExports === 'object' && 'default' in moduleExports) {
        config = moduleExports.default;
      }
    } else {
      console.error(chalk.red(`❌ Unsupported config file format: ${ext}`));
      console.log(chalk.gray('Supported formats: .json, .js, .mjs'));
      process.exit(1);
    }

    console.log(chalk.gray(`📋 Loaded config from: ${configPath}`));
    return config;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`❌ Error loading config file: ${errorMessage}`));
    process.exit(1);
  }
}

/**
 * Auto-detect common configuration from environment and package.json
 */
function autoDetectConfig(): Partial<MockShopifyAdminConfig> {
  const config: Partial<MockShopifyAdminConfig> = {};

  // Try to read from environment variables
  if (process.env.SHOPIFY_API_KEY) {
    config.clientId = process.env.SHOPIFY_API_KEY;
    console.log(chalk.gray('🔍 Auto-detected client ID from SHOPIFY_API_KEY'));
  }

  // Try to detect common app URLs
  const commonPorts = [3000, 3001, 4000, 5000, 8000, 8080];
  let detectedPort = 3000; // default

  // Check if package.json has dev script hints
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      
      // Look for common dev script patterns
      const devScript = pkg.scripts?.dev || pkg.scripts?.start || '';
      const portMatch = devScript.match(/(?:port|PORT)[\s=:]+(\d+)/);
      
      if (portMatch) {
        detectedPort = parseInt(portMatch[1], 10);
        console.log(chalk.gray(`🔍 Auto-detected app port from package.json: ${detectedPort}`));
      }
    }
  } catch (error) {
    // Ignore errors, use defaults
  }

  config.appUrl = `http://localhost:${detectedPort}`;

  return config;
}

/**
 * Validate required configuration
 */
function validateConfig(config: MockShopifyAdminConfig): void {
  const errors: string[] = [];

  if (!config.appUrl) {
    errors.push('App URL is required (provide as argument or set in config file)');
  }

  if (!config.clientId) {
    errors.push('Client ID is required (use --client-id or set SHOPIFY_API_KEY)');
  }

  if (!config.clientSecret) {
    errors.push('Client secret is required (use --client-secret or set in config file)');
  }

  if (errors.length > 0) {
    console.error(chalk.red('❌ Configuration errors:'));
    errors.forEach(error => console.error(chalk.red(`   • ${error}`)));
    console.log();
    console.log(chalk.yellow('💡 Quick start examples:'));
    console.log(chalk.gray('   npx mock-bridge http://localhost:3000 --client-id your-client-id'));
    console.log(chalk.gray('   npx mock-bridge --config mock.config.js'));
    console.log();
    process.exit(1);
  }
}

/**
 * Print configuration summary
 */
function printConfigSummary(config: MockShopifyAdminConfig): void {
  console.log();
  console.log(chalk.blue('🔧 Mock Shopify Admin Configuration:'));
  console.log(chalk.gray('   '), chalk.white('App URL:'), chalk.cyan(config.appUrl));
  console.log(chalk.gray('   '), chalk.white('Client ID:'), chalk.cyan(config.clientId));
  console.log(chalk.gray('   '), chalk.white('Mock Shop:'), chalk.cyan(config.shop));
  console.log(chalk.gray('   '), chalk.white('Admin Port:'), chalk.cyan(config.port));
  if (config.debug) {
    console.log(chalk.gray('   '), chalk.white('Debug Mode:'), chalk.yellow('Enabled'));
  }
  console.log();
}

/**
 * Start command implementation
 */
async function startCommand(options: CLIConfig): Promise<void> {
  try {
    console.log(chalk.blue.bold('🚀 Starting Shopify App Bridge Mock...'));
    
    // Load config file if specified
    let config: Partial<MockShopifyAdminConfig> = {};
    
    if (options.config) {
      config = loadConfigFile(options.config);
    } else {
      // Auto-detect configuration
      config = autoDetectConfig();
    }

    // Merge CLI options with config file (CLI options take precedence)
    const finalConfig: MockShopifyAdminConfig = {
      // Default values
      port: 3080,
      shop: 'test-shop.myshopify.com',
      clientSecret: STANDARD_MOCK_SECRET,
      apiVersion: '2024-01',
      scopes: [
        'read_products',
        'write_products',
        'read_orders', 
        'write_orders',
        'read_customers',
        'write_customers'
      ],
      debug: false,
      
      // Config file values
      ...config,
      
      // CLI options (highest priority)
      ...(options.appUrl && { appUrl: options.appUrl }),
      ...(options.clientId && { clientId: options.clientId }),
      ...(options.clientSecret && { clientSecret: options.clientSecret }),
      ...(options.shop && { shop: options.shop }),
      ...(options.port && { port: options.port }),
      ...(options.debug && { debug: options.debug }),
    } as MockShopifyAdminConfig;

    // Validate configuration
    validateConfig(finalConfig);

    // Print configuration summary
    printConfigSummary(finalConfig);

    // Create and start the mock server
    const server = new MockShopifyAdminServer(finalConfig);
    
    await server.start();

    console.log(chalk.green.bold('🎉 Mock Shopify Admin Started Successfully!'));
    console.log();
    console.log(chalk.white.bold('📍 URLs:'));
    console.log(chalk.gray('   '), chalk.white('Mock Admin:'), chalk.green(`http://localhost:${finalConfig.port}`));
    console.log(chalk.gray('   '), chalk.white('Your App:'), chalk.cyan(finalConfig.appUrl));
    console.log();
    console.log(chalk.white.bold('🎯 Next Steps:'));
    console.log(chalk.gray('   1. Make sure your app is running at'), chalk.cyan(finalConfig.appUrl));
    console.log(chalk.gray('   2. Open'), chalk.green(`http://localhost:${finalConfig.port}`), chalk.gray('in your browser'));
    console.log(chalk.gray('   3. Your app will be embedded automatically!'));
    console.log();
    console.log(chalk.yellow('💡 Features Available:'));
    console.log(chalk.gray('   ✅ Session token authentication'));
    console.log(chalk.gray('   ✅ Mock App Bridge APIs'));
    console.log(chalk.gray('   ✅ Playwright/automation support'));
    console.log(chalk.gray('   ✅ Chrome DevTools MCP compatibility'));
    console.log();
    console.log(chalk.gray('Press Ctrl+C to stop the server'));

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(chalk.yellow(`\n\n🛑 Received ${signal}, shutting down...`));
      try {
        await server.stop();
        console.log(chalk.green('✅ Mock server stopped successfully'));
        process.exit(0);
      } catch (error) {
        console.error(chalk.red('❌ Error stopping server:'), error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Keep process running
    process.stdin.resume();

  } catch (error) {
    console.error(chalk.red('❌ Failed to start mock server:'));
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(errorMessage));
    
    if (options.debug && error instanceof Error) {
      console.error(chalk.gray('Stack trace:'));
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

/**
 * Init command implementation  
 */
async function initCommand(): Promise<void> {
  console.log(chalk.blue.bold('🔧 Creating Shopify App Bridge Mock configuration...'));
  
  const configContent = `// Shopify Mock Bridge Configuration
// Generated by: npx mock-bridge init

module.exports = {
  // Your app configuration
  appUrl: 'http://localhost:3000/shopify', // Your app's URL (include path if needed)
  
  // Shopify app credentials
  clientId: process.env.SHOPIFY_API_KEY,  // Your Shopify app's client ID
  clientSecret: '${STANDARD_MOCK_SECRET}', // Standard mock secret for development only
  
  // Mock environment settings
  port: 3080,                             // Mock admin port
  shop: 'test-shop.myshopify.com',       // Mock shop domain
  apiVersion: '2024-01',                  // Shopify API version
  
  // App permissions/scopes
  scopes: [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_customers',
    'write_customers',
    'read_draft_orders',
    'write_draft_orders'
  ],
  
  // Development options
  debug: true,                            // Enable debug logging
};
`;

  const configPath = path.join(process.cwd(), 'mock.config.js');
  
  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow('⚠️  Configuration file already exists:'), chalk.gray(configPath));
    console.log(chalk.gray('   Use --force to overwrite'));
    return;
  }

  fs.writeFileSync(configPath, configContent);
  
  console.log(chalk.green('✅ Created configuration file:'), chalk.cyan('mock.config.js'));
  console.log();
  console.log(chalk.white.bold('🎯 Next Steps:'));
  console.log(chalk.gray('   1. Edit'), chalk.cyan('mock.config.js'), chalk.gray('with your app settings'));
  console.log(chalk.gray('   2. Set'), chalk.cyan('SHOPIFY_API_KEY'), chalk.gray('environment variable'));
  console.log(chalk.gray('   3. Run'), chalk.green('npx mock-bridge'), chalk.gray('to start'));
  console.log();
  console.log(chalk.yellow('💡 Example package.json scripts:'));
  console.log(chalk.gray('   {'));
  console.log(chalk.gray('     "scripts": {'));
  console.log(chalk.gray('       "mock:admin": "mock-bridge",'));
  console.log(chalk.gray('       "dev:mock": "concurrently \\"npm run dev\\" \\"npm run mock:admin\\""'));
  console.log(chalk.gray('     }'));
  console.log(chalk.gray('   }'));
}

// Configure the CLI
program
  .name('mock-bridge')
  .version(packageJson.version)
  .description('Mock Shopify Admin environment for testing embedded apps');

// Default start command - simplified interface
program
  .argument('[app-url]', 'Your app\'s URL (e.g., http://localhost:3000/shopify)')
  .option('-i, --client-id <id>', 'Your Shopify app\'s client ID')
  .option('-s, --client-secret <secret>', 'Mock client secret (development only)')
  .option('--shop <domain>', 'Mock shop domain', 'test-shop.myshopify.com')
  .option('--port <number>', 'Mock admin port', (val) => parseInt(val, 10), 3080)
  .option('-c, --config <file>', 'Path to configuration file')
  .option('-d, --debug', 'Enable debug logging', false)
  .action(async (appUrl: string | undefined, options: CLIConfig) => {
    // If app-url is provided as argument, use it
    if (appUrl) {
      options.appUrl = appUrl;
    }
    await startCommand(options);
  });

// Explicit start command
program
  .command('start')
  .description('Start the mock Shopify Admin server')
  .argument('[app-url]', 'Your app\'s URL (e.g., http://localhost:3000/shopify)')
  .option('-i, --client-id <id>', 'Your Shopify app\'s client ID')
  .option('-s, --client-secret <secret>', 'Mock client secret (development only)')
  .option('--shop <domain>', 'Mock shop domain', 'test-shop.myshopify.com')
  .option('--port <number>', 'Mock admin port', (val) => parseInt(val, 10), 3080)
  .option('-c, --config <file>', 'Path to configuration file')
  .option('-d, --debug', 'Enable debug logging', false)
  .action(async (appUrl: string | undefined, options: CLIConfig) => {
    if (appUrl) {
      options.appUrl = appUrl;
    }
    await startCommand(options);
  });

// Init command
program
  .command('init')
  .description('Create a configuration file')
  .option('--force', 'Overwrite existing configuration file', false)
  .action(initCommand);

// Add help examples
program.addHelpText('after', `
Examples:
  $ npx mock-bridge http://localhost:3000
  $ npx mock-bridge http://localhost:3000/shopify
  $ npx mock-bridge http://localhost:3000 --client-id abc123
  $ npx mock-bridge --config mock.config.js
  $ npx mock-bridge init
  
Environment Variables:
  SHOPIFY_API_KEY     Your Shopify app's client ID (used as default for --client-id)
  NODE_ENV           Set to 'development' to enable mock token support

Configuration File:
  Use 'npx mock-bridge init' to create a mock.config.js file
  Supports: .js, .mjs, .json formats

Shopify TOML Integration:
  Read application_url from shopify.app.toml and use it directly:
  $ npx mock-bridge $(grep application_url shopify.app.toml | cut -d'"' -f2)
`);

// Parse and execute
program.parse();