import { useEffect, useRef } from "react";
import { activateEmbeddedElement, postToEmbeddedApp } from "../../lib/embeddedFrame";
import { useSaveBarFeatureStore } from "../../store/features/save-bar";

type SaveBarLayout = 'titlebar' | 'contextual';

type SaveBarProps = {
  /**
   * titlebar — black pill in admin page header (default).
   * contextual — full-width strip for max modal (Shopify contextual save bar).
   */
  layout?: SaveBarLayout;
};

function WarningIcon() {
  return (
    <svg
      className="admin-save-warning-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 1.5 14.5 13h-13L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 6v3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.8" fill="currentColor" />
    </svg>
  );
}

/**
 * Unsaved-changes actions.
 * Titlebar layout: center cluster of the admin title bar.
 * Contextual layout: full-width bar at the top of a max modal (screenshot).
 */
export function SaveBar({ layout = 'titlebar' }: SaveBarProps) {
  const saveBars = useSaveBarFeatureStore(state => state.saveBars);
  const shakeToken = useSaveBarFeatureStore(state => state.shakeToken);
  const hide = useSaveBarFeatureStore(state => state.hide);
  const visibleSaveBars = Object.values(saveBars).filter(saveBar => saveBar.visible);
  const clusterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shakeToken) return;
    const node = clusterRef.current;
    if (!node) return;
    node.classList.remove('is-shaking');
    void node.offsetWidth;
    node.classList.add('is-shaking');
    const timer = window.setTimeout(() => node.classList.remove('is-shaking'), 500);
    return () => window.clearTimeout(timer);
  }, [shakeToken]);

  if (visibleSaveBars.length === 0) return null;

  const activeSaveBar = visibleSaveBars[0];
  const buttons = activeSaveBar.buttons;
  const secondary = buttons.filter(button => button.variant !== 'primary');
  const primary = buttons.filter(button => button.variant === 'primary');
  const isContextual = layout === 'contextual';

  const confirmDiscard = () => {
    if (!activeSaveBar.discardConfirmation) return true;
    return window.confirm('Discard all unsaved changes?');
  };

  const discardFallback = () => {
    if (!confirmDiscard()) return;
    postToEmbeddedApp({ type: 'SAVE_BAR_DISCARD', id: activeSaveBar.id });
    hide({ id: activeSaveBar.id });
  };

  const saveFallback = () => {
    postToEmbeddedApp({ type: 'SAVE_BAR_SAVE', id: activeSaveBar.id });
  };

  const status = (
    <span className="admin-save-status">
      {isContextual && <WarningIcon />}
      Unsaved changes
    </span>
  );

  const actions = buttons.length === 0 ? (
    <>
      <button
        type="button"
        className={isContextual ? 'admin-save-button is-discard' : 'admin-save-button'}
        onClick={discardFallback}
      >
        Discard
      </button>
      <button
        type="button"
        className="admin-save-button is-primary"
        onClick={saveFallback}
      >
        Save
      </button>
    </>
  ) : (
    <>
      {secondary.map(button => (
        <button
          key={button.id}
          type="button"
          className={isContextual ? 'admin-save-button is-discard' : 'admin-save-button'}
          disabled={button.disabled || button.loading}
          onClick={() => {
            const isDiscard = button.label.toLowerCase() === 'discard';
            if (isDiscard && !confirmDiscard()) return;
            activateEmbeddedElement(button.id);
          }}
        >
          {button.label}
        </button>
      ))}
      {primary.map(button => (
        <button
          key={button.id}
          type="button"
          className={button.loading ? 'admin-save-button is-primary is-loading' : 'admin-save-button is-primary'}
          disabled={button.disabled || button.loading}
          aria-busy={button.loading || undefined}
          onClick={() => activateEmbeddedElement(button.id)}
        >
          {button.loading ? <span className="admin-save-spinner" aria-hidden="true" /> : button.label}
        </button>
      ))}
    </>
  );

  return (
    <div
      ref={clusterRef}
      className={isContextual ? 'admin-save-cluster is-contextual' : 'admin-save-cluster'}
      role="group"
      aria-label="Unsaved changes"
    >
      {status}
      <div className="admin-save-actions">{actions}</div>
    </div>
  );
}

/** True when any save bar is currently visible (for max-modal chrome swap). */
export function useSaveBarVisible() {
  return useSaveBarFeatureStore(state =>
    Object.values(state.saveBars).some(saveBar => saveBar.visible),
  );
}
