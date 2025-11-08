export function app(): NonNullable<typeof window.shopify>['app'] {
  return {
    extensions: async () => {
      console.log('[MockAppBridge] Extensions requested');
      return [];
    },
  };
}
