import { useSaveBarFeatureStore } from "../../store/features/save-bar";

export function SaveBar() {
  const saveBars = useSaveBarFeatureStore(state => state.saveBars);
  const hide = useSaveBarFeatureStore(state => state.hide);

  // Get all visible save bars
  const visibleSaveBars = Object.values(saveBars).filter(sb => sb.visible);

  if (visibleSaveBars.length === 0) return null;

  // Show the first visible save bar (typically there's only one at a time)
  const activeSaveBar = visibleSaveBars[0];

  const handleSave = () => {
    // Send message to iframe to trigger save
    const iframe = document.getElementById('app-iframe') as HTMLIFrameElement;
    iframe?.contentWindow?.postMessage({
      type: 'SAVE_BAR_SAVE',
      id: activeSaveBar.id,
    }, '*');
  };

  const handleDiscard = () => {
    if (activeSaveBar.discardConfirmation) {
      // Could show a confirmation dialog here
      const confirmed = window.confirm('Discard all unsaved changes?');
      if (!confirmed) return;
    }

    // Send message to iframe to trigger discard
    const iframe = document.getElementById('app-iframe') as HTMLIFrameElement;
    iframe?.contentWindow?.postMessage({
      type: 'SAVE_BAR_DISCARD',
      id: activeSaveBar.id,
    }, '*');

    hide({ id: activeSaveBar.id });
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1a1a1a',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9998,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
      }}
    >
      <span style={{ color: '#b5b5b5', marginRight: 'auto' }}>
        Unsaved changes
      </span>
      <button
        onClick={handleDiscard}
        style={{
          padding: '8px 16px',
          backgroundColor: 'transparent',
          color: '#fff',
          border: '1px solid #5c5c5c',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Discard
      </button>
      <button
        onClick={handleSave}
        style={{
          padding: '8px 16px',
          backgroundColor: '#2c6ecb',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Save
      </button>
    </div>
  );
}
