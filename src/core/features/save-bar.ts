import type { ShopifyGlobal } from '@shopify/app-bridge-types';
import { fire, observeElements, type FeatureContext } from './context';

/** Mirrors `<ui-save-bar>` elements and `form[data-save-bar]` dirty state into the admin. */
function observeSaveBarElements(ctx: FeatureContext) {
  const { window } = ctx;

  function setupSaveBar(element: HTMLElement) {
    const id = element.getAttribute('id');
    if (!id) return;

    element.style.display = 'none';
    fire(ctx, 'saveBar', 'update', { id, discardConfirmation: element.hasAttribute('data-discard-confirmation') });
    Object.assign(element, {
      show: () => fire(ctx, 'saveBar', 'show', { id }),
      hide: () => fire(ctx, 'saveBar', 'hide', { id }),
    });
  }

  function setupFormSaveBar(form: HTMLFormElement) {
    const id = `form-save-bar-${Date.now()}`;
    let isDirty = false;

    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input, textarea, select'));
    const originalValues = new Map(inputs.map(input => [input.name || input.id, input.value]));

    form.addEventListener('input', () => {
      const hasChanges = inputs.some(input => originalValues.get(input.name || input.id) !== input.value);
      if (hasChanges !== isDirty) {
        isDirty = hasChanges;
        fire(ctx, 'saveBar', hasChanges ? 'show' : 'hide', { id });
      }
    }, { signal: ctx.signal });

    // The admin's save bar buttons.
    window.addEventListener('message', event => {
      if (event.data?.id !== id) return;
      if (event.data.type === 'SAVE_BAR_SAVE') {
        form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
        isDirty = false;
        fire(ctx, 'saveBar', 'hide', { id });
      }
      if (event.data.type === 'SAVE_BAR_DISCARD') {
        form.reset();
        isDirty = false;
      }
    }, { signal: ctx.signal });

    fire(ctx, 'saveBar', 'update', { id, discardConfirmation: form.hasAttribute('data-discard-confirmation') });
  }

  observeElements(ctx, ['ui-save-bar'], setupSaveBar);
  observeElements(ctx, ['form[data-save-bar]'], form => setupFormSaveBar(form as HTMLFormElement));
}

export function saveBar(ctx: FeatureContext): ShopifyGlobal['saveBar'] {
  observeSaveBarElements(ctx);

  return {
    show: async (id: string) => { await ctx.host.invoke('saveBar', 'show', { id }); },
    hide: async (id: string) => { await ctx.host.invoke('saveBar', 'hide', { id }); },
    toggle: async (id: string) => { await ctx.host.invoke('saveBar', 'toggle', { id }); },
    // Called before navigating away with unsaved changes; the mock never blocks.
    leaveConfirmation: async () => {},
  };
}
