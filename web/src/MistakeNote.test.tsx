import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import css from './styles.css?raw';
import { App } from './App';
import { History } from './ApprovalScreens';
import { MISTAKE_LABEL, MISTAKE_NOTED, PainReportForm, PausedPanel } from './PainScreens';
import { cascaded, parseRules, px } from './cssCascade';
import { LocalPauseStore, MemoryPauseStore, PAUSE_KEY, type LocalPause } from './pain';
import type { AuditEntry } from './approvals';
import type { WakeLockController } from './wakeLock';
import { demoSession, todayWith } from './session.fixture';

// Story 104: after "Something hurts" the keeper can say it was tapped by mistake. It is a note
// for the parent: the pause holds until the parent checks and clears it with one tap, and
// nothing clears it on its own. The rules are tested on the server (server/test/pain.test.ts);
// this checks the screens, the device's outbox and what is sent. Invented demo data only.

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
  mistakeAt?: string | null;
}

/** A fake API for the demo pair that keeps the server's rules for the mistake note. */
function fakeServer(role: 'keeper' | 'parent', init: { reports?: Report[] } = {}) {
  const state = { online: true, reports: [...(init.reports ?? [])], audit: [] as AuditEntry[], refused: 0 };
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
        reports: state.reports.map((r) =>
          role === 'parent'
            ? { ...r, mistakeAt: r.mistakeAt ?? null }
            : r.mistakeAt
              ? { id: r.id, date: r.date, mistake: true }
              : { id: r.id, date: r.date },
        ),
      });
    }
    if (url === '/api/pain' && method === 'POST') {
      const b = JSON.parse(String(req?.body)) as Report;
      if (!state.reports.some((r) => r.id === b.id)) state.reports.push(b);
      return json({ paused: true, report: { id: b.id, date: b.date } });
    }
    if (url === '/api/pain/mistake' && method === 'POST') {
      const b = JSON.parse(String(req?.body)) as { id: string; reportId: string };
      const r = state.reports.find((x) => x.id === b.reportId);
      if (role !== 'keeper' || !r || state.reports.some((x) => x.mistakeAt)) {
        state.refused += 1;
        return json({ error: 'not_paused' }, 409);
      }
      r.mistakeAt = '2026-01-07T17:02:00Z';
      return json({ paused: true, report: { id: r.id, date: r.date, mistake: true } });
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
const mistakeCalls = (calls: { url: string; body: string }[]) => calls.filter((c) => c.url === '/api/pain/mistake');

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Tapped by mistake on the "Where does it hurt?" form (AC2)', () => {
  it('in the player: the chosen area goes to the parent with the note, and training stays paused', async () => {
    const server = fakeServer('keeper');
    const store = new MemoryPauseStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    click('Something hurts');
    // AC1: the pause is on the device at once, exactly as before.
    expect(store.value).toMatchObject({ sent: false, report: null });

    const form = screen.getByRole('form', { name: 'Pain report' });
    fireEvent.click(within(form).getByRole('radio', { name: 'Knee' }));
    fireEvent.click(within(form).getByRole('button', { name: MISTAKE_LABEL }));
    expect(screen.getByText(MISTAKE_NOTED)).toBeTruthy();
    // On the device at once, in the outbox, and the pause holds.
    expect(store.value?.mistake).toMatchObject({ sent: false });

    await waitFor(() => expect(store.value?.mistake).toMatchObject({ sent: true }));
    expect(server.state.reports).toEqual([expect.objectContaining({ bodyArea: 'knee', mistakeAt: expect.any(String) })]);
    // The note is two ids and nothing else: no text.
    const [call] = mistakeCalls(server.calls);
    expect(Object.keys(JSON.parse(call.body)).sort()).toEqual(['id', 'reportId']);
    expect(store.value).not.toBeNull();

    // It follows the form's first frame (story 105).
    fireEvent.click(await screen.findByRole('button', { name: 'Done for today' }));
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    expect(screen.getByText(MISTAKE_NOTED)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Start session|Do last version|Rest today/ })).toBeNull();
    expect(screen.queryByRole('button', { name: MISTAKE_LABEL })).toBeNull();
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
  });

  it('on the keeper home: the form closes and the paused panel says the parent checks first', async () => {
    const server = fakeServer('keeper');
    const store = new MemoryPauseStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Something hurts' }));
    // While the form is open it holds the one "Tapped by mistake".
    expect(screen.getAllByRole('button', { name: MISTAKE_LABEL })).toHaveLength(1);
    fireEvent.click(screen.getByRole('radio', { name: 'Knee' }));
    click(MISTAKE_LABEL);
    expect(screen.queryByRole('form', { name: 'Pain report' })).toBeNull();
    const panel = screen.getByRole('article', { name: 'Training is paused' });
    expect(within(panel).getByText(MISTAKE_NOTED)).toBeTruthy();
    await waitFor(() => expect(server.state.reports[0]?.mistakeAt).toBeTruthy());
    expect(server.state.reports[0].bodyArea).toBe('knee');
    expect(screen.queryByRole('button', { name: /Start session|Do last version/ })).toBeNull();
  });

  it('keeps the typed text out: only the area goes with the report', () => {
    const onMistake = vi.fn();
    render(<PainReportForm onSend={async () => true} onMistake={onMistake} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'invented text' } });
    click(MISTAKE_LABEL);
    expect(onMistake).toHaveBeenCalledWith(null);
    expect(screen.getByRole('status').textContent).toBe(MISTAKE_NOTED);
  });
});

