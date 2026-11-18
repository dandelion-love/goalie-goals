// The figures of today's approved cards, kept on the device so they show offline (story #94 AC5).
//
// Figures are app content, served only for an approved card version. Within the front-end
// Decision's cache rules, the device keeps the figures of today's approved session and nothing
// else: each time today loads from the server, this cache is made to hold exactly those, so a
// figure from an earlier day, a card library, the history or the audit is never kept. A
// redirect (the sign-in proxy) or anything that is not an image is never stored. The service
// worker reads this cache only when the network fails (src/pwaConfig.ts) and never writes to it.

import type { Today } from './training';

export const FIGURE_CACHE = 'goalie-goals-figures';

/** The figure URLs of today's approved session (or the last approved version on offer). */
export function todayFigureUrls(today: Today): string[] {
  if (today.paused) return [];
  const session = today.today ?? today.lastApproved;
  return [...new Set((session?.cards ?? []).map((c) => c.figureUrl).filter((u) => u.startsWith('/api/training/cards/')))];
}

/** Keep exactly today's figures in the cache. Quietly does nothing without the Cache API. */
export async function precacheFigures(
  today: Today,
  { cacheStorage = globalThis.caches, fetchImpl = fetch }: { cacheStorage?: CacheStorage; fetchImpl?: typeof fetch } = {},
): Promise<void> {
  if (!cacheStorage) return;
  try {
    const cache = await cacheStorage.open(FIGURE_CACHE);
    const wanted = todayFigureUrls(today);
    const keep = new Set(wanted.map((u) => new URL(u, location.href).href));
    for (const request of await cache.keys()) {
      if (!keep.has(request.url)) await cache.delete(request);
    }
    for (const url of wanted) {
      if (await cache.match(url)) continue;
      const res = await fetchImpl(url, { credentials: 'same-origin' });
      const type = res.headers.get('content-type') ?? '';
      if (res.ok && !res.redirected && type.startsWith('image/svg+xml')) await cache.put(url, res);
    }
  } catch {
    // Offline, or storage refused: the figures load from the network as before.
  }
}
