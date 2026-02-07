import { type ModalContent } from "../../../admin-frame/src/store/features/modal";
import { invokeFeature } from "../invokeFeature";


function attachModalContentObserver(modalElement: HTMLElement, propagate: (html: string) => void) {
  const contentElement = document.createElement('div');
  (modalElement as any).content = contentElement;

  const observer = new MutationObserver((mutations) => {
    propagate(contentElement.innerHTML);
  });

  observer.observe(contentElement, {
    childList: true,
    subtree: true,
  });
}

/**
 * Extract modal content from ui-modal elements and communicate to parent frame
 */
function observeModalElements() {
  // Function to extract data from a ui-modal element
  function extractModalData(modalElement: HTMLElement): ModalContent | null {
    const id = modalElement.getAttribute('id');
    if (!id) return null;

    const variant = modalElement.getAttribute('variant') || 'base';
    const src = modalElement.getAttribute('src');

    // Extract title from ui-title-bar
    const titleBar = modalElement.querySelector('ui-title-bar');
    const title = titleBar?.getAttribute('title') || '';

    // Extract buttons from ui-title-bar
    const buttons = titleBar ? Array.from(titleBar.querySelectorAll('button')).map(btn => ({
      id: btn.getAttribute('id') || '',
      label: btn.textContent || '',
      variant: btn.getAttribute('variant') || undefined,
      tone: btn.getAttribute('tone') || undefined,
      disabled: btn.disabled,
      loading: btn.hasAttribute('loading'),
    })) : [];

    return {
      id: id,
      title,
      variant,
      src,
      buttons,
    };
  }

  // Extract HTML content from modal (excluding ui-title-bar)
  function extractModalHtml(modalElement: HTMLElement): string {
    const clone = modalElement.cloneNode(true) as HTMLElement;
    // Remove ui-title-bar from clone to get just the body content
    const titleBar = clone.querySelector('ui-title-bar');
    if (titleBar) {
      titleBar.remove();
    }
    return clone.innerHTML.trim();
  }

  // Function to sync a modal to parent frame
  async function syncModalToParent(modalElement: HTMLElement) {
    const data = extractModalData(modalElement);

    if (data) {
      await invokeFeature('modal', 'update', {
        id: data.id,
        heading: data.title,
        content: data
      });

      // Also sync the HTML content
      const html = extractModalHtml(modalElement);
      if (html) {
        await invokeFeature('modal', 'updateHtml', {
          id: data.id,
          html: html
        });
      }
    }
  }

  // Observe all ui-modal elements
  function observeModals() {
    const modals = document.querySelectorAll('ui-modal');

    modals.forEach(modal => {
      (modal as HTMLElement).style.display = 'none';
      // Sync initial state
      syncModalToParent(modal as HTMLElement);
      attachModalContentObserver(modal as HTMLElement, (html) => {
        const id = modal.getAttribute('id');
        if (!id) return;

        invokeFeature('modal', 'updateHtml', {
          id: id,
          html: html
        });
      });

      const id = modal.getAttribute('id');
      if (!id) return;

      (modal as any).show = () => {
        invokeFeature('modal', 'show', { id: id });
      };

      (modal as any).hide = () => {
        invokeFeature('modal', 'hide', { id: id });
      };

      (modal as any).toggle = () => {
        invokeFeature('modal', 'toggle', { id: id });
      };
    });
  }

  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeModals);
  } else {
    observeModals();
  }

  // Watch for new ui-modal elements being added
  const documentObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && node.tagName.toLowerCase() === 'ui-modal') {
          syncModalToParent(node);
        }
      });
    });
  });

  documentObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function modal(): NonNullable<typeof window.shopify>['modal'] {
  // Start observing modal elements when the API is initialized
  if (typeof document !== 'undefined') {
    observeModalElements();
  }

  return {
    toggle: async (id: string) => {
      await invokeFeature('modal', 'toggle', { id });
    },
    show: async (id: string) => {
      await invokeFeature('modal', 'show', { id });
    },
    hide: async (id: string) => {
      await invokeFeature('modal', 'hide', { id });
    },
  };
}