import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fontLicence, offlineShell, workboxOptions } from './src/pwaConfig';

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
        background_color: '#f4f7fb',
        theme_color: '#1f75d5',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      // Live navigations always go to the network so the sign-in proxy's redirect can run; only
      // when the network fails does the precached offline copy of the shell answer
      // (src/pwaConfig.ts). No API answer is ever cached by the worker.
      workbox: workboxOptions,
    }),
    offlineShell(),
    fontLicence(),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
