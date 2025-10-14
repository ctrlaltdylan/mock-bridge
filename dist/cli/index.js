#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const server_1 = require("../server");
const constants_1 = require("../auth/constants");
const program = new commander_1.Command();
// Version from package.json
const packageJson = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../package.json'), 'utf8'));
/**
 * Load configuration from file if provided
 */
function loadConfigFile(configPath) {
    try {
        const fullPath = path_1.default.resolve(process.cwd(), configPath);
        if (!fs_1.default.existsSync(fullPath)) {
            console.error(chalk_1.default.red(`❌ Config file not found: ${fullPath}`));
            process.exit(1);
        }
        const ext = path_1.default.extname(fullPath);
        let config;
        if (ext === '.json') {
            config = JSON.parse(fs_1.default.readFileSync(fullPath, 'utf8'));
        }
        else if (ext === '.js' || ext === '.mjs') {
            // Dynamic import for ES modules
            delete require.cache[fullPath];
            const moduleExports = require(fullPath);
            config = moduleExports;
            if (moduleExports && typeof moduleExports === 'object' && 'default' in moduleExports) {
                config = moduleExports.default;
            }
        }
        else {
            console.error(chalk_1.default.red(`❌ Unsupported config file format: ${ext}`));
            console.log(chalk_1.default.gray('Supported formats: .json, .js, .mjs'));
            process.exit(1);
        }
        console.log(chalk_1.default.gray(`📋 Loaded config from: ${configPath}`));
        return config;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk_1.default.red(`❌ Error loading config file: ${errorMessage}`));
        process.exit(1);
    }
}
/**
 * Auto-detect common configuration from environment and package.json
 */
function autoDetectConfig() {
    const config = {};
    // Try to read from environment variables
    if (process.env.SHOPIFY_API_KEY) {
        config.clientId = process.env.SHOPIFY_API_KEY;
        console.log(chalk_1.default.gray('🔍 Auto-detected client ID from SHOPIFY_API_KEY'));
    }
    // Try to detect common app URLs
    const commonPorts = [3000, 3001, 4000, 5000, 8000, 8080];
    let detectedPort = 3000; // default
    // Check if package.json has dev script hints
    try {
        const pkgPath = path_1.default.join(process.cwd(), 'package.json');
        if (fs_1.default.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, 'utf8'));
            // Look for common dev script patterns
            const devScript = pkg.scripts?.dev || pkg.scripts?.start || '';
            const portMatch = devScript.match(/(?:port|PORT)[\s=:]+(\d+)/);
            if (portMatch) {
                detectedPort = parseInt(portMatch[1], 10);
                console.log(chalk_1.default.gray(`🔍 Auto-detected app port from package.json: ${detectedPort}`));
            }
        }
    }
    catch (error) {
        // Ignore errors, use defaults
    }
    config.appUrl = `http://localhost:${detectedPort}`;
    return config;
}
/**
 * Validate required configuration
 */
function validateConfig(config) {
    const errors = [];
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
        console.error(chalk_1.default.red('❌ Configuration errors:'));
        errors.forEach(error => console.error(chalk_1.default.red(`   • ${error}`)));
        console.log();
        console.log(chalk_1.default.yellow('💡 Quick start examples:'));
        console.log(chalk_1.default.gray('   npx mock-bridge http://localhost:3000 --client-id your-client-id'));
        console.log(chalk_1.default.gray('   npx mock-bridge --config mock.config.js'));
        console.log();
        process.exit(1);
    }
}
/**
 * Print configuration summary
 */
function printConfigSummary(config) {
    console.log();
    console.log(chalk_1.default.blue('🔧 Mock Shopify Admin Configuration:'));
    console.log(chalk_1.default.gray('   '), chalk_1.default.white('App URL:'), chalk_1.default.cyan(config.appUrl));
    console.log(chalk_1.default.gray('   '), chalk_1.default.white('Client ID:'), chalk_1.default.cyan(config.clientId));
    console.log(chalk_1.default.gray('   '), chalk_1.default.white('Mock Shop:'), chalk_1.default.cyan(config.shop));
    console.log(chalk_1.default.gray('   '), chalk_1.default.white('Admin Port:'), chalk_1.default.cyan(config.port));
    if (config.debug) {
        console.log(chalk_1.default.gray('   '), chalk_1.default.white('Debug Mode:'), chalk_1.default.yellow('Enabled'));
    }
    console.log();
}
/**
 * Start command implementation
 */
