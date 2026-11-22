import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { GENERATION_HEADER, GENERATION_KEY, LocalGenerationStore, MemoryGenerationStore, withGeneration } from './generation';
import { MemoryOfflineStore } from './offline';
import { MemoryOutboxStore, type OutboxEvent } from './outbox';
import { MemoryPauseStore, type LocalPause } from './pain';
import { todayWith } from './session.fixture';
import type { WakeLockController } from './wakeLock';

// Story 121 AC4: a device drops its stale copies (today's cached session, its queued outbox
// events, a pause the server already had) only once an answer from the server names a new
// generation, and never sends a session event from before the reset again. A pain report made on
// the device and not yet sent is never dropped: it is sent under the new generation, and its
// pause holds until the server says training is paused.

const wake: WakeLockController = {
  status: 'active',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

const NOW = () => new Date('2026-01-05T10:00:00');

/** A report made on the device and not sent yet (offline). */
const PAUSE: LocalPause = { since: '2026-01-05', reportId: 'pain-old-0001', sent: false, report: { bodyArea: 'knee', note: '' } };
/** A pause the server already had before the reset, with a sent mistake note. */
const SENT_PAUSE: LocalPause = { since: '2026-01-05', reportId: 'pain-sent-0001', sent: true, report: null, mistake: { id: 'mist-sent-0001', sent: true } };

/** Records every clear, so a test can tell the pause held throughout. */
class WatchedPauseStore extends MemoryPauseStore {
  clears = 0;
  override clear() {
    this.clears += 1;
    super.clear();
  }
}
const QUEUED: OutboxEvent[] = [
  { id: 'start-old-0001', kind: 'start', date: '2026-01-05', itemId: 'session-starter', itemVersion: 'sha256:s1', late: true },
  {
    id: 'finish-old-0001',
    kind: 'finish',
    date: '2026-01-05',
    itemId: 'session-starter',
    itemVersion: 'sha256:s1',
    outcome: 'done',
    warmUpLogged: true,
    praised: [],
    held: false,
  },
];

function copies(pause: LocalPause = PAUSE) {
  return {
    outbox: new MemoryOutboxStore(QUEUED.map((e) => ({ ...e }))),
    pause: new WatchedPauseStore({ ...pause }),
    cache: new MemoryOfflineStore('keeper', todayWith()),
  };
}

const answer = (generation: number | null, body: unknown = {}, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: generation === null ? {} : { [GENERATION_HEADER]: String(generation) },
  });

afterEach(cleanup);

// The keeper's home loads its panels in turn: allow for a slow full run.
configure({ asyncUtilTimeout: 5000 });

