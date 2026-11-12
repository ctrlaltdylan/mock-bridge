import type { FeatureContext } from './context.js';

const METHODS: Record<string, 'show' | 'hide' | 'toggle'> = {
  // Polaris' default `command`: a modal or app window's default is to open.
  '--auto': 'show',
  '--show': 'show',
  '--hide': 'hide',
  '--toggle': 'toggle',
  'show-modal': 'show',
  close: 'hide',
  'request-close': 'hide',
};

const TARGETS = ['ui-modal', 's-app-window'];

function commandFor(element: Element): string | null {
  const value = element.getAttribute('commandfor') ?? (element as { commandFor?: unknown }).commandFor;
  return typeof value === 'string' && value ? value : null;
}

/** Invoker commands: `<button commandfor="id" command="--show">` opens `<ui-modal>` and `<s-app-window>`. */
export function commands(ctx: FeatureContext) {
  const { window } = ctx;

  window.addEventListener('click', event => {
    if (event.defaultPrevented) return;
    const invoker = event.composedPath().find((node): node is Element => node instanceof window.Element && commandFor(node) !== null);
    if (!invoker) return;
    const target = invoker.ownerDocument.getElementById(commandFor(invoker)!);
    // Polaris invokers (`<s-button>`, `<s-clickable>`) default to `--auto`, even before they upgrade.
    const command = invoker.getAttribute('command') ?? (invoker as { command?: string }).command
      ?? (invoker.localName.startsWith('s-') ? '--auto' : '');
    const method = METHODS[command];
    if (!target || !method || !TARGETS.includes(target.localName)) return;
    (target as unknown as Partial<Record<typeof method, () => unknown>>)[method]?.();
  }, { signal: ctx.signal });
}
