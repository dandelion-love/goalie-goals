// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { generateSW } from 'workbox-build';
import { FIGURE_CACHE } from './figures';
import { OFFLINE_SHELL, workboxOptions } from './pwaConfig';

// Story #94 AC5, a build test: the service worker built from the app's Workbox options (the
// same ones vite.config.ts hands vite-plugin-pwa) precaches the shell's offline copy and the
// built assets, keeps figures in their own cache only, and caches no other API answer.

const dir = mkdtempSync(join(tmpdir(), 'goalie-goals-sw-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function build(): Promise<string> {
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>app</title>');
  writeFileSync(join(dir, OFFLINE_SHELL), '<!doctype html><title>app</title>');
  writeFileSync(join(dir, 'app.js'), 'console.log(1);');
  await generateSW({
    ...workboxOptions,
    globDirectory: dir,
    swDest: join(dir, 'sw.js'),
    mode: 'development',
    inlineWorkboxRuntime: true,
  });
  return readFileSync(join(dir, 'sw.js'), 'utf8');
}

describe('the built service worker (AC5)', () => {
  it("serves today's figures from their own cache when offline, and caches nothing else", async () => {
    const sw = await build();
    const routes = sw.slice(sw.indexOf('precacheAndRoute(['));
    // Precache: the offline copy of the shell and the assets, never the live shell.
    expect(routes).toContain(`"url": "${OFFLINE_SHELL}"`);
    expect(routes).toContain('"url": "app.js"');
    expect(routes).not.toContain('"url": "index.html"');
    // Two routes: navigations (network only, offline shell on failure), then card figures.
    expect(routes.match(/registerRoute\(/g)).toHaveLength(2);
    expect(routes).toContain('request.mode === "navigate", new NetworkOnly(');
    // Figures: network first, reading their own cache only when the network fails; the worker
    // never writes to it (the app keeps exactly today's, src/figures.ts).
    expect(routes).toContain(String.raw`/^\/api\/training\/cards\/[^/]+\/figure\.svg$/.test(url.pathname), new NetworkFirst(`);
    expect(routes).toContain('cacheWillUpdate: async () => null');
    // One named cache in the whole worker, and no other API path: no history, audit or progress.
    expect([...routes.matchAll(/"cacheName": "([^"]+)"/g)].map((m) => m[1])).toEqual([FIGURE_CACHE]);
    expect(routes).not.toMatch(/audit|progress|approvals|pain|today/);
  }, 120_000);
});
