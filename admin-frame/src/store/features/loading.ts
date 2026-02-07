import { create } from "zustand";
import { combine } from "zustand/middleware";

type LoadingFeatureState = {
  isLoading: boolean;
}

export const useLoadingFeatureStore = create(combine(
  { isLoading: false } as LoadingFeatureState,
  set => ({
    setLoading: (payload: { isLoading: boolean }) => set({ isLoading: payload.isLoading }),
  })
));
