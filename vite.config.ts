import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api':    { target: 'http://localhost', changeOrigin: true },
      '/auth':   { target: 'http://localhost', changeOrigin: true },
      '/upload': { target: 'http://localhost', changeOrigin: true },
      '/uploads':{ target: 'http://localhost', changeOrigin: true },
    },
  },
})
