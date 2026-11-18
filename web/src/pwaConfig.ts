// What the service worker caches and how it answers a navigation (story #80 AC2).
//
// The front-end Decision: live navigations always go to the network, so the sign-in proxy's
// redirect can run, and the worker never caches a redirect, a sign-in page or any API answer.
// So the HTML shell (index.html) is not precached and `/` is never answered from a cache.
// Instead the build writes a copy of the shell as `offline.html`, which is precached, and a
// navigation that fails on the network (offline) gets that copy. The app then opens from what
// the device keeps (src/offline.ts and the pause in src/pain.ts), never from cached API data.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

export const OFFLINE_SHELL = 'offline.html';

/** Workbox options for vite-plugin-pwa (generateSW). */
export const workboxOptions = {
  // Built scripts, styles, icons and the self-hosted font files (story #76), plus the offline
  // copy of the shell. Never index.html.
  globPatterns: ['**/*.{js,css,svg,woff2}', OFFLINE_SHELL],
  // No cache-first shell for navigations: the network answers every live navigation.
  navigateFallback: null,
  runtimeCaching: [
    {
      // Navigations go to the network and are never stored; only on a network failure does
      // the precached offline shell answer.
      urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
      handler: 'NetworkOnly' as const,
      options: { precacheFallback: { fallbackURL: OFFLINE_SHELL } },
    },
  ],
};

/** Writes `offline.html`, a copy of the built shell, next to it. */
export function offlineShell(): Plugin {
  return {
    name: 'goalie-goals-offline-shell',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (html?.type !== 'asset') this.error('index.html was not built, so there is no offline shell.');
      this.emitFile({ type: 'asset', fileName: OFFLINE_SHELL, source: html.source });
    },
  };
}

/** Where the font's licence ships, next to the font files (OFL 1.1, condition 2). */
export const FONT_LICENCE = 'fonts/Nunito-OFL.txt';

/** Writes Nunito's OFL text, read from the Fontsource package, into the build (story #76). */
export function fontLicence(): Plugin {
  return {
    name: 'goalie-goals-font-licence',
    apply: 'build',
    generateBundle() {
      const require = createRequire(import.meta.url);
      const source = readFileSync(require.resolve('@fontsource-variable/nunito/LICENSE'), 'utf8');
      this.emitFile({ type: 'asset', fileName: FONT_LICENCE, source });
    },
  };
}
