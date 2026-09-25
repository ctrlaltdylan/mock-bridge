import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { activateEmbeddedElement, postToEmbeddedApp } from "../../lib/embeddedFrame";
import { useModalFeatureStore, type ModalContent } from "../../store/features/modal";
import { SaveBar, useSaveBarVisible } from "./SaveBar";

/**
 * Customize flow (CustomizationPage → AppBridgeMaxModal):
 *   shopify.modal.show(MODALS.CUSTOMIZATION)
 *   <Modal variant="max" src="customize-embed-*?host&shop">
 *     <TitleBar /> + <SaveBar />
 *   </Modal>
 *
 * Shopify admin hosts the iframe + title chrome; src route boots in that
 * iframe with window.opener = main app (contentWindow on ui-modal).
 * Max/large cannot use <s-modal> (shadow size limits) — custom overlay.
 */

/**
 * Shopify App Bridge: only `max` fills the screen. small/base/large are
 * dialogs (large is just wider) and render in <s-modal>, even with `src` —
 * ModalContentFrame resolves src against the app origin.
 */
function isFullPageModal(content: Pick<ModalContent, 'variant' | 'src'>) {
  return content.variant === 'max';
}

function modalSize(variant?: string): 'small' | 'base' | 'large' {
  if (variant === 'small') return 'small';
  if (variant === 'large' || variant === 'max') return 'large';
  return 'base';
}

function frameHeight(variant?: string) {
  if (variant === 'small') return '40vh';
  if (variant === 'large') return '80vh';
  return '60vh';
}

function appOrigin(): string {
  const main = document.getElementById('app-iframe') as HTMLIFrameElement | null;
  if (!main?.src) return window.location.origin;
  try {
    return new URL(main.src).origin;
  } catch {
    return window.location.origin;
  }
}

/**
 * Resolve Modal src against the embedded app origin.
 * App passes relative paths like `customize-embed-carousel?host=…&shop=…`.
 */
function resolveModalSrc(src: string) {
  try {
    const path = src.startsWith('http') || src.startsWith('/')
      ? src
      : `/${src}`;
    const url = new URL(path, `${appOrigin()}/`);
    url.searchParams.set('mock_modal', '1');
    return url.toString();
  } catch {
    return src;
  }
}

function modalShellSrc() {
  const main = document.getElementById('app-iframe') as HTMLIFrameElement | null;
  if (!main?.src) return '';
  const url = new URL(main.src);
  url.searchParams.set('mock-modal-shell', '1');
  return url.toString();
}

function ModalActionButton({
  button,
}: {
  button: ModalContent['buttons'][number];
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current as (HTMLElement & { onclick: ((event: Event) => void) | null }) | null;
    if (!element) return;

    const handleClick = () => activateEmbeddedElement(button.id);
    element.onclick = handleClick;
    return () => {
      if (element.onclick === handleClick) element.onclick = null;
    };
  }, [button.id]);

  return (
    <s-button
      ref={ref as never}
      slot={button.variant === 'primary' ? 'primary-action' : 'secondary-actions'}
      variant={button.variant as 'primary' | 'secondary' | 'tertiary' | undefined}
      tone={button.tone as 'critical' | 'auto' | undefined}
      disabled={button.disabled || button.loading || undefined}
    >
      {button.label}
    </s-button>
  );
}

