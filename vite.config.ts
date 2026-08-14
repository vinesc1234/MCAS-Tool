import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { devApi } from './vite-dev-api';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MCAS Trigger Tracker',
        short_name: 'Triggers',
        description: 'Track what triggers your MCAS: photos, symptoms, and patterns.',
        theme_color: '#7c5cbf',
        background_color: '#faf8fc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The analyze endpoint must always hit the network — never serve it
        // the cached app shell, and never cache its responses.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    host: true,
  },
  // Barrel-importing lucide otherwise fires hundreds of module requests in
  // dev and makes HMR crawl.
  optimizeDeps: {
    include: ['lucide-react'],
  },
});
