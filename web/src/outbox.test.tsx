import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { History } from './ApprovalScreens';
import {
  cancel,
  enqueue,
  finishEvent,
  flushOutbox,
  LocalOutboxStore,
  MemoryOutboxStore,
  OUTBOX_KEY,
  prepareOnLaunch,
  startEvent,
  type OutboxEvent,
} from './outbox';
import { MemoryPauseStore } from './pain';
import { PROGRESS_OFFLINE_TEXT, QUEUED_TEXT } from './ProgressPanel';
import type { ProgressSummary } from './progress';
import type { AuditEntry } from './approvals';
import type { SessionResult } from './training';
import type { WakeLockController } from './wakeLock';
import { demoSession, PLANK, todayWith } from './session.fixture';

// Story #94: session starts and finishes wait in the device's outbox while offline, and go to
// the server in order when it is back. Invented demo content only.

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

const NOW = () => new Date(2026, 0, 5, 9, 0, 0);
const SESSION = demoSession({ warmUp: [], coolDown: [], cards: [PLANK] });
const RESULT: SessionResult = {
  itemId: SESSION.itemId,
  itemVersion: SESSION.itemVersion,
  outcome: 'done',
  praised: ['Keep breathing'],
  setsDone: 2,
  warmUpLogged: true,
  startedAt: '2026-01-05T09:00:00.000Z',
  endedAt: '2026-01-05T09:10:00.000Z',
};

