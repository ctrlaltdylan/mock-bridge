export function reviews(): NonNullable<typeof window.shopify>['reviews'] {
  return {
    request: async () => {
      console.log('[MockAppBridge] Review requested');
      return {
        success: true,
        code: 'success' as const,
        message: 'Review modal shown successfully' as const,
      };
    },
  };
}
