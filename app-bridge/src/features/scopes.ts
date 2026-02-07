export function scopes(): NonNullable<typeof window.shopify>['scopes'] {
  return {
    query: async () => {
      return {
        granted: [],
        required: [],
        optional: [],
      };
    },
    request: async () => {
      return {
        result: 'granted-all' as const,
        detail: {
          granted: [],
          required: [],
          optional: [],
        },
      };
    },
    revoke: async () => {
      return {
        result: 'granted-all' as const,
        detail: {
          granted: [],
          required: [],
          optional: [],
        },
      };
    },
  };
}
