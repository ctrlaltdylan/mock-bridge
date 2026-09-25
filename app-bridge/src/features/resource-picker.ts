import { bridgePayloadFromLegacyResourcePickerOptions, openMockResourcePickerFromBridge } from '../resource-picker-bridge';

export function resourcePicker(): NonNullable<typeof window.shopify>['resourcePicker'] {
  return async (options) => {
    const payload = bridgePayloadFromLegacyResourcePickerOptions({
      type: options?.type,
      multiple: options?.multiple === true,
      selectionIds: options?.selectionIds as string[] | undefined,
    });

    const result = await openMockResourcePickerFromBridge(payload);
    return result.cancelled ? [] as any : result.selection as any;
  };
}
