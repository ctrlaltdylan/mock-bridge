import { create } from "zustand";
import { combine } from "zustand/middleware";

type SaveBarState = {
  id: string;
  visible: boolean;
  discardConfirmation: boolean;
}

type SaveBarFeatureState = {
  saveBars: Record<string, SaveBarState>;
}

const defaultSaveBarState: SaveBarState = {
  id: '',
  visible: false,
  discardConfirmation: false,
};

export const useSaveBarFeatureStore = create(combine(
  { saveBars: {} } as SaveBarFeatureState,
  (set) => ({
    show: (payload: { id: string }) => set(state => ({
      saveBars: {
        ...state.saveBars,
        [payload.id]: {
          ...(state.saveBars[payload.id] || { ...defaultSaveBarState, id: payload.id }),
          visible: true,
        },
      },
    })),

    hide: (payload: { id: string }) => set(state => ({
      saveBars: {
        ...state.saveBars,
        [payload.id]: {
          ...(state.saveBars[payload.id] || { ...defaultSaveBarState, id: payload.id }),
          visible: false,
        },
      },
    })),

    toggle: (payload: { id: string }) => set(state => {
      const current = state.saveBars[payload.id];
      return {
        saveBars: {
          ...state.saveBars,
          [payload.id]: {
            ...(current || { ...defaultSaveBarState, id: payload.id }),
            visible: !current?.visible,
          },
        },
      };
    }),

    update: (payload: { id: string; discardConfirmation?: boolean }) => set(state => ({
      saveBars: {
        ...state.saveBars,
        [payload.id]: {
          ...(state.saveBars[payload.id] || { ...defaultSaveBarState, id: payload.id }),
          discardConfirmation: payload.discardConfirmation ?? false,
        },
      },
    })),
  })
));
