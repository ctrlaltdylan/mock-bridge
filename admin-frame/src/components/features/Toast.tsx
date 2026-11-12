import { useEffect } from "preact/hooks";
import { stores, toasts, type Toast as ToastData } from "../../store/features";

const DEFAULT_DURATION = 5000;

function ToastItem({ toast }: { toast: ToastData }) {
  useEffect(() => {
    const timeout = setTimeout(() => stores.toast.actions.hide({ id: toast.id }), toast.duration ?? DEFAULT_DURATION);
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
  if (toasts.value.length === 0) return null;

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
      {toasts.value.map(toast => <ToastItem key={toast.id} toast={toast} />)}
    </div>
  );
}
