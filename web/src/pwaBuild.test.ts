// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { generateSW } from 'workbox-build';
import { FIGURE_CACHE } from './figures';
import { COMPILE_HINT, LATIN_FONT, OFFLINE_SHELL, workboxOptions } from './pwaConfig';

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

// Story 101 AC2, the app built for real: each role's home and the session player are lazy
// chunks, kept out of the first script, and the service worker precaches every chunk, so an
// offline launch (US5) opens any screen. The shell preloads the font, and the app's own chunks
// carry the compile hint.
describe('the real build (story 101 AC2)', () => {
  const out = mkdtempSync(join(tmpdir(), 'goalie-goals-build-'));
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  it('splits the screens into chunks and precaches every one', async () => {
    // The app's own build command (`vite build`), into a folder of its own.
    const root = fileURLToPath(new URL('..', import.meta.url));
    const vite = join(dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin', 'vite.js');
    execFileSync(process.execPath, [vite, 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], {
      cwd: root,
      stdio: 'pipe',
      // As `npm run build` runs it, not as the test runner's environment.
      env: { ...process.env, NODE_ENV: 'production' },
    });
    const assets = readdirSync(join(out, 'assets'));
    const js = assets.filter((f) => f.endsWith('.js'));
    const named = (name: string) => js.filter((f) => f.startsWith(`${name}-`));
    for (const name of ['KeeperHome', 'ParentHome', 'SessionPlayer']) expect(named(name)).toHaveLength(1);

    // The first script imports none of the screens statically: they load on demand.
    const [entry] = named('index');
    const first = readFileSync(join(out, 'assets', entry), 'utf8');
    for (const name of ['KeeperHome', 'ParentHome', 'SessionPlayer']) {
      expect(first).not.toMatch(new RegExp(`import[^;("]*"\\./${name}-`));
    }
    expect(first).toContain(COMPILE_HINT);

    // Every chunk is in the precache, with the offline shell.
    const sw = readFileSync(join(out, 'sw.js'), 'utf8');
    const precached = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
    for (const f of js) expect(precached).toContain(`assets/${f}`);
    expect(precached).toContain(OFFLINE_SHELL);

    // The shell preloads the Latin font, the same file the stylesheet uses; so does its offline copy.
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    const font = assets.find((f) => LATIN_FONT.test(f));
    expect(font).toBeTruthy();
    expect(html).toContain(`<link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin>`);
    expect(readFileSync(join(out, OFFLINE_SHELL), 'utf8')).toBe(html);
  }, 120_000);
});
