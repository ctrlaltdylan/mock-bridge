import type { ShopifyGlobal } from '@shopify/app-bridge-types';

/** APIs the mock accepts but has no admin behaviour for. */

const noScopes = { granted: [], required: [], optional: [] };

export const scopes = (): ShopifyGlobal['scopes'] => ({
  query: async () => noScopes,
  request: async () => ({ result: 'granted-all', detail: noScopes }),
  revoke: async () => ({ result: 'granted-all', detail: noScopes }),
});

export const user = (): ShopifyGlobal['user'] => async () => ({ id: 0, email: '', name: '' });

export const scanner = (): ShopifyGlobal['scanner'] => ({
  capture: async () => ({ data: '' }),
});

export const intents = (): ShopifyGlobal['intents'] => ({
  // The app is never launched from an intent.
  request: { value: null, subscribe: () => () => {} },
  invoke: async () => ({ complete: Promise.resolve({ code: 'ok' as const }) }),
  register: () => () => {},
});

export const webVitals = (): ShopifyGlobal['webVitals'] => ({
  onReport: async () => {},
});

export const support = (): ShopifyGlobal['support'] => ({
  registerHandler: async () => {},
});

export const reviews = (): ShopifyGlobal['reviews'] => ({
  request: async () => ({ success: true, code: 'success' as const, message: 'Review modal shown successfully' as const }),
});

export const picker = (): ShopifyGlobal['picker'] => async () => ({ selected: Promise.resolve([]) });

export const app = (): ShopifyGlobal['app'] => ({
  extensions: async () => [],
});

export const shopifyQL = (): ShopifyGlobal['shopifyQL'] => ({
  available: async () => false,
});

export function tools(): ShopifyGlobal['tools'] {
  const handlers = new Map<string, unknown>();
  return {
    register: (name, handler) => {
      handlers.set(name, handler);
      return () => handlers.delete(name);
    },
    unregister: name => { handlers.delete(name); },
    clear: () => handlers.clear(),
  };
}

export function pos(): ShopifyGlobal['pos'] {
  const noop = async () => {};
  return {
    cart: {
      fetch: async () => ({ subTotal: '0.00', taxTotal: '0.00', grandTotal: '0.00', lineItems: [], properties: {} }),
      subscribe: () => () => {},
      setCustomer: noop,
      removeCustomer: noop,
      addAddress: noop,
      updateAddress: noop,
      applyCartDiscount: noop,
      applyCartCodeDiscount: noop,
      removeCartDiscount: noop,
      removeAllDiscounts: noop,
      addCartProperties: noop,
      removeCartProperties: noop,
      addCustomSale: noop,
      clear: noop,
      addLineItem: noop,
      updateLineItem: noop,
      removeLineItem: noop,
      setLineItemDiscount: noop,
      removeLineItemDiscount: noop,
      addLineItemProperties: noop,
      removeLineItemProperties: noop,
    },
    close: noop,
    device: async () => ({ name: '', serialNumber: '' }),
    location: async () => ({ id: 0, name: '', active: true }),
  } as ShopifyGlobal['pos'];
}
