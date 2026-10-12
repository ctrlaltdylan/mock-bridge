import { create } from "zustand";
import { combine } from "zustand/middleware";

export type ModalStyles = {
  links: string[];
  inline: string[];
}

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
    styles: ModalStyles;
    frameHeight?: number;
  }>;
}

const MODAL_VARIANTS = new Set(['small', 'base', 'large', 'max']);

/** App Bridge: a Modal without `variant` (or with an unknown one) is `base`. */
function normalizeModalContent(content: ModalContent): ModalContent {
  const variant = content.variant && MODAL_VARIANTS.has(content.variant) ? content.variant : 'base';
  return { ...content, variant };
}

const defaultModalState = {
  open: false,
  heading: '',
  content: {
    id: '',
    title: '',
    variant: 'base',
    src: null,
    buttons: [],
  },
  html: '',
  styles: { links: [] as string[], inline: [] as string[] },
};

export const useModalFeatureStore = create(combine(
  { modalStates: {} } as ModalFeatureState,
  set => ({
    show: (payload: { id: string; content?: ModalContent; heading?: string }) => set(state => {
      const modalState = state.modalStates[payload.id] || {
        ...defaultModalState,
        content: { ...defaultModalState.content, id: payload.id },
      };

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: {
            ...modalState,
            open: true,
            heading: payload.heading ?? modalState.heading,
            content: payload.content
              ? normalizeModalContent({ ...modalState.content, ...payload.content, id: payload.id })
              : modalState.content,
          },
        },
      };
    }),
    hide: (payload: { id: string }) => set(state => {
      const modalState = state.modalStates[payload.id] || {
        ...defaultModalState,
        content: { ...defaultModalState.content, id: payload.id },
      };

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: {
            ...modalState,
            open: false,
          },
        },
      };
    }),
    toggle: (payload: { id: string }) => set(state => {
      const modalState = state.modalStates[payload.id] || {
        ...defaultModalState,
        content: { ...defaultModalState.content, id: payload.id },
      };

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: {
            ...modalState,
            open: !modalState.open,
          },
        },
      };
    }),
    update: (payload: {
      id: string;
      heading: string;
      content: ModalContent;
      styles?: ModalStyles;
    }) => set(state => {
      const modalState = state.modalStates[payload.id] || {
        ...defaultModalState,
        content: { ...defaultModalState.content, id: payload.id },
      };

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: {
            ...modalState,
            heading: payload.heading,
            content: normalizeModalContent(payload.content),
            styles: payload.styles || modalState.styles,
          },
        },
      };
    }),
    setFrameHeight: (payload: { id: string; height: number }) => set(state => {
      const modalState = state.modalStates[payload.id] || {
        ...defaultModalState,
        content: { ...defaultModalState.content, id: payload.id },
      };
      if (modalState.frameHeight === payload.height) return state;

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: { ...modalState, frameHeight: payload.height },
        },
      };
    }),
    updateHtml: (payload: { id: string; html: string }) => set(state => {
      const modalState = state.modalStates[payload.id] || {
        ...defaultModalState,
        content: { ...defaultModalState.content, id: payload.id },
      };

      return {
        modalStates: {
          ...state.modalStates,
          [payload.id]: { ...modalState, html: payload.html },
        },
      };
    }),
  })
));
