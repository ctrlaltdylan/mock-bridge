import { create } from "zustand";
import { combine } from "zustand/middleware";

export type ToastItem = {
  id: string;
  message: string;
  duration: number;
  isError: boolean;
  action?: string;
}

type ToastShowPayload = {
  id: string;
  message: string;
  duration?: number;
  isError?: boolean;
  action?: string;
}

type ToastFeatureState = {
  toasts: ToastItem[];
}

export const useToastFeatureStore = create(combine(
  { toasts: [] } as ToastFeatureState,
  set => ({
    show: (payload: ToastShowPayload) => set(state => ({
      toasts: [
        ...state.toasts.filter(toast => toast.id !== payload.id),
        {
          id: payload.id,
          message: payload.message,
          duration: payload.duration ?? 5000,
          isError: Boolean(payload.isError),
          action: payload.action,
        },
      ],
    })),
    hide: (payload: { id: string }) => set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== payload.id),
    })),
  })
));
