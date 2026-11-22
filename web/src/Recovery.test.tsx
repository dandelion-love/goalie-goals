import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { MemoryOfflineStore, LocalOfflineStore, ROLE_KEY, TODAY_KEY } from './offline';
import { MemoryPauseStore } from './pain';
import { figureRoute, navigationRoute, OFFLINE_SHELL, workboxOptions } from './pwaConfig';
import type { AuditEntry, PendingRequest } from './approvals';
import type { WakeLockController } from './wakeLock';
import { todayWith } from './session.fixture';

// Story #80: steady on load, helpful offline. Invented cast and demo content only.

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
} as unknown as WakeLockController;

const NOW = () => new Date(2026, 0, 5, 9, 0, 0);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const offlineError = () => {
  throw new TypeError('Failed to fetch');
};

function keeper(state: { online: boolean; startAnswer?: number }) {
  const urls: string[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    urls.push(`${init?.method ?? 'GET'} ${url}`);
    if (!state.online) offlineError();
    if (url === '/api/me') return json({ role: 'keeper' });
    if (url.startsWith('/api/training/today')) return json(todayWith());
    if (url === '/api/training/started') return json(state.startAnswer === 409 ? { error: 'not_approved' } : { ok: true }, state.startAnswer ?? 200);
    if (url === '/api/training/approved') return json({ items: [], waiting: 0 });
    if (url === '/api/audit') return json({ events: [] });
    if (url === '/api/pain/status') return json({ paused: false, since: null, reports: [] });
    if (url.startsWith('/api/progress/summary')) {
      const streak = { current: 0, best: 0 };
      return json({ date: '2026-01-05', xp: { total: 0, today: 0 }, team: streak, keeper: streak, parent: streak, today: null, runs: [] });
    }
    return json({ error: 'not found' }, 404);
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, urls };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('offline (AC2)', () => {
  it("opens the keeper's home from the device with an offline notice, and today's session still starts", async () => {
    const state = { online: true };
    const server = keeper(state);
    const store = new MemoryOfflineStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} now={NOW} offlineStore={store} pauseStore={new MemoryPauseStore()} />);
    expect(await screen.findByRole('button', { name: 'Start session' })).toBeTruthy();
    expect(store.role).toBe('keeper');
    expect(store.today?.today?.itemVersion).toBe('sha256:session2');
    cleanup();

    // Reload with the network off.
    state.online = false;
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} now={NOW} offlineStore={store} pauseStore={new MemoryPauseStore()} />);
    expect(await screen.findByText(/You're offline\. Today's session and the pause still work on this device\./)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Today', level: 1 })).toBeTruthy();
    expect(await screen.findByText('Saved on this device.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
    // The player runs from the device; the start mark simply waits for the network.
    expect(await screen.findByRole('button', { name: 'Something hurts' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Today', level: 1 })).toBeNull();
  });

  it('shows the pause from the device offline, and nothing to start', async () => {
    const server = keeper({ online: false });
    const pause = new MemoryPauseStore({ since: '2026-01-05', reportId: 'r1', sent: true, report: null });
    render(
      <App
        fetchImpl={server.fetchImpl}
        wakeLock={wake}
        now={NOW}
        offlineStore={new MemoryOfflineStore('keeper', todayWith())}
        pauseStore={pause}
      />,
    );
    expect(await screen.findByText(/You're offline/)).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });

  it('tells the parent approvals need a connection', async () => {
    const server = keeper({ online: false });
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} now={NOW} offlineStore={new MemoryOfflineStore('parent')} />);
    expect(await screen.findByText("You're offline. Approvals need a connection.")).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Progress', level: 1 })).toBeTruthy();
  });

  it('without a saved role, offline is the plain error with Retry', async () => {
    const server = keeper({ online: false });
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} now={NOW} offlineStore={new MemoryOfflineStore()} />);
    expect(await screen.findByRole('heading', { name: "Can't reach the app" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('keeps only the role and approved sessions on the device: no history, inbox or progress', async () => {
    const server = keeper({ online: true });
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} now={NOW} pauseStore={new MemoryPauseStore()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Training' }));
    expect(await screen.findByRole('heading', { name: 'History' })).toBeTruthy();
    await waitFor(() => expect(localStorage.getItem(TODAY_KEY)).not.toBeNull());
    expect(Object.keys(localStorage).sort()).toEqual([ROLE_KEY, TODAY_KEY].sort());
    expect(new LocalOfflineStore().readToday('2026-01-05')?.today?.itemId).toBe('session-starter');
    expect(new LocalOfflineStore().readToday('2026-01-06')).toBeNull();
  });

  it('the service worker never answers a navigation from a cache, only falls back to the offline shell', () => {
    expect(workboxOptions.navigateFallback).toBeNull();
    expect(workboxOptions.globPatterns).toContain(OFFLINE_SHELL);
    expect(workboxOptions.globPatterns.some((g) => g.includes('html') && g !== OFFLINE_SHELL)).toBe(false);
    // Navigations first; the only other route is today's figures (story #94, outbox.test.ts).
    expect(workboxOptions.runtimeCaching).toEqual([navigationRoute, figureRoute]);
    const nav = navigationRoute;
    expect(nav.handler).toBe('NetworkOnly');
    expect(nav.options.precacheFallback.fallbackURL).toBe(OFFLINE_SHELL);
    expect(nav.urlPattern({ request: { mode: 'navigate' } as Request })).toBe(true);
    expect(nav.urlPattern({ request: { mode: 'cors' } as Request })).toBe(false);
  });
});

describe('a refused start (AC4)', () => {
  it('closes the player before the first set when the approval was just undone', async () => {
    const server = keeper({ online: true, startAnswer: 409 });
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} now={NOW} pauseStore={new MemoryPauseStore()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    expect(await screen.findByText("Today's session changed. Check it again.")).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Today', level: 1 })).toBeTruthy();
    expect(server.urls).toContain('POST /api/training/started');
  });
});

describe('errors offer Retry (AC3)', () => {
  it('Today, Inbox and History show a plain message and a Retry that loads again', async () => {
    let fail = true;
    const pending: PendingRequest[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/me') return json({ role: 'parent' });
      if (fail && (url === '/api/approvals/pending' || url === '/api/audit')) return json({ error: 'boom' }, 500);
      if (url === '/api/approvals/pending') return json({ requests: pending });
      if (url === '/api/notifications/badge') return json({ unread: 0 });
      if (url === '/api/audit') return json({ events: [] });
      if (url === '/api/pain/status') return json({ paused: false, since: null, reports: [] });
      if (url.startsWith('/api/progress/summary')) {
        const s = { current: 0, best: 0 };
        return json({ date: '2026-01-05', xp: { total: 0, today: 0 }, team: s, keeper: s, parent: s, today: null, runs: [] });
      }
      return json({ error: 'not found' }, 404);
    }) as typeof fetch;
    render(<App fetchImpl={fetchImpl} now={NOW} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    expect(await screen.findByText("Couldn't load the inbox.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/pull|swipe|refresh/i);
    fail = false;
    fireEvent.click(within(screen.getByRole('article', { name: /^Inbox/ })).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Nothing to approve.')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    expect(await screen.findByText("Couldn't load the history.")).toBeTruthy();
    fireEvent.click(within(screen.getByRole('article', { name: 'History' })).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Nothing yet.')).toBeTruthy();
  });

  it("Today's error has Retry", async () => {
    let fail = true;
    const server = keeper({ online: true });
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (fail && String(input).startsWith('/api/training/today')) return json({ error: 'boom' }, 500);
      return server.fetchImpl(input, init);
    }) as typeof fetch;
    render(<App fetchImpl={fetchImpl} wakeLock={wake} now={NOW} pauseStore={new MemoryPauseStore()} />);
    const today = await screen.findByRole('article', { name: 'Today' });
    expect(await within(today).findByText(/Couldn't load today's session/)).toBeTruthy();
    expect(today.textContent).not.toMatch(/pull|swipe/i);
    fail = false;
    fireEvent.click(within(today).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: 'Start session' })).toBeTruthy();
  });
});

describe('layout stability (AC1)', () => {
  it('holds each panel below hidden until the panels above it have loaded', async () => {
    let releaseProgress: () => void = () => {};
    const progressGate = new Promise<void>((r) => (releaseProgress = r));
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/me') return json({ role: 'parent' });
      if (url.startsWith('/api/progress/summary')) {
        await progressGate;
        const s = { current: 1, best: 1 };
        return json({ date: '2026-01-05', xp: { total: 5, today: 5 }, team: s, keeper: s, parent: s, today: null, runs: [] });
      }
      if (url === '/api/approvals/pending') return json({ requests: [] });
      if (url === '/api/notifications/badge') return json({ unread: 0 });
      if (url === '/api/audit') return json({ events: [] });
      if (url === '/api/pain/status') return json({ paused: false, since: null, reports: [] });
      return json({ error: 'not found' }, 404);
    }) as typeof fetch;
    render(<App fetchImpl={fetchImpl} now={NOW} />);
    const progress = await screen.findByRole('article', { name: 'Together so far' });
    // The skeleton has the final tiles, so the panel keeps its size as it fills.
    expect(within(progress).getByText('Team streak')).toBeTruthy();
    expect(progress.getAttribute('aria-busy')).toBe('true');
    // The inbox has loaded already but stays hidden, so it cannot be pushed down on screen.
    await waitFor(() => expect(screen.getByText('Nothing to approve.')).toBeTruthy());
    expect(screen.queryByRole('article', { name: 'Inbox' })).toBeNull();
    releaseProgress();
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: /^Inbox/ }));
    expect(await screen.findByRole('article', { name: /^Inbox/ })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    expect(await screen.findByRole('article', { name: 'History' })).toBeTruthy();
  });
});

describe('undo an approval (AC4)', () => {
  function parentServer() {
    const request: PendingRequest = {
      id: 'r1',
      kind: 'plan',
      itemId: 'plan-starter',
      itemVersion: 'sha256:a1',
      title: 'Starter plan',
      detail: 'Three short sessions a week.',
      state: 'pending',
      createdAt: '2026-01-05T09:00:00Z',
      expiresAt: '2026-01-12T09:00:00Z',
    };
    const state = { pending: [request], audit: [] as AuditEntry[], undoAnswer: 200, undoForMs: 30_000, posts: [] as string[] };
    const event = (action: AuditEntry['action'], undoForMs = 0): AuditEntry => ({
      id: `e${state.audit.length}`,
      requestId: 'r1',
      at: '2026-01-05T09:00:00Z',
      action,
      actorRole: 'parent',
      kind: 'plan',
      title: request.title,
      reason: null,
      undoForMs,
    });
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') state.posts.push(url);
      if (url === '/api/me') return json({ role: 'parent' });
      if (url === '/api/approvals/pending') return json({ requests: state.pending });
      if (url === '/api/notifications/badge') return json({ unread: state.pending.length });
      if (url === '/api/audit') return json({ events: state.audit });
      if (url === '/api/pain/status') return json({ paused: false, since: null, reports: [] });
      if (url.startsWith('/api/progress/summary')) {
        const s = { current: 0, best: 0 };
        return json({ date: '2026-01-05', xp: { total: 0, today: 0 }, team: s, keeper: s, parent: s, today: null, runs: [] });
      }
      if (url === '/api/approvals/r1/approve') {
        state.pending = [];
        state.audit = [...state.audit, event('approved', state.undoForMs)];
        return json({ request: { ...request, state: 'approved' }, undoForMs: state.undoForMs });
      }
      if (url === '/api/approvals/r1/undo') {
        if (state.undoAnswer !== 200) return json({ error: 'started' }, state.undoAnswer);
        state.pending = [request];
        state.audit = state.audit.map((e) => ({ ...e, undoForMs: 0 }));
        state.audit = [...state.audit, event('undone')];
        return json({ request });
      }
      return json({ error: 'not found' }, 404);
    }) as typeof fetch;
    return { state, fetchImpl };
  }

  it('offers Undo in a toast after Approve; Undo puts the request back and the History shows it', async () => {
    const server = parentServer();
    render(<App fetchImpl={server.fetchImpl} now={NOW} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    const inbox = await screen.findByRole('article', { name: /^Inbox/ });
    if (within(inbox).queryAllByRole('button', { name: /^(Approve|Decline|Read it)$/ }).length === 0) fireEvent.click(await within(inbox).findByRole('button', { name: /^Review/ }));
    fireEvent.click(await within(inbox).findByRole('button', { name: 'Approve' }));
    const toast = await screen.findByText('Approved: Starter plan');
    fireEvent.click(within(toast.parentElement!).getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText("Approval undone. It's back in the inbox.")).toBeTruthy();
    fireEvent.click(await within(inbox).findByRole('button', { name: /^Review/ }));
    expect(await within(inbox).findByRole('button', { name: 'Approve' })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    expect(await screen.findByText(/Parent undid the approval of Starter plan/)).toBeTruthy();
    expect(server.state.posts).toEqual(['/api/approvals/r1/approve', '/api/approvals/r1/undo']);
  });

  it('offers Undo on the History entry inside the window, and says so when the keeper has started', async () => {
    const server = parentServer();
    server.state.undoAnswer = 409;
    render(<App fetchImpl={server.fetchImpl} now={NOW} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    const inbox = await screen.findByRole('article', { name: /^Inbox/ });
    if (within(inbox).queryAllByRole('button', { name: /^(Approve|Decline|Read it)$/ }).length === 0) fireEvent.click(await within(inbox).findByRole('button', { name: /^Review/ }));
    fireEvent.click(await within(inbox).findByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    const undo = await screen.findByRole('button', { name: 'Undo approval of Starter plan' });
    fireEvent.click(undo);
    expect(await screen.findByText('The keeper has already started this session, so it stays approved.')).toBeTruthy();
  });

  it('hides the Undo when the window ends', async () => {
    const server = parentServer();
    server.state.undoForMs = 50;
    render(<App fetchImpl={server.fetchImpl} now={NOW} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    const inbox = await screen.findByRole('article', { name: /^Inbox/ });
    if (within(inbox).queryAllByRole('button', { name: /^(Approve|Decline|Read it)$/ }).length === 0) fireEvent.click(await within(inbox).findByRole('button', { name: /^Review/ }));
    fireEvent.click(await within(inbox).findByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Approved: Starter plan')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Approved: Starter plan')).toBeNull());
    await waitFor(() => expect(screen.queryByRole('button', { name: /Undo/ })).toBeNull());
  });
});
