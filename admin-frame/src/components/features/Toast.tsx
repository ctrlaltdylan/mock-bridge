import { useEffect } from "react";
import { useStore } from "zustand";
import { stores, type Toast as ToastData } from "../../store/features";

const DEFAULT_DURATION = 5000;

function ToastItem({ toast }: { toast: ToastData }) {
  useEffect(() => {
    const timeout = setTimeout(() => stores.toast.getState().hide({ id: toast.id }), toast.duration ?? DEFAULT_DURATION);
    return () => clearTimeout(timeout);
  }, [toast.id, toast.duration]);

  return (
    <div
      className="toast"
      role="status"
      data-error={toast.isError || undefined}
      style={{
        padding: '10px 16px',
        borderRadius: '8px',
        color: '#fff',
        backgroundColor: toast.isError ? '#8e1f0b' : '#1a1a1a',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        fontSize: '14px',
      }}
    >
      {toast.message}
    </div>
  );
}

export function Toast() {
  const toasts = useStore(stores.toast, state => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 9999,
      }}
    >
      {toasts.map(toast => <ToastItem key={toast.id} toast={toast} />)}
    </div>
  );
}
