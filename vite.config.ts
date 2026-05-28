import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 8001,
        strictPort: true,
        headers: {
            // Disabling the dev cache makes asset edits visible immediately
            // and avoids stale responses when the page lives in an iframe.
            'Cache-Control': 'no-store',
        },
    },
    preview: {
        port: 8001,
        strictPort: true,
    },
    build: {
        // Phaser is ~1.2 MB and changes rarely. Split it into its own chunk
        // so the browser can cache it independently of our application code.
        // The warning threshold doesn't apply to Phaser; raise it.
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    if (id.includes('node_modules/phaser/')) return 'phaser';
                    return undefined;
                },
            },
        },
    },
});
