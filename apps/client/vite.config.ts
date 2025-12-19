import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function normalizeBasePath(value?: string): string | undefined {
  if (!value) return undefined;
  let base = value.trim();
  if (!base) return undefined;
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

export default defineConfig(() => ({
  base: normalizeBasePath(process.env.BASE_PATH) || '/',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}));
