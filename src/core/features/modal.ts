import type { ShopifyGlobal } from '@shopify/app-bridge-types';
import type { ModalContent } from '../stores';
import { fire, observeElements, type FeatureContext } from './context';

/** Mirrors `<ui-modal>` elements into the admin, which renders them. */
function observeModalElements(ctx: FeatureContext) {
  const { MutationObserver } = ctx.window;

  function extractModalData(modal: HTMLElement): ModalContent | null {
    const id = modal.getAttribute('id');
    if (!id) return null;

    const titleBar = modal.querySelector('ui-title-bar');
    const buttons = titleBar ? Array.from(titleBar.querySelectorAll('button')).map(button => ({
      id: button.getAttribute('id') || '',
      label: button.textContent || '',
      variant: button.getAttribute('variant') || undefined,
      tone: button.getAttribute('tone') || undefined,
      disabled: button.disabled,
      loading: button.hasAttribute('loading'),
    })) : [];

    return {
      id,
      title: titleBar?.getAttribute('title') || '',
      variant: modal.getAttribute('variant') || 'base',
      src: modal.getAttribute('src'),
      buttons,
    };
  }

  // The body content, without <ui-title-bar>.
  function extractModalHtml(modal: HTMLElement): string {
    const clone = modal.cloneNode(true) as HTMLElement;
    clone.querySelector('ui-title-bar')?.remove();
    return clone.innerHTML.trim();
  }

  observeElements(ctx, ['ui-modal'], modal => {
    const data = extractModalData(modal);
    if (!data) return;
    const { id } = data;

    modal.style.display = 'none';
    fire(ctx, 'modal', 'update', { id, heading: data.title, content: data });
    const html = extractModalHtml(modal);
    if (html) fire(ctx, 'modal', 'updateHtml', { id, html });

    // Content rendered into `modal.content` (e.g. by a framework portal) is mirrored as it changes.
    const content = modal.ownerDocument.createElement('div');
    (modal as unknown as { content: HTMLElement }).content = content;
    const observer = new MutationObserver(() => fire(ctx, 'modal', 'updateHtml', { id, html: content.innerHTML }));
    observer.observe(content, { childList: true, subtree: true });
    ctx.signal.addEventListener('abort', () => observer.disconnect());

    Object.assign(modal, {
      show: () => fire(ctx, 'modal', 'show', { id }),
      hide: () => fire(ctx, 'modal', 'hide', { id }),
      toggle: () => fire(ctx, 'modal', 'toggle', { id }),
    });
  });
}

export function modal(ctx: FeatureContext): ShopifyGlobal['modal'] {
  observeModalElements(ctx);

  return {
    show: async (id: string) => { await ctx.host.invoke('modal', 'show', { id }); },
    hide: async (id: string) => { await ctx.host.invoke('modal', 'hide', { id }); },
    toggle: async (id: string) => { await ctx.host.invoke('modal', 'toggle', { id }); },
  };
}
