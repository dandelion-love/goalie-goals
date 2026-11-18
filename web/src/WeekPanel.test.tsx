// Story 114: show the keeper and the parent what comes next. This week's strip on both homes,
// the next planned session after Done for today, and each card's next step in Your training.
// Demo cast and invented days only.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { ApprovedTraining } from './ApprovalScreens';
import { MemoryPauseStore } from './pain';
import { PLANK, demoSession, demoWeek, keeperServer, todayWith } from './session.fixture';
import { STATE_LABEL, countText, nextText, type WeekView } from './week';
import { SAFE_STOP_NOTE, WeekPanel } from './WeekPanel';
import type { ApprovedItem } from './approvals';
import type { WakeLockController } from './wakeLock';

const wake: WakeLockController = {
  status: 'off',
  acquire: async () => 'off',
  release: async () => {},
  subscribe: () => () => {},
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const serve = (routes: Record<string, unknown>) =>
  (async (input: RequestInfo | URL) => {
    const route = String(input).split('?')[0];
    return route in routes ? json(routes[route]) : json({ error: 'not found' }, 404);
  }) as unknown as typeof fetch;

/** A week with every state in it, today the Friday. */
const EVERY_STATE: WeekView = {
  date: '2026-01-09',
  days: [
    { date: '2026-01-05', day: 'Mon', state: 'trained', isToday: false, title: 'Strong middle' },
    { date: '2026-01-06', day: 'Tue', state: 'rest', isToday: false, title: null },
    { date: '2026-01-07', day: 'Wed', state: 'stopped', isToday: false, title: 'Spring legs' },
    { date: '2026-01-08', day: 'Thu', state: 'paused', isToday: false, title: null },
    { date: '2026-01-09', day: 'Fri', state: 'today', isToday: true, title: 'Quick feet, strong arms' },
    { date: '2026-01-10', day: 'Sat', state: 'rest', isToday: false, title: null },
    { date: '2026-01-11', day: 'Sun', state: 'planned', isToday: false, title: 'Strong middle' },
  ],
  kept: 2,
  planned: 4,
  next: { date: '2026-01-11', day: 'Sun', title: 'Strong middle' },
};

const strip = () => screen.getByRole('list', { name: 'Days this week' });
const dayTexts = () => within(strip()).getAllByRole('listitem').map((li) => li.textContent);

afterEach(cleanup);

describe('AC1 and AC5: this week as a strip of seven days', () => {
  it('marks each day trained, rest, paused, planned or today, a safety stop as kept', async () => {
    render(<WeekPanel fetchImpl={serve({ '/api/progress/week': EVERY_STATE })} />);
    await screen.findByRole('list', { name: 'Days this week' });
    expect(dayTexts()).toEqual(['MonTrained', 'TueRest', 'WedSafe stop', 'ThuPaused', 'FriToday', 'SatRest', 'SunPlanned']);
    expect(screen.getByText(SAFE_STOP_NOTE)).toBeTruthy();
    // Today is marked for screen readers as well as by its look.
    const today = within(strip()).getAllByRole('listitem').find((li) => li.getAttribute('aria-current') === 'date');
    expect(today?.textContent).toBe('FriToday');
  });

  it('never says missed: a past planned day with nothing logged reads plainly', async () => {
    const week = demoWeek('2026-01-09', 'today', 'open');
    render(<WeekPanel fetchImpl={serve({ '/api/progress/week': week })} />);
    await screen.findByRole('list', { name: 'Days this week' });
    expect(dayTexts()).toEqual(['MonNo session', 'TueRest', 'WedNo session', 'ThuRest', 'FriToday', 'SatRest', 'SunRest']);
    expect(document.body.textContent).not.toMatch(/miss|broke|lost|fail/i);
    for (const label of Object.values(STATE_LABEL)) expect(label).not.toMatch(/miss/i);
  });

  it('counts the sessions kept against the plan\'s own count', async () => {
    render(<WeekPanel fetchImpl={serve({ '/api/progress/week': EVERY_STATE })} />);
    expect(await screen.findByText('2 of 4 sessions')).toBeTruthy();
    expect(countText({ kept: 0, planned: 3 })).toBe('0 of 3 sessions');
    expect(countText({ kept: 1, planned: 1 })).toBe('1 of 1 session');
  });

  it('says what comes next, and keeps its line when nothing does', async () => {
    render(<WeekPanel fetchImpl={serve({ '/api/progress/week': EVERY_STATE })} />);
    expect(await screen.findByText('Next session: Sun, Strong middle.')).toBeTruthy();
    cleanup();
    render(<WeekPanel fetchImpl={serve({ '/api/progress/week': { ...EVERY_STATE, next: null } })} />);
    await screen.findByRole('list', { name: 'Days this week' });
    expect(document.querySelector('.week-next')?.textContent).toBe('');
  });

  it('a failed load says so plainly and still settles', async () => {
    let settled = false;
    render(<WeekPanel fetchImpl={serve({})} onSettled={() => (settled = true)} />);
    expect(await screen.findByText('The week will show here after the next session.')).toBeTruthy();
    await waitFor(() => expect(settled).toBe(true));
  });

  it("shows on the parent's home, from the week the server sends", async () => {
    const streak = { current: 1, best: 1 };
    const fetchImpl = serve({
      '/api/me': { role: 'parent' },
      '/api/progress/summary': { date: '2026-01-09', xp: { total: 10, today: 0 }, team: streak, keeper: streak, parent: streak, today: null, runs: [] },
      '/api/progress/week': EVERY_STATE,
      '/api/history/sessions': { sessions: [] },
      '/api/approvals/pending': { requests: [] },
      '/api/audit': { events: [] },
      '/api/pain/status': { paused: false, since: null, reports: [] },
    });
    render(<App fetchImpl={fetchImpl} wakeLock={wake} />);
    expect(await screen.findByRole('heading', { name: 'This week' })).toBeTruthy();
    expect(await screen.findByText('2 of 4 sessions')).toBeTruthy();
    expect(screen.getByText(nextText(EVERY_STATE.next!))).toBeTruthy();
  });
});

describe('AC2 and AC5: the next planned session after a session', () => {
  const JAN_5 = () => new Date(2026, 0, 5, 17, 0);

  it('on the home after a session: Done for today names the next day and session', async () => {
    const server = keeperServer(todayWith(), () => 'together');
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} now={JAN_5} />);
    const done = (await screen.findByText('Done for today')).closest('.done-today') as HTMLElement;
    expect(await within(done).findByText('Next session: Wed, Spring legs. About 15 minutes.')).toBeTruthy();
    expect(server.urls).toContain('/api/progress/week?date=2026-01-05');
    // The strip shows today trained.
    expect(dayTexts()[0]).toBe('MonTrained');
  });

  it('after Done for today on the finish screen, the home says what comes next', async () => {
    const server = keeperServer(todayWith({ today: demoSession({ warmUp: [], coolDown: [], cards: [PLANK] }) }));
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} now={JAN_5} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start set 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'End set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }));
    fireEvent.click(screen.getByRole('button', { name: 'End set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Done for today' }));
    const done = (await screen.findByText('Done for today')).closest('.done-today') as HTMLElement;
    expect(await within(done).findByText('Next session: Wed, Spring legs. About 15 minutes.')).toBeTruthy();
  });
});

