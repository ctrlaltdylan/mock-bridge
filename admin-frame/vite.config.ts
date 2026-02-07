import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { config } from 'dotenv';

config({ path: '../.env' });

const MOCK_API_PORT = process.env.SHOPIFY_PORT || '3080';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${MOCK_API_PORT}`,
        changeOrigin: true,
      },
    },
  }
})
