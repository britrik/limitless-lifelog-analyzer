import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // For resolving absolute paths

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // These match your tsconfig paths for absolute imports
      'components': path.resolve(__dirname, 'src/components'),
      'utils': path.resolve(__dirname, 'src/utils'),
      'services': path.resolve(__dirname, 'src/services'),
      // 'types': path.resolve(__dirname, 'src/types'), // Uncomment if you have a types folder
    },
  },
});
