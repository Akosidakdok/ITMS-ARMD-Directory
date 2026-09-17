import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        // Use an explicit IPv4 loopback address. On Windows, resolving
        // "localhost" can alternate between IPv6 and IPv4 while the backend
        // is restarting, producing intermittent proxy ETIMEDOUT/ECONNREFUSED.
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
});
