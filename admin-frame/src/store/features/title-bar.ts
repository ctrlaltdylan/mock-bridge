import { create } from "zustand";
import { combine } from "zustand/middleware";

export type TitleBarButton = {
  id: string;
  label: string;
  disabled?: boolean;
}

export type TitleBarState = {
  title: string;
  breadcrumbs: TitleBarButton[];
  primary: TitleBarButton | null;
  secondary: TitleBarButton[];
}

const emptyTitleBar: TitleBarState = {
  title: '',
  breadcrumbs: [],
  primary: null,
  secondary: [],
};

export const useTitleBarFeatureStore = create(combine(
  emptyTitleBar,
  set => ({
    update: (payload: TitleBarState) => set(payload),
    clear: () => set(emptyTitleBar),
  })
));
