export function saveBar(): NonNullable<typeof window.shopify>['saveBar'] {
  return {
    leaveConfirmation: async () => {},
    toggle: async () => {},
    hide: async () => {},
    show: async () => {},
  };
}
