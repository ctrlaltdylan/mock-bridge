import { invokeFeature } from "../invokeFeature";

/**
 * Observe ui-save-bar elements and forms with data-save-bar attribute
 */
function observeSaveBarElements() {
  // Observe ui-save-bar elements
  function setupSaveBar(element: HTMLElement) {
    const id = element.getAttribute('id');
    if (!id) return;

    // Hide the native element
    element.style.display = 'none';

    // Check for discard confirmation
    const discardConfirmation = element.hasAttribute('data-discard-confirmation');

    // Register with parent
    invokeFeature('saveBar', 'update', { id, discardConfirmation });

    // Override show/hide methods
    (element as any).show = () => {
      invokeFeature('saveBar', 'show', { id });
    };

    (element as any).hide = () => {
      invokeFeature('saveBar', 'hide', { id });
    };
  }

  // Observe forms with data-save-bar attribute
  function setupFormSaveBar(form: HTMLFormElement) {
    const id = `form-save-bar-${Date.now()}`;
    const discardConfirmation = form.hasAttribute('data-discard-confirmation');

    // Track form changes
    let isDirty = false;
    const originalValues = new Map<string, string>();

    // Store original values
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach((input: Element) => {
      const el = input as HTMLInputElement;
      originalValues.set(el.name || el.id, el.value);
    });

    // Listen for changes
    form.addEventListener('input', () => {
      let hasChanges = false;
      inputs.forEach((input: Element) => {
        const el = input as HTMLInputElement;
        const key = el.name || el.id;
        if (originalValues.get(key) !== el.value) {
          hasChanges = true;
        }
      });

      if (hasChanges && !isDirty) {
        isDirty = true;
        invokeFeature('saveBar', 'show', { id });
      } else if (!hasChanges && isDirty) {
        isDirty = false;
        invokeFeature('saveBar', 'hide', { id });
      }
    });

    // Listen for save bar events from parent
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'SAVE_BAR_SAVE' && event.data.id === id) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        isDirty = false;
        invokeFeature('saveBar', 'hide', { id });
      }
      if (event.data?.type === 'SAVE_BAR_DISCARD' && event.data.id === id) {
        form.reset();
        isDirty = false;
      }
    });

    // Register with parent
    invokeFeature('saveBar', 'update', { id, discardConfirmation });
  }

  // Initial scan
  function observeElements() {
    document.querySelectorAll('ui-save-bar').forEach(el => setupSaveBar(el as HTMLElement));
    document.querySelectorAll('form[data-save-bar]').forEach(el => setupFormSaveBar(el as HTMLFormElement));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeElements);
  } else {
    observeElements();
  }

  // Watch for new elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          if (node.tagName.toLowerCase() === 'ui-save-bar') {
            setupSaveBar(node);
          }
          if (node.tagName === 'FORM' && node.hasAttribute('data-save-bar')) {
            setupFormSaveBar(node as HTMLFormElement);
          }
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function saveBar(): NonNullable<typeof window.shopify>['saveBar'] {
  // Start observing save bar elements when the API is initialized
  if (typeof document !== 'undefined') {
    observeSaveBarElements();
  }

  return {
    show: async (id: string) => {
      await invokeFeature('saveBar', 'show', { id });
    },
    hide: async (id: string) => {
      await invokeFeature('saveBar', 'hide', { id });
    },
    toggle: async (id: string) => {
      await invokeFeature('saveBar', 'toggle', { id });
    },
    leaveConfirmation: async () => {
      // This is called before navigation to check if there are unsaved changes
      // For mock purposes, we just resolve
    },
  };
}
