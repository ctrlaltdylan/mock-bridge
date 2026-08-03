import { invokeFeature } from './invokeFeature';

export type ResourcePickerBridgeOpenPayload = {
  type?: 'product' | 'variant' | 'collection';
  multiple?: boolean;
  selectionIds?: string[];
};

export type ResourcePickerBridgeResult = {
  cancelled: boolean;
  selection: unknown[];
};

export async function openMockResourcePickerFromBridge(
  options: ResourcePickerBridgeOpenPayload,
): Promise<ResourcePickerBridgeResult> {
  const raw = (await invokeFeature(
    'resourcePicker',
    'open',
    options,
    300_000,
  )) as ResourcePickerBridgeResult;
  if (!raw || typeof raw !== 'object') {
    return { cancelled: true, selection: [] };
  }
  return {
    cancelled: Boolean(raw.cancelled),
    selection: Array.isArray(raw.selection) ? raw.selection : [],
  };
}

/** Map legacy App Bridge ResourcePicker option enums to bridge payload. */
export function bridgePayloadFromLegacyResourcePickerOptions(options: {
  type?: string;
  multiple?: boolean;
  selectionIds?: string[];
}): ResourcePickerBridgeOpenPayload {
  let type: ResourcePickerBridgeOpenPayload['type'] = 'product';
  if (options?.type === 'variant' || options?.type === 'product_variant') {
    type = 'variant';
  } else if (options?.type === 'collection') {
    type = 'collection';
  }
  return {
    type,
    multiple: options?.multiple,
    selectionIds: options?.selectionIds,
  };
}
