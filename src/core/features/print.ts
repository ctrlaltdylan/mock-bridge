import { fire, patchMember, type FeatureContext } from './context.js';

/** Reports `window.print()` to the admin, then prints as usual. */
export function print(ctx: FeatureContext) {
  const { window } = ctx;
  const native = window.print;
  patchMember(ctx, window, 'print', () => {
    fire(ctx, 'print', 'print');
    if (ctx.native) native.call(window);
  });
}
