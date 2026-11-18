import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { SessionPlayer } from './SessionPlayer';
import { LocalPauseStore, MemoryPauseStore, PAUSE_KEY, type LocalPause } from './pain';
import type { AuditEntry } from './approvals';
import type { WakeLockController } from './wakeLock';
import { demoSession, todayWith } from './session.fixture';

// A fake API for the demo pair, with invented pain reports for the demo keeper only. The rules
// are tested on the server (server/test/pain.test.ts); this checks the screens, the device's
// copy of the pause and what is sent.

/** Invented note: it must reach the app's own API and nowhere else. */
const NOTE = 'Invented demo note: twinge after the plank, zq7-marker';

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

interface Report {
  id: string;
  bodyArea: string;
  note: string | null;
  date: string;
}

function fakeServer(role: 'keeper' | 'parent', init: { reports?: Report[] } = {}) {
  const state = { online: true, reports: [...(init.reports ?? [])], audit: [] as AuditEntry[] };
  const calls: { url: string; method: string; body: string }[] = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, req?: RequestInit) => {
    const url = String(input);
    const method = req?.method ?? 'GET';
    if (!state.online) throw new TypeError('Failed to fetch');
    calls.push({ url, method, body: String(req?.body ?? '') });
    const paused = state.reports.length > 0;
    if (url === '/api/me') return json({ role });
    if (url.startsWith('/api/training/today')) return json(todayWith({ paused, today: paused ? null : demoSession() }));
    if (url === '/api/pain/status') {
      return json({
        paused,
        since: state.reports[0]?.date ?? null,
        reports: state.reports.map((r) => (role === 'parent' ? r : { id: r.id, date: r.date })),
      });
    }
    if (url === '/api/pain' && method === 'POST') {
      const b = JSON.parse(String(req?.body)) as Report;
      if (!state.reports.some((r) => r.id === b.id)) {
        state.reports.push(b);
        state.audit.push({
          id: `e-${b.id}`,
          at: '2026-01-07T17:00:00Z',
          action: 'paused',
          actorRole: 'keeper',
          kind: 'pause',
          title: `something hurts (${b.bodyArea})`,
          reason: null,
        });
      }
      return json({ paused: true, report: { id: b.id, date: b.date } });
    }
    if (url === '/api/pain/clear' && method === 'POST') {
      if (role !== 'parent') return json({ error: 'forbidden' }, 403);
      state.reports = [];
      return json({ paused: false, cleared: 1 });
    }
    if (url === '/api/audit') return json({ events: state.audit });
    if (url === '/api/approvals/pending') return json({ requests: [] });
    if (url === '/api/notifications/badge') return json({ unread: state.reports.length });
    if (url === '/api/training/approved') return json({ items: [], waiting: 0 });
    return json({ error: 'not found' }, 404);
  });
  return { state, calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const hurtButton = () => screen.getByRole('button', { name: 'Something hurts' });

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('"Something hurts" is on every session screen (AC1)', () => {
  it('is reachable at each step and phase of the player', () => {
    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onExit={() => {}} />);
    const seen: string[] = [];
    const check = (where: string) => {
      expect(hurtButton().classList.contains('session-control')).toBe(true);
      seen.push(where);
    };
    check('warm-up move 1');
    click('Next');
    check('warm-up move 2');
    click('Next');
    check('card ready');
    click('Start set 1');
    check('timed hold');
    click('End set');
    check('form feedback');
    click('Skip');
    check('rest');
    click('Skip rest');
    click('End set');
    click('Skip');
    check('next card ready');
    click('Start set 1');
    check('rep counter');
    click('Set done');
    click('Skip');
    click('Skip rest');
    click('Set done');
    click('Skip');
    check('cool-down');
    expect(seen).toHaveLength(9);
  });

  it('is on the keeper home too, and starts a report there', async () => {
    const server = fakeServer('keeper');
    const store = new MemoryPauseStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Something hurts' }));
    expect(store.value).toMatchObject({ sent: false });
    expect(screen.getByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Pain report' })).toBeTruthy();
  });
});

describe('History after a report', () => {
  it('shows the report on the keeper home at once, without a reload', async () => {
    const server = fakeServer('keeper');
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} />);
    const history = await screen.findByRole('article', { name: 'History' });
    expect(await within(history).findByText('Nothing yet.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Something hurts' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Knee' }));
    click('Tell my parent');
    expect(await screen.findByText(/Your parent has been told/)).toBeTruthy();
    expect(await within(history).findByText(/Keeper reported something hurts \(knee\); training paused/)).toBeTruthy();
  });
});

describe('a pain report in a session (AC1)', () => {
  it('ends the session, pauses on the device at once, and sends the report to the app only', async () => {
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m));
    const server = fakeServer('keeper');
    const store = new MemoryPauseStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    click('Next');
    click('Something hurts');

    // The session has ended and the pause is on the device before anything is sent.
    expect(screen.queryByRole('region', { name: 'Session player' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Good call stopping' })).toBeTruthy();
    expect(store.value).toMatchObject({ sent: false, report: null });

    const form = screen.getByRole('form', { name: 'Pain report' });
    const areas = within(form).getAllByRole('radio').map((r) => (r as HTMLInputElement).value);
    expect(areas).toContain('knee');
    expect(areas.length).toBeLessThanOrEqual(12);
    fireEvent.click(within(form).getByRole('radio', { name: 'Knee' }));
    fireEvent.change(within(form).getByRole('textbox'), { target: { value: NOTE } });
    fireEvent.click(within(form).getByRole('button', { name: 'Tell my parent' }));
    expect(await screen.findByText(/Your parent has been told/)).toBeTruthy();

    const sent = server.calls.filter((c) => c.url === '/api/pain');
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0].body)).toMatchObject({ bodyArea: 'knee', note: NOTE, id: store.value!.reportId });
    // Once sent, the device keeps the pause but drops the report content.
    expect(store.value).toMatchObject({ sent: true, report: null });

    // The note went to /api/pain only: not to any other call, and never to the console.
    expect(server.calls.filter((c) => c.body.includes('zq7-marker')).map((c) => c.url)).toEqual(['/api/pain']);
    for (const spy of logs) {
      for (const args of spy.mock.calls) expect(JSON.stringify(args)).not.toMatch(/zq7-marker|knee/i);
    }

    click('Done for today');
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Start session|Do last version/ })).toBeNull();
    expect(screen.queryByRole('article', { name: 'Your training' })).toBeNull();
  });

  it('sends a report with no details as "not said" when the keeper just leaves', async () => {
    const server = fakeServer('keeper');
    const store = new MemoryPauseStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    click('Something hurts');
    click('Done for today');
    await waitFor(() => expect(server.state.reports).toHaveLength(1));
    expect(server.state.reports[0]).toMatchObject({ bodyArea: 'unsure', note: null });
  });
});

