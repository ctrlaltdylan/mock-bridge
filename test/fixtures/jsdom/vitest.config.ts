import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { mockBridge } from '../../../dist/vite/index.js';

export default defineConfig({
  plugins: [mockBridge({ shop: 'fixture.myshopify.com' })],
  test: {
    root: fileURLToPath(new URL('..', import.meta.url)),
    include: ['shared/*.spec.ts'],
  },
});
