import { create } from "zustand";
import { combine } from "zustand/middleware";

type SaveBarButton = {
  id: string;
  label: string;
  variant?: string;
  disabled?: boolean;
  loading?: boolean;
}

type SaveBarState = {
  id: string;
  visible: boolean;
  discardConfirmation: boolean;
  buttons: SaveBarButton[];
}

type SaveBarFeatureState = {
  saveBars: Record<string, SaveBarState>;
  /** Bumped to replay the shake animation while dirty navigation is blocked. */
  shakeToken: number;
}

const defaultSaveBarState: SaveBarState = {
  id: '',
  visible: false,
  discardConfirmation: false,
  buttons: [],
};

export const useSaveBarFeatureStore = create(combine(
  { saveBars: {}, shakeToken: 0 } as SaveBarFeatureState,
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

    update: (payload: { id: string; discardConfirmation?: boolean; buttons?: SaveBarButton[] }) => set(state => ({
      saveBars: {
        ...state.saveBars,
        [payload.id]: {
          ...(state.saveBars[payload.id] || { ...defaultSaveBarState, id: payload.id }),
          discardConfirmation: payload.discardConfirmation ?? false,
          buttons: payload.buttons ?? state.saveBars[payload.id]?.buttons ?? [],
        },
      },
    })),

    shake: () => set(state => ({ shakeToken: state.shakeToken + 1 })),
  })
));