function summary(over: Partial<ProgressSummary> = {}): ProgressSummary {
  const streak = { current: 1, best: 1 };
  return { date: '2026-01-05', xp: { total: 0, today: 0 }, team: streak, keeper: streak, parent: streak, today: null, runs: [], ...over };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** A keeper's server with a network switch. POSTs are recorded only when they reach it. */
function server() {
  const state = { online: true, startAnswer: 200 };
  const posts: { url: string; body: Record<string, unknown> }[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!state.online) throw new TypeError('Failed to fetch');
    const url = String(input);
    if (init?.method === 'POST') posts.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> });
    if (url === '/api/me') return json({ role: 'keeper' });
    if (url.startsWith('/api/training/today')) return json(todayWith({ today: SESSION }));
    if (url === '/api/training/started') return json(state.startAnswer === 200 ? { ok: true } : { error: 'not_approved' }, state.startAnswer);
    if (url === '/api/progress/sessions') {
      return json({ credit: { session: 10, stars: 1, form: 2, total: 12 }, summary: summary({ xp: { total: 12, today: 12 } }) });
    }
    if (url.startsWith('/api/progress/summary')) return json(summary());
    if (url === '/api/training/approved') return json({ items: [], waiting: 0 });
    if (url === '/api/audit') return json({ events: [] });
    if (url === '/api/pain/status') return json({ paused: false, since: null, reports: [] });
    return json({ error: 'not found' }, 404);
  });
  return { state, posts, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const stored = () => JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as OutboxEvent[];

/** Through the one-card session to its finish screen. */
function playToTheEnd() {
  click('Start set 1');
  click('End set');
  click('Keep breathing');
  click('Skip rest');
  click('End set');
  click('Skip');
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the outbox (AC1, AC6)', () => {
  it('sends events in order, and deletes each one once the server confirms it', async () => {
    const store = new LocalOutboxStore();
    const s = server();
    const start = startEvent(SESSION, NOW());
    const finish = finishEvent(RESULT, NOW());
    enqueue(store, start);
    enqueue(store, finish);
    expect(stored().map((e) => e.kind)).toEqual(['start', 'finish']);

    const r = await flushOutbox(store, s.fetchImpl);
    expect(s.posts.map((p) => p.url)).toEqual(['/api/training/started', '/api/progress/sessions']);
    expect(r.answers[start.id]).toEqual({ kind: 'confirmed', progress: null });
    expect(r.answers[finish.id]).toMatchObject({ kind: 'confirmed', progress: { credit: { total: 12 } } });
    // Confirmed: gone from the device, and an empty outbox leaves no key at all.
    expect(r.waiting).toBe(0);
    expect(store.read()).toEqual([]);
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });

  it('holds only the date, the session, the outcome and the ratings: no free text', () => {
    const store = new LocalOutboxStore();
    enqueue(store, finishEvent(RESULT, NOW()));
    const [e] = stored();
    expect(Object.keys(e).sort()).toEqual(
      ['date', 'held', 'id', 'itemId', 'itemVersion', 'kind', 'outcome', 'praised', 'warmUpLogged'].sort(),
    );
    expect(e).toMatchObject({ date: '2026-01-05', itemId: 'session-starter', itemVersion: 'sha256:session2', praised: ['Keep breathing'] });
    // A field the Decision does not allow is dropped on read.
    localStorage.setItem(OUTBOX_KEY, JSON.stringify([{ ...e, note: 'free text' }]));
    expect(Object.keys(store.read()[0])).not.toContain('note');
  });

  it('keeps everything, in order, when the network fails, and marks the start late', async () => {
    const store = new MemoryOutboxStore();
    const s = server();
    s.state.online = false;
    const start = startEvent(SESSION, NOW());
    enqueue(store, start);
    enqueue(store, finishEvent(RESULT, NOW()));
    const r = await flushOutbox(store, s.fetchImpl);
    expect(r.waiting).toBe(2);
    expect(store.read().map((e) => e.kind)).toEqual(['start', 'finish']);
    expect(store.read()[0]).toMatchObject({ id: start.id, late: true });

    s.state.online = true;
    await flushOutbox(store, s.fetchImpl);
    expect(s.posts[0]).toMatchObject({ url: '/api/training/started', body: { late: true, itemId: 'session-starter' } });
    expect(s.posts[1].body).toMatchObject({ outcome: 'done', praised: ['Keep breathing'] });
    expect(store.read()).toEqual([]);
  });

  it('a held stop waits; Resume deletes it; a new launch releases it', async () => {
    const store = new MemoryOutboxStore();
    const s = server();
    const stop = finishEvent({ ...RESULT, outcome: 'stopped' }, NOW(), true);
    enqueue(store, stop);
    await flushOutbox(store, s.fetchImpl);
    expect(s.posts).toEqual([]);
    expect(cancel(store, stop.id)).toBe(true);
    expect(store.read()).toEqual([]);

    enqueue(store, stop);
    enqueue(store, startEvent(SESSION, NOW()));
    prepareOnLaunch(store);
    expect(store.read()).toMatchObject([{ held: false }, { late: true }]);
    await flushOutbox(store, s.fetchImpl);
    expect(s.posts.map((p) => p.url)).toEqual(['/api/progress/sessions', '/api/training/started']);
  });

  it('drops a refused start and an event the server will never take, so nothing blocks', async () => {
    const store = new MemoryOutboxStore();
    const s = server();
    s.state.startAnswer = 409;
    const start = startEvent(SESSION, NOW());
    enqueue(store, start);
    const r = await flushOutbox(store, s.fetchImpl);
    expect(r.answers[start.id]).toEqual({ kind: 'refused' });
    expect(store.read()).toEqual([]);
  });

  it('two flushes at once send each event once', async () => {
    const store = new MemoryOutboxStore();
    const s = server();
    enqueue(store, startEvent(SESSION, NOW()));
    enqueue(store, finishEvent(RESULT, NOW()));
    await Promise.all([flushOutbox(store, s.fetchImpl), flushOutbox(store, s.fetchImpl)]);
    expect(s.posts).toHaveLength(2);
  });
});

