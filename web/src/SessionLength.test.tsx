// Story 120: every place a session is offered shows its length from the server's one estimate,
// and the player shows minutes left as steps finish. Demo cast and invented days only.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { SessionPlayer } from './SessionPlayer';
import { minutesLeftText, secondsLeft, stepsOf } from './player';
import { aboutMinutes } from './training';
import { nextText } from './week';
import { MemoryPauseStore } from './pain';
import { BRIDGE, PLANK, demoSession, demoWeek, keeperServer, todayWith } from './session.fixture';
import type { PendingRequest } from './approvals';
import type { WakeLockController } from './wakeLock';

const wake: WakeLockController = {
  status: 'active',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(cleanup);

/** The minutes the server's one estimate gives each theme of the repo's pack. */
const MINUTES: Record<string, number> = { 'Strong middle': 12, 'Spring legs': 15, 'Quick feet, strong arms': 12 };

/** A parent's fake API where every place is filled from MINUTES, as the server fills it. */
function parentServer() {
  const at = '2026-01-05T09:00:00Z';
  const request: PendingRequest = {
    id: 'r1',
    kind: 'plan',
    itemId: 'session-spring-legs',
    itemVersion: 'sha256:spring1',
    title: 'Session: Spring legs',
    detail: `About ${MINUTES['Spring legs']} minutes. Warm-up: 6 moves, 5 min. Cool-down: 1 move, 1 min.`,
    state: 'pending',
    createdAt: at,
    expiresAt: '2026-01-12T09:00:00Z',
  };
  const titles = ['Strong middle', 'Spring legs', 'Quick feet, strong arms'];
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/me') return json({ role: 'parent' });
    if (url === '/api/approvals/pending') return json({ requests: [request] });
    if (url === '/api/notifications/badge') return json({ unread: 1 });
    if (url === '/api/audit') return json({ events: [] });
    if (url === '/api/history/sessions') return json({ sessions: [] });
    if (url === '/api/pain/status') return json({ paused: false, since: null, reports: [] });
    if (url.startsWith('/api/training/days')) {
      const days = [1, 3, 5];
      const names = ['Mon', 'Wed', 'Fri'];
      return json({ days, themes: days.map((day, i) => ({ day, name: names[i], title: titles[i], minutes: MINUTES[titles[i]] })) });
    }
    // Monday: the next session is Wednesday's Spring legs.
    if (url.startsWith('/api/progress/week')) return json(demoWeek('2026-01-05'));
    if (url.startsWith('/api/progress/summary')) {
      const streak = { current: 0, best: 0 };
      return json({ date: '2026-01-05', xp: { total: 0, today: 0 }, team: streak, keeper: streak, parent: streak, today: null, runs: [] });
    }
    return json({ error: 'not found' }, 404);
  }) as unknown as typeof fetch;
}

describe('AC2: the same minutes wherever a session is offered', () => {
  it("the parent's training days, inbox request and week line show the server's minutes", async () => {
    render(<App fetchImpl={parentServer()} wakeLock={wake} />);
    const days = (await screen.findByRole('heading', { name: 'Training days' })).closest('article')!;
    const themes = await within(days).findAllByRole('listitem');
    expect(themes.map((li) => li.textContent)).toEqual([
      'Mon: Strong middleAbout 12 minutes',
      'Wed: Spring legsAbout 15 minutes',
      'Fri: Quick feet, strong armsAbout 12 minutes',
    ]);
    // The inbox request leads with the same number as the training days give Spring legs.
    const request = await screen.findByRole('listitem', { name: 'Session: Spring legs' });
    expect(within(request).getByText(/^About 15 minutes\./)).toBeTruthy();
    // The week's next line: Wednesday's Spring legs, the same 15.
    expect(await screen.findByText('Next session: Wed, Spring legs. About 15 minutes.')).toBeTruthy();
    const shown = [
      within(days).getByText('Wed: Spring legs').nextElementSibling!.textContent,
      /^About \d+ minutes/.exec(within(request).getByText(/^About/).textContent!)![0],
      /About \d+ minutes/.exec(document.querySelector('.week-next')!.textContent!)![0],
    ];
    expect(new Set(shown)).toEqual(new Set([aboutMinutes(15)]));
  });

  it("the keeper's Today, the player's first step and the week line agree", async () => {
    const session = demoSession({ minutes: 12 });
    // A session whose cards add up to 12 minutes, as the server's estimate would.
    const twelve = demoSession({
      ...session,
      cards: [{ ...PLANK, seconds: 85 }, { ...BRIDGE, seconds: 141 + 329 }],
    });
    expect(secondsLeft(stepsOf(twelve), 0)).toBe(720);
    const server = keeperServer(todayWith({ today: twelve }));
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} now={() => new Date(2026, 0, 5, 17, 0)} />);
    expect(await screen.findByText('About 12 minutes')).toBeTruthy();
    click('Start session');
    expect(document.querySelector('.player-left')!.textContent).toBe('About 12 min left');
  });

  it('words a number of minutes plainly', () => {
    expect(aboutMinutes(12)).toBe('About 12 minutes');
    expect(aboutMinutes(1)).toBe('About 1 minute');
    expect(nextText({ date: '2026-01-07', day: 'Wed', title: 'Spring legs', minutes: 15 })).toBe(
      'Next session: Wed, Spring legs. About 15 minutes.',
    );
    // An older server sends no minutes: the line stays as it was.
    expect(nextText({ date: '2026-01-07', day: 'Wed', title: 'Spring legs' })).toBe('Next session: Wed, Spring legs.');
  });
});

