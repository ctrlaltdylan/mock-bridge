export function support(): NonNullable<typeof window.shopify>['support'] {
  return {
    registerHandler: async (callback: (() => void | Promise<void>) | null) => {
      console.log('[MockAppBridge] Support handler registered:', callback);
    },
  };
}