async function startCommand(options) {
    try {
        console.log(chalk_1.default.blue.bold('🚀 Starting Shopify App Bridge Mock...'));
        // Load config file if specified
        let config = {};
        if (options.config) {
            config = loadConfigFile(options.config);
        }
        else {
            // Auto-detect configuration
            config = autoDetectConfig();
        }
        // Merge CLI options with config file (CLI options take precedence)
        const finalConfig = {
            // Default values
            port: 3080,
            shop: 'test-shop.myshopify.com',
            clientSecret: constants_1.STANDARD_MOCK_SECRET,
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
        };
        // Validate configuration
        validateConfig(finalConfig);
        // Print configuration summary
        printConfigSummary(finalConfig);
        // Create and start the mock server
        const server = new server_1.MockShopifyAdminServer(finalConfig);
        await server.start();
        console.log(chalk_1.default.green.bold('🎉 Mock Shopify Admin Started Successfully!'));
        console.log();
        console.log(chalk_1.default.white.bold('📍 URLs:'));
        console.log(chalk_1.default.gray('   '), chalk_1.default.white('Mock Admin:'), chalk_1.default.green(`http://localhost:${finalConfig.port}`));
        console.log(chalk_1.default.gray('   '), chalk_1.default.white('Your App:'), chalk_1.default.cyan(finalConfig.appUrl));
        console.log();
        console.log(chalk_1.default.white.bold('🎯 Next Steps:'));
        console.log(chalk_1.default.gray('   1. Make sure your app is running at'), chalk_1.default.cyan(finalConfig.appUrl));
        console.log(chalk_1.default.gray('   2. Open'), chalk_1.default.green(`http://localhost:${finalConfig.port}`), chalk_1.default.gray('in your browser'));
        console.log(chalk_1.default.gray('   3. Your app will be embedded automatically!'));
        console.log();
        console.log(chalk_1.default.yellow('💡 Features Available:'));
        console.log(chalk_1.default.gray('   ✅ Session token authentication'));
        console.log(chalk_1.default.gray('   ✅ Mock App Bridge APIs'));
        console.log(chalk_1.default.gray('   ✅ Playwright/automation support'));
        console.log(chalk_1.default.gray('   ✅ Chrome DevTools MCP compatibility'));
        console.log();
        console.log(chalk_1.default.gray('Press Ctrl+C to stop the server'));
        // Handle graceful shutdown
        const shutdown = async (signal) => {
            console.log(chalk_1.default.yellow(`\n\n🛑 Received ${signal}, shutting down...`));
            try {
                await server.stop();
                console.log(chalk_1.default.green('✅ Mock server stopped successfully'));
                process.exit(0);
            }
            catch (error) {
                console.error(chalk_1.default.red('❌ Error stopping server:'), error);
                process.exit(1);
            }
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        // Keep process running
        process.stdin.resume();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Failed to start mock server:'));
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk_1.default.red(errorMessage));
        if (options.debug && error instanceof Error) {
            console.error(chalk_1.default.gray('Stack trace:'));
            console.error(chalk_1.default.gray(error.stack));
        }
        process.exit(1);
    }
}
/**
 * Init command implementation
 */
async function initCommand() {
    console.log(chalk_1.default.blue.bold('🔧 Creating Shopify App Bridge Mock configuration...'));
    const configContent = `// Shopify Mock Bridge Configuration
// Generated by: npx mock-bridge init

module.exports = {
  // Your app configuration
  appUrl: 'http://localhost:3000/shopify', // Your app's URL (include path if needed)
  
  // Shopify app credentials
  clientId: process.env.SHOPIFY_API_KEY,  // Your Shopify app's client ID
  clientSecret: '${constants_1.STANDARD_MOCK_SECRET}', // Standard mock secret for development only
  
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
    const configPath = path_1.default.join(process.cwd(), 'mock.config.js');
    if (fs_1.default.existsSync(configPath)) {
        console.log(chalk_1.default.yellow('⚠️  Configuration file already exists:'), chalk_1.default.gray(configPath));
        console.log(chalk_1.default.gray('   Use --force to overwrite'));
        return;
    }
    fs_1.default.writeFileSync(configPath, configContent);
    console.log(chalk_1.default.green('✅ Created configuration file:'), chalk_1.default.cyan('mock.config.js'));
    console.log();
    console.log(chalk_1.default.white.bold('🎯 Next Steps:'));
    console.log(chalk_1.default.gray('   1. Edit'), chalk_1.default.cyan('mock.config.js'), chalk_1.default.gray('with your app settings'));
    console.log(chalk_1.default.gray('   2. Set'), chalk_1.default.cyan('SHOPIFY_API_KEY'), chalk_1.default.gray('environment variable'));
    console.log(chalk_1.default.gray('   3. Run'), chalk_1.default.green('npx mock-bridge'), chalk_1.default.gray('to start'));
    console.log();
    console.log(chalk_1.default.yellow('💡 Example package.json scripts:'));
    console.log(chalk_1.default.gray('   {'));
    console.log(chalk_1.default.gray('     "scripts": {'));
    console.log(chalk_1.default.gray('       "mock:admin": "mock-bridge",'));
    console.log(chalk_1.default.gray('       "dev:mock": "concurrently \\"npm run dev\\" \\"npm run mock:admin\\""'));
    console.log(chalk_1.default.gray('     }'));
    console.log(chalk_1.default.gray('   }'));
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
    .action(async (appUrl, options) => {
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
    .action(async (appUrl, options) => {
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
//# sourceMappingURL=index.js.map