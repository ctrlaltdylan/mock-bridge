/**
 * Shopify Resource Picker API mock.
 * @see https://shopify.dev/docs/api/app-home/latest/apis/user-interface-and-interactions/resource-picker-api
 */

type ResourcePickerOptions = {
  type: 'product' | 'collection' | 'variant';
  action?: 'add' | 'select' | string;
  multiple?: boolean | number;
  query?: string;
  selectionIds?: Array<{ id: string; variants?: Array<{ id: string }> }>;
  filter?: {
    hidden?: boolean;
    variants?: boolean;
    draft?: boolean;
    archived?: boolean;
    query?: string;
  };
};

function requestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `rp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function resourcePicker(): NonNullable<typeof window.shopify>['resourcePicker'] {
  return async (options) => {
    const opts = options as ResourcePickerOptions;
    if (!opts?.type) {
      throw new Error('resourcePicker requires a type of product, collection, or variant');
    }

    return new Promise((resolve, reject) => {
      const id = requestId();
      const timeout = window.setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('Resource picker timed out'));
      }, 5 * 60 * 1000);

      const onMessage = (event: MessageEvent) => {
        if (event.data?.type !== 'RESOURCE_PICKER_RESULT') return;
        if (event.data.requestId !== id) return;
        window.clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        // Cancel returns undefined; confirm returns the selected resource array.
        resolve(event.data.selection);
      };

      window.addEventListener('message', onMessage);
      window.parent.postMessage({
        type: 'RESOURCE_PICKER_OPEN',
        requestId: id,
        options: opts,
      }, '*');
    });
  };
}
