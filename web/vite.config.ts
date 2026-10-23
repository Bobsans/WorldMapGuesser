import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
    },
  },
  base: command === 'build' || isPreview ? '/static/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: 'statics.json',
  },
  server: {
    host: '127.0.0.1',
    port: 8300,
    strictPort: true,
    proxy: {
      '/get-top': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8280',
      '/send-score': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8280',
    },
  },
  preview: { host: '127.0.0.1', port: 8301, strictPort: true },
}));
