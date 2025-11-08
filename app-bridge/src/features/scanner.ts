export function scanner(): NonNullable<typeof window.shopify>['scanner'] {
  return {
    capture: async () => {
      return {
        data: '',
      };
    },
  };
}
