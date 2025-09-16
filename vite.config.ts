import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.xlsx'],

  server: {
    proxy: {
      '/api': {
        target: 'https://scs.syscom-instruments.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/micromate-api': {
        target: 'https://imsite.dullesgeotechnical.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/micromate-api/, '/api'),
      }
    }
  }
})