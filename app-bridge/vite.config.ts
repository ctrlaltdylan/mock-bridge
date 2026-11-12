// The mock App Bridge the server serves as /app-bridge.js: a classic script, like Shopify's.
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    target: 'es2020',
    lib: {
      entry: 'src/index.ts',
      formats: ['iife'],
      name: 'MockAppBridge',
      fileName: () => 'index.js',
    },
  },
});
