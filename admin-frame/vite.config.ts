import { defineConfig, loadEnv } from 'vite'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The mock server's port, from the repo root's .env.
  const { SHOPIFY_PORT = '3080' } = loadEnv(mode, '..', 'SHOPIFY_')

  return {
    plugins: [preact()],
    resolve: {
      // `src/core/stores.ts` lives outside this package: its signals must be the ones the components track.
      dedupe: ['preact', '@preact/signals-core'],
    },
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${SHOPIFY_PORT}`,
          changeOrigin: true,
        },
      },
    },
  }
})
