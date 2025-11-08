export function user(): NonNullable<typeof window.shopify>['user'] {
  return async () => {
    return {
      id: 0,
      email: '',
      name: '',
    };
  };
}