describe('a session done offline (AC1, AC3)', () => {
  it('shows "Saved on this device; it will sync", then its XP once the network is back', async () => {
    const s = server();
    render(<App fetchImpl={s.fetchImpl} wakeLock={wake} now={NOW} pauseStore={new MemoryPauseStore()} />);
    const startButton = await screen.findByRole('button', { name: 'Start session' });

    s.state.online = false;
    fireEvent.click(startButton);
    playToTheEnd();
    expect(screen.getByRole('heading', { name: 'Session done' })).toBeTruthy();
    expect(await screen.findByText(QUEUED_TEXT)).toBeTruthy();
    expect(QUEUED_TEXT).toBe('Saved on this device; it will sync.');
    expect(stored().map((e) => e.kind)).toEqual(['start', 'finish']);
    expect(s.posts).toEqual([]);

    s.state.online = true;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    const earned = await screen.findByRole('region', { name: 'Earned today' });
    expect(within(earned).getByText('+12 XP')).toBeTruthy();
    expect(screen.queryByText(QUEUED_TEXT)).toBeNull();
    // In order: the start (late, so a parent's undo in between cannot take it away), then the finish.
    expect(s.posts.map((p) => p.url)).toEqual(['/api/training/started', '/api/progress/sessions']);
    expect(s.posts[0].body).toMatchObject({ late: true, date: '2026-01-05' });
    expect(s.posts[1].body).toMatchObject({ date: '2026-01-05', outcome: 'done', praised: ['Keep breathing'] });
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });

  it('online, the start and finish go at once and leave nothing on the device', async () => {
    const s = server();
    render(<App fetchImpl={s.fetchImpl} wakeLock={wake} now={NOW} pauseStore={new MemoryPauseStore()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    await waitFor(() => expect(s.posts.map((p) => p.url)).toEqual(['/api/training/started']));
    expect(s.posts[0].body).toMatchObject({ late: false });
    playToTheEnd();
    expect(await screen.findByText('+12 XP')).toBeTruthy();
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });
});

describe('Stop is kept on the device at the tap (AC1)', () => {
  it('Resume deletes it; closing the app inside the Resume window still records it', async () => {
    const s = server();
    const first = render(<App fetchImpl={s.fetchImpl} wakeLock={wake} now={NOW} pauseStore={new MemoryPauseStore()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    await waitFor(() => expect(s.posts).toHaveLength(1));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    click('Stop');
    expect(stored()).toMatchObject([{ kind: 'finish', outcome: 'stopped', held: true }]);
    click('Resume');
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();

    click('Stop');
    expect(stored()).toMatchObject([{ kind: 'finish', outcome: 'stopped', held: true }]);
    // The app closes before the Resume window ends: nothing was sent yet.
    first.unmount();
    vi.useRealTimers();
    expect(s.posts).toHaveLength(1);

    // It opens again: the stop goes out.
    render(<App fetchImpl={s.fetchImpl} wakeLock={wake} now={NOW} pauseStore={new MemoryPauseStore()} />);
    await waitFor(() => expect(s.posts.map((p) => p.url)).toEqual(['/api/training/started', '/api/progress/sessions']));
    expect(s.posts[1].body).toMatchObject({ outcome: 'stopped' });
    await waitFor(() => expect(localStorage.getItem(OUTBOX_KEY)).toBeNull());
  });
});

describe('the progress panel offline (AC4)', () => {
  it('says progress updates when back online', async () => {
    const s = server();
    render(<App fetchImpl={s.fetchImpl} wakeLock={wake} now={NOW} pauseStore={new MemoryPauseStore()} />);
    await screen.findByRole('button', { name: 'Start session' });
    s.state.online = false;
    // Reload the panel offline (a finished session refreshes it).
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
    playToTheEnd();
    click('Done for today');
    const panel = await screen.findByRole('article', { name: 'Together so far' });
    expect(await within(panel).findByText(PROGRESS_OFFLINE_TEXT)).toBeTruthy();
    expect(PROGRESS_OFFLINE_TEXT).toMatch(/update .* back online/);
    expect(within(panel).queryByText(/after your next session/)).toBeNull();
  });
});

describe('History shows a start that beat the undo (AC2)', () => {
  it('names the session and says it still counts', async () => {
    const events: AuditEntry[] = [
      {
        id: 'e1',
        requestId: 'r2',
        at: '2026-01-05T09:00:30Z',
        action: 'started',
        actorRole: 'keeper',
        kind: 'plan',
        title: 'Session: Strong middle',
        reason: 'Started before the undo reached the device',
      },
    ];
    const fetchImpl = (async () => json({ events })) as unknown as typeof fetch;
    render(<History fetchImpl={fetchImpl} />);
    expect(
      await screen.findByText(/Session: Strong middle started before the undo reached the device; it still counts/),
    ).toBeTruthy();
  });
});
