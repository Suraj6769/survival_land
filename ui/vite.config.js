import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // During local dev, forward /api/* to the FastAPI backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons:  ['lucide-react'],
        },
      },
    },
  },

  // VITE_HF_TOKEN and VITE_HF_MODEL are injected at build time via env vars.
  // Set them in ui/.env.local for local dev,
  // or as HF Space secrets (they are forwarded as Docker build-args).
})