describe('Tapped by mistake on the paused screen (AC2, AC4)', () => {
  it('never lifts the pause, offers nothing to train, and is accepted once', async () => {
    const server = fakeServer('keeper', { reports: [{ id: 'demo-report-0004', bodyArea: 'hip', note: null, date: '2026-01-07' }] });
    const store = new MemoryPauseStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    const panel = await screen.findByRole('article', { name: 'Training is paused' });
    fireEvent.click(await within(panel).findByRole('button', { name: MISTAKE_LABEL }));
    expect(within(panel).getByText(MISTAKE_NOTED)).toBeTruthy();
    expect(within(panel).queryByRole('button', { name: MISTAKE_LABEL })).toBeNull();
    await waitFor(() => expect(server.state.reports[0].mistakeAt).toBeTruthy());
    expect(mistakeCalls(server.calls)).toHaveLength(1);
    expect(JSON.parse(mistakeCalls(server.calls)[0].body).reportId).toBe('demo-report-0004');
    expect(store.value).toMatchObject({ reportId: 'demo-report-0004', mistake: { sent: true } });
    // Still paused: nothing to train, and no way for the keeper to clear it.
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('button', { name: /Start session|Do last version|Rest today/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
    expect(server.state.reports).toHaveLength(1);
  });

  it('shows the note made on another device', async () => {
    const server = fakeServer('keeper', {
      reports: [{ id: 'demo-report-0005', bodyArea: 'back', note: null, date: '2026-01-07', mistakeAt: '2026-01-07T17:02:00Z' }],
    });
    const store = new MemoryPauseStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    expect(await screen.findByText(MISTAKE_NOTED)).toBeTruthy();
    expect(screen.queryByRole('button', { name: MISTAKE_LABEL })).toBeNull();
    expect(mistakeCalls(server.calls)).toHaveLength(0);
  });

  it('settles a note the server refuses (a clear got there first) without sending it again', async () => {
    const server = fakeServer('keeper');
    // The device's pause for a report the parent already cleared; the device has not heard yet.
    const store = new MemoryPauseStore({
      since: '2026-01-07',
      reportId: 'demo-report-0006',
      sent: true,
      report: null,
      mistake: { id: 'demo-mistake-0006', sent: false },
    });
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    // The refusal settles the note, and the cleared pause lifts on the device.
    expect(await screen.findByRole('button', { name: 'Start session' })).toBeTruthy();
    expect(server.state.refused).toBe(1);
    expect(store.value).toBeNull();
  });
});

describe('the mistake note works offline (AC5)', () => {
  it('waits in the outbox on the device, the pause holds, and it is sent once when back online', async () => {
    const server = fakeServer('keeper', { reports: [{ id: 'demo-report-0007', bodyArea: 'knee', note: null, date: '2026-01-07' }] });
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new LocalPauseStore()} />);
    const panel = await screen.findByRole('article', { name: 'Training is paused' });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PAUSE_KEY)!)).toMatchObject({ sent: true }));

    server.state.online = false;
    fireEvent.click(within(panel).getByRole('button', { name: MISTAKE_LABEL }));
    expect(within(panel).getByText(MISTAKE_NOTED)).toBeTruthy();
    await act(async () => {});
    const saved = JSON.parse(localStorage.getItem(PAUSE_KEY)!) as LocalPause;
    expect(saved.mistake).toMatchObject({ sent: false });
    cleanup();

    // The app opens again offline: the pause and the note hold from the device.
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new LocalPauseStore()} />);
    expect(await screen.findByText(/You're offline/)).toBeTruthy();
    expect(await screen.findByText(MISTAKE_NOTED)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
    expect(server.state.reports[0].mistakeAt).toBeUndefined();
    cleanup();

    // Back online: the outbox sends the note once; the pause still holds.
    server.state.online = true;
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new LocalPauseStore()} />);
    expect(await screen.findByRole('heading', { name: 'Training is paused' })).toBeTruthy();
    await waitFor(() => expect(server.state.reports[0].mistakeAt).toBeTruthy());
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PAUSE_KEY)!).mistake).toMatchObject({ sent: true }));
    expect(mistakeCalls(server.calls)).toHaveLength(1);
    expect(JSON.parse(mistakeCalls(server.calls)[0].body)).toEqual({ id: saved.mistake!.id, reportId: 'demo-report-0007' });
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });

  it('sends an unsent report first, then the note', async () => {
    const server = fakeServer('keeper');
    const store = new MemoryPauseStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={store} />);
    const hurts = await screen.findByRole('button', { name: 'Something hurts' });
    server.state.online = false;
    fireEvent.click(hurts);
    fireEvent.click(screen.getByRole('radio', { name: 'Knee' }));
    click(MISTAKE_LABEL);
    await act(async () => {});
    expect(store.value).toMatchObject({ sent: false, report: { bodyArea: 'knee', note: '' }, mistake: { sent: false } });

    server.state.online = true;
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(store.value?.mistake).toMatchObject({ sent: true }));
    const order = server.calls.filter((c) => c.url.startsWith('/api/pain') && c.method === 'POST').map((c) => c.url);
    expect(order).toEqual(['/api/pain', '/api/pain/mistake']);
    expect(server.state.reports[0]).toMatchObject({ bodyArea: 'knee', note: null, mistakeAt: expect.any(String) });
  });
});

