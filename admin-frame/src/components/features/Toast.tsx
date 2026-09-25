import { useEffect, useRef } from "react";
import { postToEmbeddedApp } from "../../lib/embeddedFrame";
import { useToastFeatureStore } from "../../store/features/toast";

function dismissToast(id: string) {
  const exists = useToastFeatureStore.getState().toasts.some(toast => toast.id === id);
  if (!exists) return;

  useToastFeatureStore.getState().hide({ id });
  postToEmbeddedApp({ type: 'TOAST_DISMISS', id });
}

function ErrorMark() {
  return (
    <svg className="mock-toast-icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#e51c00" />
      <path fill="#fff" d="M9.1 4.8h1.8v6.2H9.1V4.8zm0 7.6h1.8v1.8H9.1v-1.8z" />
    </svg>
  );
}

export function Toast() {
  const toasts = useToastFeatureStore(state => state.toasts);
  const scheduled = useRef(new Set<string>());

  useEffect(() => {
    toasts.forEach(toast => {
      if (scheduled.current.has(toast.id) || toast.duration === 0) return;
      scheduled.current.add(toast.id);

      const duration = toast.duration > 0 ? toast.duration : 5000;
      window.setTimeout(() => {
        scheduled.current.delete(toast.id);
        dismissToast(toast.id);
      }, duration);
    });
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="mock-toasts">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={toast.isError ? 'mock-toast is-error' : 'mock-toast'}
          role="status"
        >
          {toast.isError && <ErrorMark />}
          <span className="mock-toast-message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="mock-toast-action"
              onClick={() => {
                postToEmbeddedApp({ type: 'TOAST_ACTION', id: toast.id });
                dismissToast(toast.id);
              }}
            >
              {toast.action}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