describe('the pause holds offline (AC2)', () => {
  it('keeps the pause in localStorage and shows it with the network off, then sends the report when back', async () => {
    const server = fakeServer('keeper');
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new LocalPauseStore()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));

    // The network drops mid-session.
    server.state.online = false;
    click('Something hurts');
    fireEvent.click(screen.getByRole('radio', { name: 'Ankle or foot' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: NOTE } });
    click('Tell my parent');
    expect(await screen.findByText(/Saved on this device/)).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem(PAUSE_KEY)!) as LocalPause;
    expect(saved).toMatchObject({ sent: false, report: { bodyArea: 'ankle_foot', note: NOTE } });

    click('Done for today');
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
    cleanup();

    // The app opens again with the network still off: the paused state shows from the device.
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new LocalPauseStore()} />);
    expect(await screen.findByRole('heading', { name: "Can't reach the app" })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
    expect(server.state.reports).toHaveLength(0);
    cleanup();

    // Back online: the outbox sends the report once, and the pause still holds.
    server.state.online = true;
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new LocalPauseStore()} />);
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    await waitFor(() => expect(server.state.reports).toHaveLength(1));
    expect(server.state.reports[0]).toMatchObject({ bodyArea: 'ankle_foot', note: NOTE, id: saved.reportId });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PAUSE_KEY)!)).toMatchObject({ sent: true, report: null }));
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });
});

describe('while paused (AC4)', () => {
  it('shows the pause and offers nothing to train, even if a session arrives', async () => {
    const server = fakeServer('keeper');
    // The device knows of a pause the server has not heard about yet, and the network is off for the report.
    const store = new MemoryPauseStore({ since: '2026-01-07', reportId: 'demo-report-0001', sent: false, report: null });
    server.fetchImpl = (async (input: RequestInfo | URL, req?: RequestInit) => {
      if (String(input) === '/api/pain') throw new TypeError('Failed to fetch');
      return fakeServer('keeper').fetchImpl(input, req);
    }) as typeof fetch;
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('heading', { name: 'Today' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Start session|Do last version|Rest today/ })).toBeNull();
    expect(store.value).not.toBeNull();
  });

  it('takes up a pause reported on another device', async () => {
    const server = fakeServer('keeper', { reports: [{ id: 'demo-report-0002', bodyArea: 'back', note: null, date: '2026-01-07' }] });
    const store = new MemoryPauseStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    expect(store.value).toMatchObject({ sent: true, reportId: 'demo-report-0002' });
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });
});

describe('the parent clears the pause from the inbox (AC3)', () => {
  it('shows the report as urgent and clears it; the keeper device then offers training again', async () => {
    const reports = [{ id: 'demo-report-0003', bodyArea: 'knee', note: NOTE, date: '2026-01-07' }];
    const server = fakeServer('parent', { reports });
    server.state.audit = [
      { id: 'e1', at: '2026-01-07T17:00:00Z', action: 'paused', actorRole: 'keeper', kind: 'pause', title: 'something hurts (knee)', reason: null },
    ];
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} />);
    const item = await screen.findByRole('article', { name: 'Training paused: something hurts' });
    const inbox = screen.getByRole('article', { name: /^Inbox/ });
    expect(inbox.contains(item)).toBe(true);
    expect(within(item).getByRole('heading', { name: 'Knee' })).toBeTruthy();
    expect(within(item).getByText(NOTE)).toBeTruthy();
    expect(await screen.findByText(/Keeper reported something hurts \(knee\); training paused/)).toBeTruthy();

    fireEvent.click(within(item).getByRole('button', { name: 'Clear the pause' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Training paused: something hurts' })).toBeNull());
    expect(server.calls.some((c) => c.url === '/api/pain/clear' && c.method === 'POST')).toBe(true);
    cleanup();

    // The keeper's device had the pause; the server no longer does, so it lifts.
    const keeper = fakeServer('keeper');
    const store = new MemoryPauseStore({ since: '2026-01-07', reportId: 'demo-report-0003', sent: true, report: null });
    render(<App fetchImpl={keeper.fetchImpl} wakeLock={wake} pauseStore={store} />);
    expect(await screen.findByRole('button', { name: 'Start session' })).toBeTruthy();
    expect(store.value).toBeNull();
  });

  it('gives the keeper no way to clear it', async () => {
    const server = fakeServer('keeper', { reports: [{ id: 'demo-report-0004', bodyArea: 'hip', note: null, date: '2026-01-07' }] });
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} />);
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
  });
});
