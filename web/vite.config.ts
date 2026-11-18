import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // The manifest is fetched with the sign-in proxy's cookie (crossorigin="use-credentials").
      useCredentials: true,
      manifest: {
        id: '/',
        name: 'Goalie Goals',
        short_name: 'Goalie Goals',
        description: 'Short daily goalkeeper training, done together.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f2a1d',
        theme_color: '#0f2a1d',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Live navigations always go to the network so the sign-in proxy's redirect can run:
        // the HTML shell is not precached and there is no navigation fallback.
        globPatterns: ['**/*.{js,css,svg}'],
        navigateFallback: null,
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
