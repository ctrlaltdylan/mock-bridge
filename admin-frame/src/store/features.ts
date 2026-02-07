import { useModalFeatureStore } from "./features/modal";
import { useLoadingFeatureStore } from "./features/loading";
import { useSaveBarFeatureStore } from "./features/save-bar";
import { useNavMenuFeatureStore } from "./features/nav-menu";

export const features = {
  modal: useModalFeatureStore,
  loading: useLoadingFeatureStore,
  saveBar: useSaveBarFeatureStore,
  navMenu: useNavMenuFeatureStore,
}

export type FeatureName = keyof typeof features;
export type FeatureStore<F extends FeatureName> = ReturnType<typeof features[F]['getState']>;
export type FeatureActions<F extends FeatureName> = {
  [K in keyof FeatureStore<F> as FeatureStore<F>[K] extends (...args: any[]) => any ? K : never]: FeatureStore<F>[K];
};
export type FeatureActionName<F extends FeatureName> = keyof FeatureActions<F>;
export type FeatureActionPayload<F extends FeatureName, A extends FeatureActionName<F>> = FeatureActions<F>[A] extends (payload: infer P) => any ? P : never;

export function getFeatureStore<F extends FeatureName>(name: F) {
  if (!features[name]) {
    throw new Error(`Feature ${name} not found/supported`);
  }

  return features[name];
}