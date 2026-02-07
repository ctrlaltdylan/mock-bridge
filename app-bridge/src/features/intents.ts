export function intents(): NonNullable<typeof window.shopify>['intents'] {
  return {
    invoke: async (query) => {
      console.log('[MockAppBridge] Intent invoked:', query);
      return {
        complete: Promise.resolve({ code: 'ok' }),
      };
    },
    register: (callback) => {
      console.log('[MockAppBridge] Intent handler registered:', callback);
      return () => { };
    },
  };
}
