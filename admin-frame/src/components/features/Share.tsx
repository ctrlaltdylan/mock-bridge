import { useEffect } from "preact/hooks";
import type { ShareOutcome } from "../../../../src/core/stores";
import { shareRequest, stores } from "../../store/features";

const settle = (outcome: ShareOutcome) => stores.share.actions.settle({ outcome });

const buttonStyle = {
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  border: '1px solid #c9c9c9',
  backgroundColor: '#fff',
} as const;

/** The share sheet `navigator.share()` opens. */
export function Share() {
  const current = shareRequest.value;

  useEffect(() => {
    if (!current) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') settle('cancelled');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current]);

  if (!current) return null;

  return (
    <div
      className="share-sheet-backdrop"
      onClick={event => event.target === event.currentTarget && settle('cancelled')}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        role="dialog"
        aria-label="Share"
        className="share-sheet"
        style={{
          width: '400px',
          maxWidth: 'calc(100% - 32px)',
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '14px',
          color: '#303030',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '16px' }}>Share</h2>
        {current.title && <strong>{current.title}</strong>}
        {current.text && <p style={{ margin: 0 }}>{current.text}</p>}
        {current.url && (
          <input readOnly value={current.url} onFocus={event => event.currentTarget.select()} style={{ padding: '6px 8px', fontSize: '14px' }} />
        )}
        {current.files?.length ? (
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {current.files.map((file, index) => <li key={index}>{file.name}</li>)}
          </ul>
        ) : null}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {current.url && (
            <button style={{ ...buttonStyle, marginRight: 'auto' }} onClick={() => navigator.clipboard?.writeText(current.url!)}>
              Copy link
            </button>
          )}
          <button style={buttonStyle} onClick={() => settle('cancelled')}>Cancel</button>
          <button
            style={{ ...buttonStyle, backgroundColor: '#1a1a1a', color: '#fff', border: 'none' }}
            onClick={() => settle('shared')}
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
