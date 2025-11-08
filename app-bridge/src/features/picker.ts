export function picker(): NonNullable<typeof window.shopify>['picker'] {
  return async (options) => {
    console.log('[MockAppBridge] Picker opened with options:', options);
    return {
      selected: Promise.resolve([]),
    };
  };
}
