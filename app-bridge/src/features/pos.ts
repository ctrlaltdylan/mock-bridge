export function pos(): NonNullable<typeof window.shopify>['pos'] {
  return {
    cart: {
      fetch: async () => ({
        subTotal: '0.00',
        taxTotal: '0.00',
        grandTotal: '0.00',
        lineItems: [],
        properties: {},
      }),
      subscribe: (callback) => {
        console.log('[MockAppBridge] POS cart subscribed:', callback);
        return () => { };
      },
      setCustomer: async (customer) => {
        console.log('[MockAppBridge] POS setCustomer:', customer);
      },
      removeCustomer: async () => {
        console.log('[MockAppBridge] POS removeCustomer');
      },
      addAddress: async (address) => {
        console.log('[MockAppBridge] POS addAddress:', address);
      },
      updateAddress: async (index, address) => {
        console.log('[MockAppBridge] POS updateAddress:', index, address);
      },
      applyCartDiscount: async (type, discountDescription, amount) => {
        console.log('[MockAppBridge] POS applyCartDiscount:', type, discountDescription, amount);
      },
      applyCartCodeDiscount: async (code) => {
        console.log('[MockAppBridge] POS applyCartCodeDiscount:', code);
      },
      removeCartDiscount: async () => {
        console.log('[MockAppBridge] POS removeCartDiscount');
      },
      removeAllDiscounts: async (disableAutomaticDiscounts) => {
        console.log('[MockAppBridge] POS removeAllDiscounts:', disableAutomaticDiscounts);
      },
      addCartProperties: async (properties) => {
        console.log('[MockAppBridge] POS addCartProperties:', properties);
      },
      removeCartProperties: async (keys: string[]) => {
        console.log('[MockAppBridge] POS removeCartProperties:', keys);
      },
      addCustomSale: async (customSale) => {
        console.log('[MockAppBridge] POS addCustomSale:', customSale);
      },
      clear: async () => {
        console.log('[MockAppBridge] POS clear cart');
      },
      addLineItem: async (variantId: number, quantity: number) => {
        console.log('[MockAppBridge] POS addLineItem:', variantId, quantity);
      },
      updateLineItem: async (uuid: string, quantity: number) => {
        console.log('[MockAppBridge] POS updateLineItem:', uuid, quantity);
      },
      removeLineItem: async (uuid: string) => {
        console.log('[MockAppBridge] POS removeLineItem:', uuid);
      },
      setLineItemDiscount: async (uuid: string, type, discountDescription: string, amount: string) => {
        console.log('[MockAppBridge] POS setLineItemDiscount:', uuid, type, discountDescription, amount);
      },
      removeLineItemDiscount: async (uuid: string) => {
        console.log('[MockAppBridge] POS removeLineItemDiscount:', uuid);
      },
      addLineItemProperties: async (uuid: string, properties: Record<string, string>) => {
        console.log('[MockAppBridge] POS addLineItemProperties:', uuid, properties);
      },
      removeLineItemProperties: async (uuid: string, properties: string[]) => {
        console.log('[MockAppBridge] POS removeLineItemProperties:', uuid, properties);
      },
    },
    close: async () => {
      console.log('[MockAppBridge] POS close');
    },
    device: async () => ({
      name: '',
      serialNumber: '',
    }),
    location: async () => ({
      id: 0,
      name: '',
      active: true,
    }),
  };
}
