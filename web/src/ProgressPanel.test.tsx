import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { STOP_UNDO_MS } from './player';
import type { ProgressSummary } from './progress';
import type { SessionResult } from './training';
import type { WakeLockController } from './wakeLock';
import { demoSession, todayWith } from './session.fixture';

// A fake API with invented progress for the demo pair. The rules themselves are tested on the
// server (server/test/progression.test.ts); this checks what each screen shows and sends.

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

function summary(over: Partial<ProgressSummary> = {}): ProgressSummary {
  return {
    date: '2026-01-07',
    xp: { total: 46, today: 0 },
    team: { current: 3, best: 3 },
    keeper: { current: 4, best: 4 },
    parent: { current: 3, best: 3 },
    today: null,
    runs: [],
    ...over,
  };
}

function fakeServer(role: 'keeper' | 'parent', progress: ProgressSummary) {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const posts: { url: string; body: unknown }[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === 'POST') posts.push({ url, body: JSON.parse(String(init.body)) });
    if (url === '/api/me') return json({ role });
    if (url.startsWith('/api/training/today')) return json(todayWith({ today: demoSession({ warmUp: [], coolDown: [] }) }));
    if (url.startsWith('/api/progress/summary')) return json(progress);
    if (url === '/api/progress/sessions') {
      return json({
        credit: { session: 10, stars: 1, form: 2, total: 12 },
        summary: summary({ xp: { total: 58, today: 12 }, team: { current: 4, best: 4 }, keeper: { current: 5, best: 5 }, parent: { current: 4, best: 4 } }),
      });
    }
    if (url === '/api/training/approved') return json({ items: [], waiting: 0 });
    if (url === '/api/audit') return json({ events: [] });
    if (url === '/api/approvals/pending') return json({ requests: [] });
    if (url === '/api/notifications/badge') return json({ unread: 0 });
    return json({ error: 'not found' }, 404);
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, posts };
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

afterEach(cleanup);

describe('home summary (AC1)', () => {
  it.each(['keeper', 'parent'] as const)('the %s sees team XP, the team streak and both personal streaks', async (role) => {
    render(<App fetchImpl={fakeServer(role, summary()).fetchImpl} wakeLock={wake} />);
    const panel = await screen.findByRole('article', { name: 'Together so far' });
    await vi.waitFor(() => expect(within(panel).getByText('46 XP')).toBeTruthy());
    expect(within(panel).getByText('Team streak').nextSibling?.textContent).toBe('3 training days');
    expect(within(panel).getByText("Keeper's streak").nextSibling?.textContent).toBe('4 training days');
    expect(within(panel).getByText("Parent's streak").nextSibling?.textContent).toBe('3 training days');
    expect(within(panel).getByText('Rest days and pauses never break a streak.')).toBeTruthy();
  });
});

describe('a missed day ends the run quietly (AC3)', () => {
  it('shows the ended run as a completed run, with no "lost" screen and no repair offer', async () => {
    const ended = summary({
      team: { current: 0, best: 6 },
      keeper: { current: 0, best: 6 },
      parent: { current: 0, best: 6 },
      runs: [{ start: '2026-01-05', end: '2026-01-19', days: 6 }],
    });
    render(<App fetchImpl={fakeServer('keeper', ended).fetchImpl} wakeLock={wake} />);
    const panel = await screen.findByRole('article', { name: 'Together so far' });
    await vi.waitFor(() => expect(within(panel).getByRole('heading', { name: 'Completed runs' })).toBeTruthy());
    expect(within(panel).getByText(/6 training days kept/)).toBeTruthy();
    expect(within(panel).getByText('A new run starts with your next session.')).toBeTruthy();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\b(lost|lose|broke|broken|repair|restore|freeze|buy|miss(ed)?)\b/i);
    // Nothing to tap that would repair or restore the run.
    for (const b of screen.queryAllByRole('button')) expect(b.textContent).not.toMatch(/repair|restore|save/i);
  });
});

describe('finish screen (AC1, AC2)', () => {
  it('sends the finished session and shows its XP and the streaks', async () => {
    const results: SessionResult[] = [];
    const server = fakeServer('keeper', summary());
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} onSessionFinish={(r) => results.push(r)} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    click('Start set 1');
    click('End set');
    click('Keep breathing');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    click('Stop');

    expect(screen.getByRole('heading', { name: 'Good call' })).toBeTruthy();
    expect(screen.getByText(/today counts as kept, the same as finishing/)).toBeTruthy();
    // Nothing is sent while Resume is still offered; the session is over once the window closes.
    expect(results).toEqual([]);
    act(() => vi.advanceTimersByTime(STOP_UNDO_MS));
    vi.useRealTimers();
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull();
    const earned = await screen.findByRole('region', { name: 'Earned today' });
    expect(within(earned).getByText('+12 XP')).toBeTruthy();
    expect(within(earned).getByText('Team streak').nextSibling?.textContent).toBe('4 training days');
    expect(results.map((r) => r.outcome)).toEqual(['stopped']);
    // Start tells the server the session began (story #80); the finish sends the result once.
    // The history record follows the finish (story 113).
    expect(server.posts.map((p) => p.url)).toEqual(['/api/training/started', '/api/progress/sessions', '/api/history/sessions']);
    const sent = server.posts[1];
    expect(sent).toMatchObject({
      url: '/api/progress/sessions',
      body: { itemId: 'session-starter', outcome: 'stopped', warmUpLogged: true, praised: ['Keep breathing'] },
    });
    // No sets, reps or minutes are sent for credit.
    expect(Object.keys(sent.body as object)).not.toContain('setsDone');
  });
});
