import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        manifest: 'manifest.json',
        rollupOptions: {
            input: "/index.js"
        },
        outDir: '../../interface/static/iro',
        emptyOutDir: true,
        chunkSizeWarningLimit: 2048 // there might be a warning that the build is over the chunk limit, just increase this if this happens. Since it's a monolithic app, it's faster to load all at once than in chunks.
    },
    server: {
        port: 5176,
        origin: '/applications/core/dev/iro'
    }
})
