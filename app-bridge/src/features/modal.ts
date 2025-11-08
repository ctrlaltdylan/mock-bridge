export function modal(): NonNullable<typeof window.shopify>['modal'] {
  const state = {
    open: false,
  };

  return {
    toggle: async (id: string) => {
      state.open = !state.open;
    },
    show: async (id: string) => {
      state.open = true;
    },
    hide: async (id: string) => {

    },
  };
}