import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { mockBridge } from '../../../dist/vite/index.mjs';

export default defineConfig({
  plugins: [mockBridge({ shop: 'fixture.myshopify.com', environment: 'mock-bridge' })],
  test: {
    root: import.meta.dirname,
    include: ['*.spec.ts'],
    environmentOptions: {
      jsdom: { html: readFileSync(new URL('./index.html', import.meta.url), 'utf8') },
    },
  },
});
