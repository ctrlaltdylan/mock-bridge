import { createFeatureStores } from "../../../src/core/stores";

export type { ModalContent, ModalState, NavItem, SaveBarState, Toast } from "../../../src/core/stores";

/** The admin's state for each App Bridge feature, shared with the in-process test host. */
export const stores = createFeatureStores();
