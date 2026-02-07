export function webVitals(): NonNullable<typeof window.shopify>['webVitals'] {
  return {
    onReport: async (callback) => {
      console.log('[MockAppBridge] Web Vitals callback registered:', callback);
    },
  };
}
