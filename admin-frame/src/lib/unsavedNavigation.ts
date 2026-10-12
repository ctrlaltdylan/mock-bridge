import { useSaveBarFeatureStore } from "../store/features/save-bar";

export function isSaveBarDirty() {
  return Object.values(useSaveBarFeatureStore.getState().saveBars).some(saveBar => saveBar.visible);
}

function playShakeAnimation() {
  const node = document.querySelector('.admin-save-cluster');
  if (!(node instanceof HTMLElement)) return;
  node.classList.remove('is-shaking');
  // Force a reflow so consecutive blocks replay the animation.
  void node.offsetWidth;
  node.classList.add('is-shaking');
  window.setTimeout(() => node.classList.remove('is-shaking'), 500);
}

export function shakeSaveBar() {
  useSaveBarFeatureStore.getState().shake();
  playShakeAnimation();
}

/**
 * Shopify Admin blocks route changes while the save bar is open and shakes it.
 * Returns false when navigation must be cancelled.
 */
export function allowNavigation() {
  if (!isSaveBarDirty()) return true;
  shakeSaveBar();
  return false;
}
