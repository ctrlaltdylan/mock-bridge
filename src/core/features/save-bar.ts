import type { ShopifyGlobal } from '@shopify/app-bridge-types';
import { fire, mirror, observeElements, onEvent, type FeatureContext } from './context.js';

/** Mirrors `<ui-save-bar>` elements and `form[data-save-bar]` dirty state into the admin. */
function observeSaveBarElements(ctx: FeatureContext) {
  const { window } = ctx;
  // Each form keeps its save bar's id, also if it leaves the page and comes back. The admin
  // hears from every page (the app's, its app windows', the next one loaded), so ids are per page.
  const formIds = new WeakMap<HTMLFormElement, string>();
  const page = Math.random().toString(36).slice(2, 10);
  let forms = 0;

  // The element left the page: the admin hides and forgets its save bar.
  const remove = (id: string) => () => mirror(ctx, 'saveBar', 'remove', { id });

  function setupSaveBar(element: HTMLElement) {
    const id = element.getAttribute('id');
    if (!id) return;

    element.style.display = 'none';
    mirror(ctx, 'saveBar', 'update', { id, discardConfirmation: element.hasAttribute('data-discard-confirmation') });
    Object.assign(element, {
      show: () => fire(ctx, 'saveBar', 'show', { id }),
      hide: () => fire(ctx, 'saveBar', 'hide', { id }),
    });
    return remove(id);
  }

  function setupFormSaveBar(form: HTMLFormElement, formCtx: FeatureContext) {
    const { signal } = formCtx;
    const id = formIds.get(form) ?? `form-save-bar-${page}-${++forms}`;
    formIds.set(form, id);
    let isDirty = false;

    // The admin hid the bar (e.g. a test's reset): the next change shows it again.
    onEvent(formCtx, 'saveBar', (event, payload: { id: string }) => {
      if (event === 'hide' && payload?.id === id) isDirty = false;
    });

    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input, textarea, select'));
    const originalValues = new Map(inputs.map(input => [input.name || input.id, input.value]));

    form.addEventListener('input', () => {
      const hasChanges = inputs.some(input => originalValues.get(input.name || input.id) !== input.value);
      if (hasChanges !== isDirty) {
        isDirty = hasChanges;
        mirror(ctx, 'saveBar', hasChanges ? 'show' : 'hide', { id });
      }
    }, { signal });

    // The admin's save bar buttons.
    window.addEventListener('message', event => {
      if (event.data?.id !== id) return;
      if (event.data.type === 'SAVE_BAR_SAVE') {
        form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
        isDirty = false;
        mirror(ctx, 'saveBar', 'hide', { id });
      }
      if (event.data.type === 'SAVE_BAR_DISCARD') {
        form.reset();
        isDirty = false;
      }
    }, { signal });

    mirror(ctx, 'saveBar', 'update', { id, discardConfirmation: form.hasAttribute('data-discard-confirmation') });
    return remove(id);
  }

  observeElements(ctx, ['ui-save-bar'], setupSaveBar);
  observeElements(ctx, ['form[data-save-bar]'], (form, formCtx) => setupFormSaveBar(form as HTMLFormElement, formCtx));
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