function ModalContentFrame({
  id,
  variant,
  src,
  title,
  onLoadStateChange,
}: {
  id: string;
  variant?: string;
  src: string | null;
  title: string;
  onLoadStateChange?: (loading: boolean) => void;
}) {
  const shellSrc = useRef(modalShellSrc());
  const measuredHeight = useModalFeatureStore(state => state.modalStates[id]?.frameHeight);
  if (!shellSrc.current) shellSrc.current = modalShellSrc();

  const fullPage = isFullPageModal({ variant, src });
  const frameSrc = src ? resolveModalSrc(src) : shellSrc.current;

  useEffect(() => {
    if (!frameSrc) {
      onLoadStateChange?.(false);
      return;
    }
    onLoadStateChange?.(true);
  }, [frameSrc, onLoadStateChange]);

  if (!frameSrc) return null;

  return (
    <iframe
      key={frameSrc}
      name={`mock-modal-${id}`}
      src={frameSrc}
      title={title}
      className={fullPage ? 'mock-modal-frame is-fullpage' : 'mock-modal-frame'}
      style={fullPage ? undefined : {
        width: '100%',
        height: measuredHeight ? `${measuredHeight}px` : frameHeight(variant),
        maxHeight: frameHeight(variant),
        border: 'none',
        background: 'transparent',
      }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      onLoad={() => onLoadStateChange?.(false)}
    />
  );
}

/**
 * Max modal: grey out entire admin (nav + title bar), near-fullscreen panel,
 * contextual SaveBar when dirty, loading while src iframe boots.
 */
function FullPageModal({
  id,
  heading,
  content,
  onClose,
}: {
  id: string;
  heading: string;
  content: ModalContent;
  onClose: () => void;
}) {
  const handleClose = useCallback(() => onClose(), [onClose]);
  const saveBarVisible = useSaveBarVisible();
  const [frameLoading, setFrameLoading] = useState(Boolean(content.src));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saveBarVisible) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose, saveBarVisible]);

  const primary = content.buttons.find(button => button.variant === 'primary');
  const secondary = content.buttons.filter(button => button.variant !== 'primary');

  return (
    <div className="mock-max-modal" role="dialog" aria-modal="true" aria-label={heading || 'Modal'}>
      <button type="button" className="mock-max-modal-backdrop" aria-label="Close" onClick={handleClose} />
      <div className="mock-max-modal-panel">
        <div className={saveBarVisible ? 'mock-max-modal-chrome has-savebar' : 'mock-max-modal-chrome'}>
          {saveBarVisible && (
            <div className="mock-max-modal-savebar">
              <SaveBar layout="contextual" />
            </div>
          )}
          <header className="mock-max-modal-header">
            <h2 className="mock-max-modal-title">{heading || content.title}</h2>
            <div className="mock-max-modal-actions">
              {secondary.map(button => (
                <button
                  key={button.id}
                  type="button"
                  className="mock-max-modal-btn"
                  disabled={button.disabled || button.loading}
                  onClick={() => activateEmbeddedElement(button.id)}
                >
                  {button.label}
                </button>
              ))}
              {primary && (
                <button
                  type="button"
                  className="mock-max-modal-btn is-primary"
                  disabled={primary.disabled || primary.loading}
                  onClick={() => activateEmbeddedElement(primary.id)}
                >
                  {primary.label}
                </button>
              )}
              <button
                type="button"
                className="mock-max-modal-close"
                aria-label="Close"
                onClick={handleClose}
              >
                ×
              </button>
            </div>
          </header>
        </div>
        <div className="mock-max-modal-body">
          {frameLoading && (
            <div className="mock-max-modal-loading" role="status" aria-live="polite">
              <span className="mock-max-modal-spinner" aria-hidden="true" />
              <span>Loading…</span>
            </div>
          )}
          <ModalContentFrame
            id={id}
            variant={content.variant}
            src={content.src}
            title={heading || content.title}
            onLoadStateChange={setFrameLoading}
          />
        </div>
      </div>
    </div>
  );
}

export function Modal() {
  const modalStates = useModalFeatureStore(state => state.modalStates);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasFullPageOpen = useMemo(
    () => Object.values(modalStates).some(state => state.open && isFullPageModal(state.content)),
    [modalStates],
  );

  useEffect(() => {
    document.documentElement.classList.toggle('mock-max-modal-open', hasFullPageOpen);
    const previous = document.body.style.overflow;
    if (hasFullPageOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.classList.remove('mock-max-modal-open');
      document.body.style.overflow = previous;
    };
  }, [hasFullPageOpen]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    Object.entries(modalStates).forEach(([id, state]) => {
      if (isFullPageModal(state.content)) return;

      const modal = container.querySelector(`s-modal#${CSS.escape(id)}`) as HTMLElement | null;
      if (!modal) return;

      const dialog = modal.shadowRoot?.querySelector('dialog');
      const modalIsOpen = dialog?.hasAttribute('open') ?? false;
      const control = modal as unknown as { showOverlay?: () => void; hideOverlay?: () => void };

      if (state.open && !modalIsOpen) {
        setTimeout(() => control.showOverlay?.(), 100);
      } else if (!state.open && modalIsOpen) {
        setTimeout(() => control.hideOverlay?.(), 100);
      }
    });
  }, [modalStates]);

  const close = (id: string) => postToEmbeddedApp({ type: 'MOCK_MODAL_HIDE', id });

  return (
    <div id="modal-container" ref={containerRef} className="modal-container">
      {Object.entries(modalStates).map(([id, state]) => {
        if (!state.open) {
          if (isFullPageModal(state.content)) return null;
          return (
            <s-modal
              key={id}
              id={id}
              heading={state.heading}
              padding="none"
              size={modalSize(state.content.variant)}
              onHide={() => close(id)}
            />
          );
        }

        if (isFullPageModal(state.content)) {
          return (
            <FullPageModal
              key={id}
              id={id}
              heading={state.heading}
              content={state.content}
              onClose={() => close(id)}
            />
          );
        }

        return (
          <s-modal
            key={id}
            id={id}
            heading={state.heading}
            padding="none"
            size={modalSize(state.content.variant)}
            onHide={() => close(id)}
          >
            <ModalContentFrame
              id={id}
              variant={state.content.variant}
              src={state.content.src}
              title={state.heading}
            />
            {state.content.buttons.map(button => (
              <ModalActionButton key={button.id} button={button} />
            ))}
          </s-modal>
        );
      })}
    </div>
  );
}
