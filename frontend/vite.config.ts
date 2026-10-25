import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
const backendTarget = process.env.AURA_API_PROXY_TARGET ?? 'http://127.0.0.1:8001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
})
