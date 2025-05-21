import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vitePluginProxy } from 'vite-plugin-proxy';

export default defineConfig({
  plugins: [
    react(),
    vitePluginProxy({
      '/api': {
        target: 'https://scs.syscom-instruments.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }),
  ],
  assetsInclude: ['**/*.xlsx'],
});