import { create } from "zustand";
import { combine } from "zustand/middleware";

export type ModalContent = {
  id: string;
  title: string;
  variant?: string;
  src: string | null;
  buttons: Array<{
    id: string;
    label: string;
    variant?: string;
    tone?: string;
    disabled?: boolean;
    loading?: boolean;
  }>;
}

type ModalFeatureState = {
  modalStates: Record<string, {
    open: boolean;
    heading: string;
    content: ModalContent;
    html: string;
  }>;
}

export const useModalFeatureStore = create(combine(
  { modalStates: {} } as ModalFeatureState,
  set => ({
    show: (payload: { id: string }) => set(state => {
      const modalState = state.modalStates[payload.id];

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: {
            ...modalState,
            open: true
          },
        },
      };
    }),
    hide: (payload: { id: string }) => set(state => {
      const modalState = state.modalStates[payload.id];

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: {
            ...modalState,
            open: false
          },
        },
      };
    }),
    toggle: (payload: { id: string }) => set(state => {
      const modalState = state.modalStates[payload.id];

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: {
            ...modalState,
            open: !modalState?.open || false
          },
        },
      };
    }),
    update: (payload: { id: string, heading: string, content: ModalContent }) => set(state => {
      const modalState = state.modalStates[payload.id];

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: {
            ...modalState,
            heading: payload.heading,
            content: payload.content,
          },
        },
      };
    }),
    updateHtml: (payload: { id: string, html: string }) => set(state => {
      const modalState = state.modalStates[payload.id];

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: { ...modalState, html: payload.html },
        },
      };
    }),
  })
));
