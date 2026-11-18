// What the service worker caches and how it answers a navigation (story #80 AC2).
//
// The front-end Decision: live navigations always go to the network, so the sign-in proxy's
// redirect can run, and the worker never caches a redirect, a sign-in page or any API answer.
// So the HTML shell (index.html) is not precached and `/` is never answered from a cache.
// Instead the build writes a copy of the shell as `offline.html`, which is precached, and a
// navigation that fails on the network (offline) gets that copy. The app then opens from what
// the device keeps (src/offline.ts and the pause in src/pain.ts), never from cached API data.
//
// One exception, story #94 AC5: the figures of today's approved cards. Figures are app
// content, not household data. The app itself keeps exactly today's figures in their own cache
// (src/figures.ts); the worker answers a figure from the network and, only when the network
// fails, from that cache. It never writes to it, and no other API answer (today, history,
// audit, progress) is ever read from a cache.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';
import { FIGURE_CACHE } from './figures';

export const OFFLINE_SHELL = 'offline.html';

/** Navigations: network only, with the offline shell when the network fails. */
export const navigationRoute = {
  urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
  handler: 'NetworkOnly' as const,
  options: { precacheFallback: { fallbackURL: OFFLINE_SHELL } },
};

/**
 * A card figure: the network first; offline, the copy the app kept for today. The worker never
 * stores anything here (`cacheWillUpdate` returns null). The pattern is serialised into the
 * worker, so it names the path itself rather than a constant.
 */
export const figureRoute = {
  urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
    sameOrigin && /^\/api\/training\/cards\/[^/]+\/figure\.svg$/.test(url.pathname),
  handler: 'NetworkFirst' as const,
  options: {
    cacheName: FIGURE_CACHE,
    plugins: [{ cacheWillUpdate: async () => null }],
  },
};

/** Workbox options for vite-plugin-pwa (generateSW). */
export const workboxOptions = {
  // Built scripts, styles, icons and the self-hosted font files (story #76), plus the offline
  // copy of the shell. Never index.html.
  globPatterns: ['**/*.{js,css,svg,woff2}', OFFLINE_SHELL],
  // No cache-first shell for navigations: the network answers every live navigation.
  navigateFallback: null,
  // Navigations go to the network and are never stored; only on a network failure does the
  // precached offline shell answer. Figures: see `figureRoute`.
  runtimeCaching: [navigationRoute, figureRoute],
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

/** V8's explicit compile hint: compile every function in the file as it loads. */
export const COMPILE_HINT = '//# allFunctionsCalledOnLoad';

/**
 * Whether a built chunk carries the compile hint: the app's own screens do, since every function
 * in them runs as they draw. The chunks fetched in the background, used in part or later (the
 * reward moments' Motion, confetti, the cues), compile lazily as before.
 */
export function compileEagerly(chunkName: string): boolean {
  return !/rewards|confetti|cues/.test(chunkName);
}

/** The Latin font file, the one every screen uses: preloaded by the shell. */
export const LATIN_FONT = /nunito-latin-wght-normal-[\w-]+\.woff2$/;

/**
 * Preloads the Latin font from the shell (story 101 AC2), so it arrives with the stylesheet and
 * the first layout already uses it. Found late, it swapped in after the home was drawn and laid
 * every line out again: a long task while the first taps come.
 */
export function fontPreload(): Plugin {
  return {
    name: 'goalie-goals-font-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const font = Object.keys(ctx.bundle ?? {}).find((f) => LATIN_FONT.test(f));
        if (!font) return [];
        return [
          {
            tag: 'link',
            attrs: { rel: 'preload', href: `/${font}`, as: 'font', type: 'font/woff2', crossorigin: true },
            injectTo: 'head',
          },
        ];
      },
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
