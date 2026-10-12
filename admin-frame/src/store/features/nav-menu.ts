import { create } from "zustand";
import { combine } from "zustand/middleware";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  isHome?: boolean;
  active?: boolean;
}

type NavMenuFeatureState = {
  items: NavItem[];
  pathname: string;
  appName: string;
}

export const useNavMenuFeatureStore = create(combine(
  { items: [], pathname: '', appName: '' } as NavMenuFeatureState,
  set => ({
    setItems: (payload: { items: NavItem[] }) => set({ items: payload.items }),

    setLocation: (payload: { pathname: string }) => set({ pathname: payload.pathname }),

    setAppName: (payload: { appName: string }) => set({ appName: payload.appName }),

    addItem: (payload: NavItem) => set(state => ({
      items: [...state.items, payload],
    })),

    clearItems: () => set({ items: [] }),
  })
));