describe('AC3 and AC4: minutes left in the player', () => {
  // The fixture: warm-up 105 s, plank 85 s, bridge 141 s, cool-down 60 s = 391 s.
  const left = () => document.querySelector('.player-left')?.textContent;
  const step = () => document.querySelector('.player-progress .kind')!.textContent;

  it('counts down as each step finishes, in whole minutes beside the step count', () => {
    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onExit={() => {}} />);
    expect(step()).toBe('Step 1 of 4');
    // 391 s: the session's own "About 7 minutes".
    expect(left()).toBe('About 7 min left');
    click('Next');
    // Inside a step nothing changes; it updates when the step finishes.
    expect(left()).toBe('About 7 min left');
    click('Next');
    expect(step()).toBe('Step 2 of 4');
    expect(left()).toBe('About 5 min left'); // 286 s
    click('Start set 1');
    click('End set');
    click('Skip');
    click('Skip rest');
    click('End set');
    click('Skip');
    expect(step()).toBe('Step 3 of 4');
    expect(left()).toBe('About 3 min left'); // 201 s
    click('Start set 1');
    click('Set done');
    click('Skip');
    click('Skip rest');
    click('Set done');
    click('Skip');
    expect(step()).toBe('Step 4 of 4');
    expect(left()).toBe('About 1 min left'); // the 60 s cool-down
  });

  it('never says 0 min: under 30 s reads "Under a minute left"', () => {
    expect(minutesLeftText(0)).toBe('Under a minute left');
    expect(minutesLeftText(29)).toBe('Under a minute left');
    expect(minutesLeftText(30)).toBe('About 1 min left');
    expect(minutesLeftText(540)).toBe('About 9 min left');
    for (let s = 0; s <= 1200; s += 1) expect(minutesLeftText(s)).not.toMatch(/\b0 min/);
    render(
      <SessionPlayer
        session={demoSession({ warmUp: [], cards: [], coolDown: [{ name: 'Easy walk', seconds: 20, cue: 'Breathe out slowly' }] })}
        layout="medium"
        wakeLock={wake}
        onExit={() => {}}
      />,
    );
    expect(left()).toBe('Under a minute left');
  });

  it('keeps the safety controls where they were: the line sits in the left column, not beside them', () => {
    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onExit={() => {}} />);
    const line = document.querySelector('.player-left')!;
    expect(line.closest('.player-step')).not.toBeNull();
    expect(line.closest('.player-bar-actions')).toBeNull();
    const actions = document.querySelector('.player-bar-actions')!;
    expect([...actions.querySelectorAll('.safety-control')].map((b) => b.textContent)).toEqual(['Something hurts', 'Stop']);
  });

  it('a copy saved before the server sent card seconds shows the steps only', () => {
    const { seconds: _p, ...plank } = PLANK;
    render(<SessionPlayer session={demoSession({ cards: [plank] })} layout="medium" wakeLock={wake} onExit={() => {}} />);
    expect(step()).toBe('Step 1 of 3');
    expect(left()).toBeUndefined();
  });
});