describe("AC3 and AC5: each card's next step in Your training", () => {
  const item = (kind: ApprovedItem['kind'], itemId: string, title: string): ApprovedItem => ({
    kind,
    itemId,
    itemVersion: `sha256:${itemId}`,
    title,
    detail: 'Approved.',
    approvedAt: '2026-01-05T09:00:00Z',
  });

  it('names the next rung as a goal, with what opens it, or the top of the ladder', async () => {
    const items = [
      item('plan', 'session-strong-middle', 'Session: Strong middle'),
      item('exercise', 'card-squat-to-box', 'Squat to box'),
      item('exercise', 'card-broad-jump-stick', 'Broad jump with stick landing'),
      item('exercise', 'card-line-hops', 'Line hops'),
      item('exercise', 'card-not-on-a-ladder', 'Something else'),
    ];
    render(<ApprovedTraining fetchImpl={serve({ '/api/training/approved': { items, waiting: 0 } })} />);
    await screen.findByRole('heading', { name: 'Squat to box' });
    const card = (title: string) => screen.getByRole('heading', { name: title }).closest('li') as HTMLElement;
    const next = (title: string) => card(title).querySelector('.next-step')?.textContent ?? null;

    expect(next('Squat to box')).toBe(
      'Next step: Paused box squat. Goal: 2 sets of 15, all clean, two sessions in a row. Then your parent decides.',
    );
    expect(next('Broad jump with stick landing')).toBe(
      'Next step: Squat jump and stick. Goal: 3 sets of 5, all clean, two sessions in a row. Free squat comes first too. Then your parent decides.',
    );
    expect(next('Line hops')).toBe('Next step: Top of this ladder for now.');
    // A session, and a card on no ladder, have no next step.
    expect(next('Session: Strong middle')).toBeNull();
    expect(next('Something else')).toBeNull();
    // A goal, never a promise.
    expect(document.body.textContent).not.toMatch(/you will|unlocks? (?:at|after)|guaranteed/i);
  });
});