describe('the generation on every request and answer', () => {
  it('names the device generation on API requests (0 before any answer), and adopts the first one seen', async () => {
    const sent: (string | null)[] = [];
    const fake = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      sent.push(new Headers(init?.headers).get(GENERATION_HEADER));
      return answer(0);
    });
    const store = new MemoryGenerationStore();
    const c = copies();
    const onReset = vi.fn();
    const api = withGeneration(fake as unknown as typeof fetch, store, c, onReset);
    await api('/api/me', { headers: { Accept: 'application/json' } });
    expect(store.value).toBe(0);
    await api('/api/pain', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(sent).toEqual(['0', '0']);
    // The caller's own headers stay.
    expect(new Headers(fake.mock.calls[1][1]?.headers).get('Content-Type')).toBe('application/json');
    expect(onReset).not.toHaveBeenCalled();
    expect(c.outbox.events).toHaveLength(2);
    expect(c.pause.value).toEqual(PAUSE);
  });

  it('never drops anything on its own: not offline, not on an error, not on an answer without the header', async () => {
    const store = new MemoryGenerationStore(0);
    const c = copies();
    const onReset = vi.fn();
    const failing = withGeneration((async () => Promise.reject(new TypeError('offline'))) as typeof fetch, store, c, onReset);
    await expect(failing('/api/me')).rejects.toThrow('offline');
    const errors = withGeneration((async () => answer(null, { error: 'x' }, 503)) as typeof fetch, store, c, onReset);
    await errors('/api/pain/status');
    const same = withGeneration((async () => answer(0)) as typeof fetch, store, c, onReset);
    await same('/api/pain/status');
    expect(onReset).not.toHaveBeenCalled();
    expect(c.outbox.events).toHaveLength(2);
    expect(c.pause.value).toEqual(PAUSE);
    expect(c.cache.today).not.toBeNull();
  });

  it('a new generation drops the outbox, a sent pause and the cached session, then sends the new one', async () => {
    const store = new MemoryGenerationStore(0);
    const c = copies(SENT_PAUSE);
    const onReset = vi.fn();
    const sent: (string | null)[] = [];
    const api = withGeneration(
      (async (_input: RequestInfo | URL, init?: RequestInit) => {
        sent.push(new Headers(init?.headers).get(GENERATION_HEADER));
        return answer(1);
      }) as typeof fetch,
      store,
      c,
      onReset,
    );
    await api('/api/me');
    expect(onReset).toHaveBeenCalledWith(1);
    expect(store.value).toBe(1);
    expect(c.outbox.events).toEqual([]);
    expect(c.pause.value).toBeNull();
    expect(c.cache.today).toBeNull();
    await api('/api/pain/status');
    expect(sent).toEqual(['0', '1']);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('a new generation keeps an unsent pain report and its pause (with its own mistake note)', async () => {
    const withNote: LocalPause = { ...PAUSE, mistake: { id: 'mist-old-0001', sent: false } };
    const c = copies(withNote);
    const api = withGeneration((async () => answer(1)) as typeof fetch, new MemoryGenerationStore(0), c, vi.fn());
    await api('/api/me');
    expect(c.pause.value).toEqual(withNote);
    expect(c.pause.clears).toBe(0);
    expect(c.outbox.events).toEqual([]);
    expect(c.cache.today).toBeNull();
  });

  it('keeps the generation in localStorage', () => {
    new LocalGenerationStore().write(3);
    expect(localStorage.getItem(GENERATION_KEY)).toBe('3');
    expect(new LocalGenerationStore().read()).toBe(3);
  });
});

describe('the keeper device after the parent started fresh', () => {
  /** A server after a reset: generation 1 on every answer; a write from generation 0 is refused. */
  function serverAfterReset() {
    const writes: { url: string; generation: string | null }[] = [];
    /** Pain reports the server took, under the generation they came with. */
    const pains: Record<string, unknown>[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const generation = new Headers(init?.headers).get(GENERATION_HEADER);
      if (init?.method && init.method !== 'GET') {
        writes.push({ url, generation });
        if (generation !== '1') return answer(1, { error: 'stale_generation' }, 409);
      }
      if (url === '/api/pain') {
        const body = JSON.parse(String(init?.body)) as { id: string; date: string };
        pains.push({ ...body, generation });
        return answer(1, { paused: true, report: { id: body.id, date: body.date } });
      }
      if (url === '/api/me') return answer(1, { role: 'keeper' });
      if (url.startsWith('/api/training/today')) return answer(1, todayWith({ today: null, waiting: 6, paused: pains.length > 0 }));
      if (url === '/api/pain/status') {
        return answer(1, pains.length ? { paused: true, since: '2026-01-05', reports: pains.map((p) => ({ id: p.id, date: p.date })) } : { paused: false, since: null, reports: [] });
      }
      if (url === '/api/training/approved') return answer(1, { items: [], waiting: 6 });
      if (url === '/api/audit') return answer(1, { events: [] });
      if (url === '/api/history/sessions') return answer(1, { sessions: [] });
      if (url.startsWith('/api/progress/summary')) {
        const streak = { current: 0, best: 0 };
        return answer(1, { date: '2026-01-05', xp: { total: 0, today: 0 }, team: streak, keeper: streak, parent: streak, today: null, runs: [] });
      }
      return answer(1, { error: 'not found' }, 404);
    });
    return { fetchImpl: fetchImpl as unknown as typeof fetch, writes, pains };
  }

  it('an offline pain report survives the reset: sent once under the new generation, the pause held throughout', async () => {
    const server = serverAfterReset();
    const c = copies();
    const generations = new MemoryGenerationStore(0);
    render(
      <App
        fetchImpl={server.fetchImpl}
        wakeLock={wake}
        now={NOW}
        pauseStore={c.pause}
        offlineStore={c.cache}
        outboxStore={c.outbox}
        generationStore={generations}
      />,
    );
    expect(await screen.findByText('Training data was cleared. Starting fresh.')).toBeTruthy();
    await waitFor(() => expect(generations.value).toBe(1));
    // Stale training data is gone: the queued start and finish, and the cached session.
    expect(c.outbox.events).toEqual([]);
    expect(c.cache.readToday('2026-01-05')).toBeNull();
    // The report goes once, under the new generation, and the server then says paused.
    await waitFor(() => expect(server.pains).toHaveLength(1));
    expect(server.pains[0]).toMatchObject({ id: 'pain-old-0001', bodyArea: 'knee', generation: '1' });
    await waitFor(() => expect(c.pause.value?.sent).toBe(true));
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    await new Promise((r) => setTimeout(r, 50));
    expect(server.pains).toHaveLength(1);
    // The pause was never lifted, and nothing from before was sent.
    expect(c.pause.clears).toBe(0);
    expect(c.pause.value).not.toBeNull();
    expect(server.writes.filter((w) => w.generation !== '1')).toEqual([]);
    expect(server.writes.map((w) => w.url)).toEqual(['/api/pain']);
  });

  it('a pause the server already had goes with the old household, and old session events are never sent', async () => {
    const server = serverAfterReset();
    const c = copies(SENT_PAUSE);
    const generations = new MemoryGenerationStore(0);
    render(
      <App
        fetchImpl={server.fetchImpl}
        wakeLock={wake}
        now={NOW}
        pauseStore={c.pause}
        offlineStore={c.cache}
        outboxStore={c.outbox}
        generationStore={generations}
      />,
    );
    expect(await screen.findByText('Training data was cleared. Starting fresh.')).toBeTruthy();
    await screen.findByRole('heading', { name: 'Today', level: 1 });
    await new Promise((r) => setTimeout(r, 50));
    expect(c.pause.value).toBeNull();
    expect(c.outbox.events).toEqual([]);
    expect(server.writes).toEqual([]);
    expect(screen.queryByRole('heading', { name: 'Training is paused' })).toBeNull();
  });

  it('a session event already on its way with the old generation is refused, and the outbox dropped', async () => {
    const server = serverAfterReset();
    const c = copies(SENT_PAUSE);
    const api = withGeneration(server.fetchImpl, new MemoryGenerationStore(0), c, vi.fn());
    const res = await api('/api/progress/sessions', { method: 'POST', body: '{}' });
    expect(res.status).toBe(409);
    expect(c.outbox.events).toEqual([]);
    expect(server.writes).toEqual([{ url: '/api/progress/sessions', generation: '0' }]);
  });

  it('offline, the device keeps its pause and its outbox: nothing is dropped without the server', async () => {
    const c = copies();
    const generations = new MemoryGenerationStore(0);
    const offline = (async () => Promise.reject(new TypeError('offline'))) as typeof fetch;
    render(
      <App fetchImpl={offline} wakeLock={wake} now={NOW} pauseStore={c.pause} offlineStore={c.cache} outboxStore={c.outbox} generationStore={generations} />,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(generations.value).toBe(0);
    expect(c.pause.value).not.toBeNull();
    expect(c.outbox.events.map((e) => e.id)).toEqual(['start-old-0001', 'finish-old-0001']);
    expect(screen.queryByText('Training data was cleared. Starting fresh.')).toBeNull();
  });
});
