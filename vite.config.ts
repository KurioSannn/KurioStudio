import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['kuriooo.svg'],
        manifest: {
          name: 'Kurio Studio',
          short_name: 'Kurio',
          description: 'Local-first workspace for processing PDF, images, and tools natively in your browser.',
          theme_color: '#F8F7F3',
          background_color: '#F8F7F3',
          display: 'standalone',
          icons: [
            },
            {
              src: '/pwa-icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/kuriooo.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: '/kuriooo.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,pdf,wasm}']
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
