export function environment(): NonNullable<typeof window.shopify>['environment'] {
  return {
    embedded: window.self !== window.top,
    mobile: /mobile|android|iphone|ipad/i.test(navigator.userAgent),
    pos: false,
  };
}
