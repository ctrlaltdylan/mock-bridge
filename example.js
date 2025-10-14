/**
 * Example usage of the Shopify App Bridge Mock
 * 
 * Run this example:
 * 1. First build the package: pnpm build
 * 2. Run the example: node example.js
 * 3. Open http://localhost:3080 in your browser
 */

const { MockShopifyAdminServer } = require('./dist');

async function runExample() {
  console.log('Starting Mock Shopify Admin Server...\n');

  // Configure the mock server
  const mockServer = new MockShopifyAdminServer({
    // Your app's URL
    appUrl: 'http://localhost:3044',
    appPath: '/shopify',  // Path where your app handles Shopify requests
    
    // Mock development credentials
    clientId: 'mock-dev-client',
    clientSecret: 'mock-dev-secret-12345',
    
    // Mock shop
    shop: 'test-store.myshopify.com',
    port: 3080,
    debug: true,
  });

  // Start the server
  await mockServer.start();

  console.log(`
🎉 Mock Shopify Admin is running!
=================================
🌐 Open: http://localhost:3080
🎯 Embedding: http://localhost:3044/shopify

Your app should:
• Be running at http://localhost:3044
• Handle the /shopify route for embedded mode
• Use App Bridge for authentication

Press Ctrl+C to stop the server.
  `);

  // Keep the server running
  process.on('SIGINT', async () => {
    console.log('\n\nStopping Mock Shopify Admin Server...');
    await mockServer.stop();
    process.exit(0);
  });
}

// Run the example
runExample().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});