import { invokeFeature } from "../invokeFeature";

type ToastOptions = {
  duration?: number;
  isError?: boolean;
  action?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

const actionHandlers = new Map<string, () => void>();
const dismissHandlers = new Map<string, () => void>();
let listening = false;

function listenForToastCommands() {
  if (listening || typeof window === 'undefined') return;
  listening = true;

  window.addEventListener('message', (event: MessageEvent) => {
    const id = event.data?.id;
    if (typeof id !== 'string') return;

    if (event.data?.type === 'TOAST_ACTION') {
      actionHandlers.get(id)?.();
    }

    if (event.data?.type === 'TOAST_DISMISS') {
      dismissHandlers.get(id)?.();
      actionHandlers.delete(id);
      dismissHandlers.delete(id);
    }
  });
}

export function toast(): NonNullable<typeof window.shopify>['toast'] {
  let toastId = 0;
  listenForToastCommands();

  return {
    show: (message: string, opts?: ToastOptions) => {
      const id = `toast-${++toastId}`;
      if (opts?.onAction) actionHandlers.set(id, opts.onAction);
      if (opts?.onDismiss) dismissHandlers.set(id, opts.onDismiss);

      void invokeFeature('toast', 'show', {
        id,
        message,
        duration: opts?.duration,
        isError: opts?.isError,
        action: opts?.action,
      }).catch(() => {});

      return id;
    },
    hide: (id: string) => {
      void invokeFeature('toast', 'hide', { id }).catch(() => {});
      dismissHandlers.get(id)?.();
      actionHandlers.delete(id);
      dismissHandlers.delete(id);
    },
  };
}
