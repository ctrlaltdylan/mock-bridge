import { useEffect, useRef } from "preact/hooks";
import { modalStates } from "../../store/features";

type ModalElement = HTMLElement & { showOverlay?(): void; hideOverlay?(): void };

export function Modal() {
  const states = modalStates.value;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    Object.entries(states).forEach(([id, state]) => {
      // The app picks the id: it may not be a valid CSS identifier, e.g. React's `:r1:`.
      const modal = container.querySelector<ModalElement>(`s-modal#${CSS.escape(id)}`);
      if (!modal) return;
      const modalIsOpen = (modal.shadowRoot?.querySelector('dialog') as HTMLDialogElement)?.getAttribute('open') === '';

      if (state.open && !modalIsOpen) {
        setTimeout(() => {
          modal.showOverlay?.();
        }, 100);
      } else if (!state.open && modalIsOpen) {
        setTimeout(() => {
          modal.hideOverlay?.();
        }, 100);
      }
    });
  }, [states]);


  return (
    <div id="modal-container" ref={containerRef}>
      {Object.entries(states).map(([id, state]) => (
        <s-modal key={id} id={id} heading={state.heading} padding="none">
          {state.content.src && <iframe src={state.content.src} />}
          {state.html && <div dangerouslySetInnerHTML={{ __html: state.html }} />}
          {state.content.buttons.map(button => (
            <s-button
              key={button.id}
              slot={button.variant === 'primary' ? 'primary-action' : 'secondary-actions'}
              variant={button.variant as any}
              tone={button.tone as any}
              onClick={() => {
                // ah crap, parent needs to execute action on client lol
              }}
              disabled={button.disabled}
              loading={button.loading}
            >
              {button.label}
            </s-button>
          ))}
        </s-modal>
      ))}
    </div>
  )
}