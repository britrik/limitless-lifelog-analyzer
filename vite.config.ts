import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all API calls starting with /api/limitless to the real API server
      // This will be moved to the backend server later.
      '/api/limitless': {
        target: 'https://api.limitless.ai/v1',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/limitless/, ''),
        secure: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})