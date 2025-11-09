import { useEffect, useRef } from "react";
import { useModalFeatureStore } from "../../store/features/modal";

export function Modal() {
  const modalStates = useModalFeatureStore(state => state.modalStates);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    Object.entries(modalStates).forEach(([id, state]) => {
      const modal = container.querySelector(`s-modal#${id}`) as HTMLElement;
      const modalIsOpen = (modal.shadowRoot?.querySelector('dialog') as HTMLDialogElement)?.getAttribute('open') === '';

      if (state.open && !modalIsOpen) {
        setTimeout(() => {
          (modal as unknown as JSX.IntrinsicElements['s-modal']).showOverlay?.();
        }, 100);
      } else if (!state.open && modalIsOpen) {
        setTimeout(() => {
          (modal as unknown as JSX.IntrinsicElements['s-modal']).hideOverlay?.();
        }, 100);
      }
    });
  }, [modalStates]);


  return (
    <div id="modal-container" ref={containerRef}>
      {Object.entries(modalStates).map(([id, state]) => (
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