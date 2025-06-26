import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all API calls starting with /api/limitless to the real API server
      '/api/limitless': {
        target: 'https://api.limitless.ai/v1',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/limitless/, ''),
        secure: true,
      },
    },
  },
});