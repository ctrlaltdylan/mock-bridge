import { create } from "zustand";
import { combine } from "zustand/middleware";

export type NavItem = {
  label: string;
  href: string;
  isHome?: boolean;
  active?: boolean;
}

type NavMenuFeatureState = {
  items: NavItem[];
}

export const useNavMenuFeatureStore = create(combine(
  { items: [] } as NavMenuFeatureState,
  set => ({
    setItems: (payload: { items: NavItem[] }) => set({ items: payload.items }),

    addItem: (payload: NavItem) => set(state => ({
      items: [...state.items, payload],
    })),

    clearItems: () => set({ items: [] }),
  })
));
