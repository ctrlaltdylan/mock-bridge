export function config(): NonNullable<typeof window.shopify>['config'] {
  return {
    apiKey: '',
    shop: '',
    locale: 'en',
  };
}
