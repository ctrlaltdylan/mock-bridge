import type {
  MockResourcePickerCollection,
  MockResourcePickerProduct,
  MockResourcePickerVariant,
  ResourcePickerCatalogResponse,
} from '../../../src/mock-resource-picker-catalog';

export type ResourcePickerType = 'product' | 'variant' | 'collection';

/** Payload sent from embedded app (App Bridge) when opening the picker */
export type ResourcePickerOpenOptions = {
  type?: ResourcePickerType;
  multiple?: boolean;
  selectionIds?: string[];
};

export type {
  MockResourcePickerCollection,
  MockResourcePickerProduct,
  MockResourcePickerVariant,
};

/** Same shape as `ResourcePickerCatalogResponse` from the shared catalog module. */
export type ResourcePickerCatalogApiResponse = ResourcePickerCatalogResponse;

/** Selection rows returned to the iframe (product / variant / collection) */
export type ResourcePickerSelectionRow =
  | {
      id: string;
      title: string;
      handle: string;
      variants?: MockResourcePickerVariant[];
    }
  | {
      id: string;
      title: string;
      displayName: string;
      price?: string;
      product?: { id: string; title: string; handle?: string };
    }
  | {
      id: string;
      title: string;
      handle: string;
    };

export type ResourcePickerResultPayload = {
  cancelled: boolean;
  selection: ResourcePickerSelectionRow[];
};
