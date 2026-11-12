import type { ShopifyGlobal } from '@shopify/app-bridge-types';
import type { ModalContent } from '../stores.js';
import { fire, mirror, observeElements, type FeatureContext } from './context.js';

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

  observeElements(ctx, ['ui-modal'], (modal, modalCtx) => {
    const data = extractModalData(modal);
    if (!data) return;
    const { id } = data;

    modal.style.display = 'none';
    mirror(ctx, 'modal', 'update', { id, heading: data.title, content: data });
    const html = extractModalHtml(modal);
    if (html) mirror(ctx, 'modal', 'updateHtml', { id, html });

    // Content rendered into `modal.content` (e.g. by a framework portal) is mirrored as it changes.
    // A modal put back on the page keeps its content, which a portal may still render into.
    const owner = modal as unknown as { content?: HTMLElement };
    const content = owner.content ?? modal.ownerDocument.createElement('div');
    owner.content = content;
    if (content.innerHTML) mirror(ctx, 'modal', 'updateHtml', { id, html: content.innerHTML });
    const observer = new MutationObserver(() => mirror(ctx, 'modal', 'updateHtml', { id, html: content.innerHTML }));
    observer.observe(content, { childList: true, subtree: true });
    modalCtx.signal.addEventListener('abort', () => observer.disconnect());

    Object.assign(modal, {
      show: () => fire(ctx, 'modal', 'show', { id }),
      hide: () => fire(ctx, 'modal', 'hide', { id }),
      toggle: () => fire(ctx, 'modal', 'toggle', { id }),
    });

    // The modal left the page: the admin closes and forgets it.
    return () => mirror(ctx, 'modal', 'remove', { id });
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
