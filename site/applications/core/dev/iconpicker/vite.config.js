import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    jsxRuntime: "automatic"
  })],

  server: {
    port: 5175,
    origin: '/applications/core/dev/iconpicker',
    cors: true,
  },

  build: {
    manifest: 'manifest.json',
    rollupOptions: {
      input: "/src/main.jsx"
    },
    outDir: '../../interface/static/iconpicker',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2048 // there might be a warning that the build is over the chunk limit, just increase this if this happens. Since it's a monolithic app, it's faster to load all at once than in chunks.
  },
})