describe("the parent's inbox and History (AC3)", () => {
  it('shows the note, the time and the nudge; Clear the pause clears with one tap', async () => {
    const reports = [{ id: 'demo-report-0008', bodyArea: 'knee', note: null, date: '2026-01-07', mistakeAt: '2026-01-07T17:02:00Z' }];
    const server = fakeServer('parent', { reports });
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    const item = await screen.findByRole('article', { name: 'Training paused: something hurts' });
    expect(within(item).getByText('Marked as a mistake by the keeper')).toBeTruthy();
    const time = within(item).getByText((_, el) => el?.tagName === 'TIME');
    expect(time.getAttribute('dateTime')).toBe('2026-01-07T17:02:00Z');
    expect(time.textContent).toMatch(/^Jan 7, \d{1,2}:02 (AM|PM)$/);
    expect(within(item).getByText('Check in before clearing.')).toBeTruthy();
    // Neutral: no pronoun for either person.
    expect(item.textContent).not.toMatch(/\b(he|she|his|her|him|hers)\b/i);

    fireEvent.click(within(item).getByRole('button', { name: 'Clear the pause' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Training paused: something hurts' })).toBeNull());
    expect(server.calls.filter((c) => c.url === '/api/pain/clear')).toHaveLength(1);
  });

  it('shows no note on a report the keeper did not mark', async () => {
    const server = fakeServer('parent', { reports: [{ id: 'demo-report-0009', bodyArea: 'knee', note: null, date: '2026-01-07' }] });
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    const item = await screen.findByRole('article', { name: 'Training paused: something hurts' });
    expect(within(item).queryByText('Marked as a mistake by the keeper')).toBeNull();
    expect(within(item).queryByText('Check in before clearing.')).toBeNull();
  });

  it('History keeps the report and the note, with roles and the body area only', async () => {
    const audit: AuditEntry[] = [
      { id: 'e1', at: '2026-01-07T17:00:00Z', action: 'paused', actorRole: 'keeper', kind: 'pause', title: 'something hurts (knee)', reason: null },
      {
        id: 'e2',
        at: '2026-01-07T17:02:00Z',
        action: 'marked',
        actorRole: 'keeper',
        kind: 'pause',
        itemId: 'training-pause-mistake',
        title: 'something hurts (knee)',
        reason: null,
      },
      {
        id: 'e3',
        at: '2026-01-07T17:03:00Z',
        action: 'refused',
        actorRole: 'keeper',
        kind: 'pause',
        itemId: 'training-pause-mistake',
        title: 'a mistake note',
        reason: 'This pause already has a mistake note',
      },
      { id: 'e4', at: '2026-01-07T17:04:00Z', action: 'refused', actorRole: 'keeper', kind: 'pause', title: 'the training pause', reason: null },
      { id: 'e5', at: '2026-01-07T17:05:00Z', action: 'cleared', actorRole: 'parent', kind: 'pause', title: 'the training pause', reason: null },
    ];
    const fetchImpl = (async () => new Response(JSON.stringify({ events: audit }))) as unknown as typeof fetch;
    render(<History fetchImpl={fetchImpl} />);
    const list = await screen.findByRole('list');
    const lines = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent?.replace(/^Jan \d+\s*/, ''));
    expect(lines).toEqual([
      'Parent cleared the training pause',
      'Keeper tried to clear the training pause; refused',
      'Keeper tried to send a mistake note; refused',
      'Keeper marked something hurts (knee) as a mistake; still paused',
      'Keeper reported something hurts (knee); training paused',
    ]);
  });
});

describe('the new controls (AC1, AC6)', () => {
  const rules = parseRules(css);

  it('are at least 56 px tall, in the secondary look, at most 3 words', () => {
    render(
      <>
        <PainReportForm onSend={async () => true} onMistake={() => {}} />
        <PausedPanel onMistake={() => {}} />
      </>,
    );
    const buttons = screen.getAllByRole('button', { name: MISTAKE_LABEL });
    expect(buttons).toHaveLength(2);
    for (const b of buttons) {
      expect(b.classList.contains('secondary')).toBe(true);
      expect(b.classList.contains('session-control')).toBe(true);
      expect(px(cascaded(rules, b, 'min-height'))).toBeGreaterThanOrEqual(56);
      expect(b.textContent!.split(/\s+/).length).toBeLessThanOrEqual(3);
    }
  });

  it('never touches audio: no context made and none resumed', async () => {
    const made: { resumes: number }[] = [];
    function FakeAudioContext() {
      const fake = {
        state: 'suspended' as AudioContextState,
        sampleRate: 48000,
        currentTime: 0,
        destination: {},
        resumes: 0,
        resume() {
          fake.resumes += 1;
          return Promise.resolve();
        },
        createBuffer: (_c: number, length: number) => ({ length, getChannelData: () => new Float32Array(length) }),
        createBufferSource: () => ({ buffer: null, connect() {}, start() {} }),
      };
      made.push(fake);
      return fake;
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const server = fakeServer('keeper');
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    click('Something hurts');
    await act(async () => {});
    const count = made.length;
    const resumes = made.map((c) => c.resumes);
    const button = screen.getByRole('button', { name: MISTAKE_LABEL });
    button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    fireEvent.click(button);
    await act(async () => {});
    expect(made).toHaveLength(count);
    expect(made.map((c) => c.resumes)).toEqual(resumes);
  });
});
