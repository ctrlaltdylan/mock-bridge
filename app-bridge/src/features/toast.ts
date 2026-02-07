export function toast(): NonNullable<typeof window.shopify>['toast'] {
  let toastId = 0;

  return {
    show: (message: string, opts?: { duration?: number; isError?: boolean }) => {
      const id = `toast-${++toastId}`;
      console.log('[MockAppBridge] Toast:', message, opts);
      return id;
    },
    hide: (id: string) => {
      console.log('[MockAppBridge] Hide toast:', id);
    },
  };
}
