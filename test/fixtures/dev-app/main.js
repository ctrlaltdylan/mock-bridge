// Runs inside the mock admin's iframe, served by `vite dev`.
window.results = (async () => {
  const response = await fetch('shopify:admin/api/2025-10/graphql.json', {
    method: 'POST',
    body: JSON.stringify({ query: 'query { shop { name } }' }),
  });
  shopify.toast.show('Hello from vite dev');
  return {
    shop: shopify.config.shop,
    shopName: (await response.json()).data.shop.name,
    token: (await shopify.idToken()).split('.').length,
  };
})();
