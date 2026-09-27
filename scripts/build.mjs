// Builds the bundles tsc doesn't: `node scripts/build.mjs <esm|app-bridge> [--watch]`.
//   esm         the ESM-only entry points (Vite plugin, Vitest integration, test host) -> dist/**/*.mjs
//   app-bridge  the mock App Bridge the server serves as /app-bridge.js -> app-bridge/dist/index.js
import { copyFile, rm } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { build } from 'vite';

const [target, ...flags] = process.argv.slice(2);
const watch = flags.includes('--watch') ? {} : null;

const shared = { configFile: false, logLevel: 'info', publicDir: false };

const targets = {
  async esm() {
    // Chunk names are content-hashed; drop the previous build's.
    await rm('dist/chunks', { recursive: true, force: true });
    await build({
      ...shared,
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
        target: 'node20',
        watch,
        lib: {
          entry: {
            'testing/index': 'src/testing/index.ts',
            'vite/index': 'src/vite/index.ts',
            'vitest/index': 'src/vitest/index.ts',
            'vitest/setup': 'src/vitest/setup.ts',
            'vitest/environment': 'src/vitest/environment.ts',
          },
          formats: ['es'],
          fileName: (_format, name) => `${name}.mjs`,
        },
        rolldownOptions: {
          // Dependencies, peers and Node built-ins resolve from the consumer.
          external: id => !id.startsWith('.') && !isAbsolute(id),
          output: { chunkFileNames: 'chunks/[name]-[hash].mjs' },
        },
      },
    });
    // Browser Mode's tester page (mockBridge({ browser: true })).
    await copyFile('src/vitest/tester.html', 'dist/vitest/tester.html');
  },

  async 'app-bridge'() {
    await build({
      ...shared,
      build: {
        outDir: 'app-bridge/dist',
        emptyOutDir: true,
        minify: false,
        target: 'es2020',
        watch,
        lib: {
          entry: 'app-bridge/src/index.ts',
          formats: ['iife'],
          name: 'MockAppBridge',
          fileName: () => 'index.js',
        },
      },
    });
  },
};

if (!targets[target]) {
  console.error(`Usage: node scripts/build.mjs <${Object.keys(targets).join('|')}> [--watch]`);
  process.exit(1);
}
await targets[target]();
