import { describe, expect, it } from 'vitest';
import { FIGURE_CACHE, precacheFigures, todayFigureUrls } from './figures';
import { figureRoute, navigationRoute } from './pwaConfig';
import { BRIDGE, PLANK, demoSession, todayWith } from './session.fixture';

// Story #94 AC5: the figures of today's approved cards are kept for an offline session, and
// nothing else. The built service worker is checked in pwaBuild.test.ts.

/** A Cache API stand-in: one cache, keyed by absolute URL. */
function fakeCaches() {
  const entries = new Map<string, Response>();
  const opened: string[] = [];
  const abs = (u: RequestInfo | URL) => new URL(u instanceof Request ? u.url : String(u), location.href).href;
  const cache = {
    keys: async () => [...entries.keys()].map((u) => new Request(u)),
    match: async (u: RequestInfo | URL) => entries.get(abs(u)),
    put: async (u: RequestInfo | URL, r: Response) => void entries.set(abs(u), r),
    delete: async (u: RequestInfo | URL) => entries.delete(abs(u)),
  };
  const storage = { open: async (name: string) => (opened.push(name), cache) } as unknown as CacheStorage;
  return { storage, entries, opened };
}

const svg = () => new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } });

describe("today's figures (AC5)", () => {
  it("lists the figures of today's approved session, or the last approved one on offer", () => {
    expect(todayFigureUrls(todayWith({ today: demoSession({ cards: [PLANK, BRIDGE] }) }))).toEqual([PLANK.figureUrl, BRIDGE.figureUrl]);
    expect(todayFigureUrls(todayWith({ today: null, lastApproved: demoSession({ cards: [PLANK] }) }))).toEqual([PLANK.figureUrl]);
    expect(todayFigureUrls(todayWith({ today: null, lastApproved: null }))).toEqual([]);
    expect(todayFigureUrls(todayWith({ paused: true }))).toEqual([]);
  });

  it('keeps exactly those figures: an older one is removed, and only images are stored', async () => {
    const { storage, entries, opened } = fakeCaches();
    entries.set(new URL('/api/training/cards/old/figure.svg?v=x', location.href).href, svg());
    const fetched: string[] = [];
    const fetchImpl = (async (u: RequestInfo | URL) => {
      fetched.push(String(u));
      // The sign-in proxy's page never goes in the cache.
      if (String(u) === BRIDGE.figureUrl) return new Response('<html></html>', { headers: { 'content-type': 'text/html' } });
      return svg();
    }) as unknown as typeof fetch;

    await precacheFigures(todayWith({ today: demoSession({ cards: [PLANK, BRIDGE] }) }), { cacheStorage: storage, fetchImpl });
    expect(opened).toEqual([FIGURE_CACHE]);
    expect(fetched).toEqual([PLANK.figureUrl, BRIDGE.figureUrl]);
    expect([...entries.keys()].map((u) => new URL(u).pathname + new URL(u).search)).toEqual([PLANK.figureUrl]);

    // Paused: nothing to train, so nothing kept.
    await precacheFigures(todayWith({ paused: true, today: null }), { cacheStorage: storage, fetchImpl });
    expect(entries.size).toBe(0);
  });

  it('does nothing without the Cache API', async () => {
    await expect(precacheFigures(todayWith(), { cacheStorage: undefined })).resolves.toBeUndefined();
  });

  it("the worker's figure route matches card figures only, never history, audit or other API answers", () => {
    const match = (path: string, sameOrigin = true) =>
      figureRoute.urlPattern({ url: new URL(path, 'https://app.test'), sameOrigin });
    expect(match(PLANK.figureUrl)).toBe(true);
    expect(match(PLANK.figureUrl, false)).toBe(false);
    for (const path of ['/api/audit', '/api/training/today?date=2026-01-05', '/api/progress/summary', '/api/training/cards', '/api/pain/status']) {
      expect(match(path), path).toBe(false);
    }
    expect(figureRoute.options.cacheName).toBe(FIGURE_CACHE);
    expect(navigationRoute.options).not.toHaveProperty('cacheName');
  });

  it('the worker never writes a figure itself', async () => {
    const [plugin] = figureRoute.options.plugins;
    expect(await plugin.cacheWillUpdate()).toBeNull();
  });
});
