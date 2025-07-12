import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic', // Safe for React 18 to prevent bundling/export issues
      jsxImportSource: 'react', // Explicitly points to React for JSX transforms (helps with React 18 compatibility)
    }),
  ],
  resolve: {
    alias: {
      // These match your tsconfig paths for absolute imports
      'components': path.resolve(__dirname, 'src/components'),
      'utils': path.resolve(__dirname, 'src/utils'),
      'services': path.resolve(__dirname, 'src/services'),
      // 'types': path.resolve(__dirname, 'src/types'), // Uncomment if you have a types folder
    },
  },
  server: {
    // Disable HMR error overlay to make debugging easier (errors still log to console)
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api/limitless': {
        target: 'https://api.limitless.com/', // The actual API endpoint
        changeOrigin: true,
        secure: false, // Set to true if your target API uses HTTPS and you trust its certificate
        rewrite: (path) => path.replace(/^\/api\/limitless/, ''), // Optional: if the target doesn't expect '/api/limitless' prefix
      },
    },
  },
  build: {
    // Basic build optimizations: Disable sourcemaps in prod for smaller bundles
    sourcemap: false,
    // Minify code for production
    minify: 'esbuild',
  },
  // Enable more verbose logging for debugging resolution/bundling issues
  logLevel: 'info',
});
