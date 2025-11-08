
export function resourcePicker(): NonNullable<typeof window.shopify>['resourcePicker'] {
  return async (options) => {
    console.log('[MockAppBridge] Resource picker opened with options:', options);

    // TODO: Resource picker types are a bit complicated.
    // But this should be enough for a placeholder
    return Promise.resolve([] as any);
  };
}
