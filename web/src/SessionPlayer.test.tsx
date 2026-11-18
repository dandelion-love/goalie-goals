import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import css from './styles.css?raw';
import { App } from './App';
import { SessionPlayer, WAKE_FALLBACK_TEXT } from './SessionPlayer';
import { KEEP_AWAKE_TAP_MS } from './Countdown';
import { fetchToday, type SessionResult } from './training';
import type { WakeLockController, WakeStatus } from './wakeLock';
import { PLANK, demoSession, keeperServer, todayWith } from './session.fixture';

/** A wake lock that answers `result`, counting acquires and releases. */
function fakeWake(result: WakeStatus) {
  let status: WakeStatus = 'off';
  const listeners = new Set<(s: WakeStatus) => void>();
  const set = (s: WakeStatus) => {
    status = s;
    listeners.forEach((l) => l(s));
  };
  const lock = {
    acquired: 0,
    released: 0,
    get status() {
      return status;
    },
    async acquire() {
      lock.acquired += 1;
      set(result);
      return status;
    },
    async release() {
      lock.released += 1;
      set('off');
    },
    subscribe(l: (s: WakeStatus) => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  return lock satisfies WakeLockController;
}

/** iPad sizes in CSS px: an 11-inch iPad in portrait and landscape. */
const SIZES = [
  { name: 'iPad portrait', width: 834, height: 1194, layout: 'medium', panes: 'player-stack' },
  { name: 'iPad landscape', width: 1194, height: 834, layout: 'expanded', panes: 'player-panes' },
] as const;

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setViewport(1024, 768);
});

describe.each(SIZES)('session player on $name', ({ width, height, layout, panes }) => {
  it('shows the path, then plays warm-up, each card with feedback, cool-down and the finish screen', async () => {
    setViewport(width, height);
    const wake = fakeWake('active');
    const results: SessionResult[] = [];
    const server = keeperServer(todayWith());
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} onSessionFinish={(r) => results.push(r)} />);

    // The lesson path: today's approved session at the top, as a path of steps.
    const path = await screen.findByRole('list', { name: 'Steps in Strong middle' });
    expect(within(path).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Warm-up, 2 min',
      'Front plank · 2 sets of 20 s hold, rest 45 s',
      'Glute bridge · 2 sets of 12 reps, rest 45 s',
      'Cool-down, 1 min',
      'Finish',
    ]);
    expect(screen.getByText('About 10 minutes')).toBeTruthy();
    expect(server.urls.some((u) => /^\/api\/training\/today\?date=\d{4}-\d{2}-\d{2}$/.test(u))).toBe(true);
    click('Start session');

    const player = screen.getByRole('region', { name: 'Session player' });
    expect(player.getAttribute('data-layout')).toBe(layout);
    expect(player.querySelector(`.${panes}`)).not.toBeNull();
    await vi.waitFor(() => expect(wake.acquired).toBe(1));
    expect(screen.queryByText(WAKE_FALLBACK_TEXT)).toBeNull();

    // Warm-up.
    expect(screen.getByRole('heading', { name: 'March on the spot' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^March on the spot, 1:00 left/ })).toBeTruthy();
    click('Next');
    click('Next');

    // Front plank: figure with its credit line, steps, cues and common mistakes.
    expect(screen.getByRole('heading', { name: 'Front plank', level: 1 })).toBeTruthy();
    const img = screen.getByRole('img', { name: 'Front plank: how the move looks' });
    expect(img.getAttribute('src')).toBe(PLANK.figureUrl);
    expect(screen.getByText(PLANK.credit)).toBeTruthy();
    expect(screen.getByText(PLANK.steps[0])).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cues' })).toBeTruthy();
    expect(screen.getByText(/Hips sagging toward the floor/)).toBeTruthy();
    click('Start set 1');
    expect(screen.getByRole('button', { name: /^Hold, set 1 of 2, 20 left/ })).toBeTruthy();
    click('End set');

    // Immediate feedback names the cue, never the person.
    expect(screen.getByRole('heading', { name: 'How did set 1 look?' })).toBeTruthy();
    click('Straight like a board');
    expect(screen.getByRole('status').textContent).toBe('Straight like a board: nice');
    expect(screen.getByRole('button', { name: /^Rest, 45 left/ })).toBeTruthy();
    click('Skip rest');
    click('End set');
    click('Skip');

    // Glute bridge: a rep counter up to the set's target.
    expect(screen.getByRole('heading', { name: 'Glute bridge', level: 1 })).toBeTruthy();
    click('Start set 1');
    for (let i = 0; i < 14; i += 1) click('+1');
    expect(screen.getByText('12 / 12')).toBeTruthy();
    expect((screen.getByRole('button', { name: '+1' }) as HTMLButtonElement).disabled).toBe(true);
    click('Set done');
    click('Push through the heels');
    click('Skip rest');
    click('Set done');
    click('Skip');

    // Cool-down, then the finish screen.
    expect(screen.getByRole('heading', { name: 'Easy walk and slow breaths' })).toBeTruthy();
    click('Next');
    expect(screen.getByRole('heading', { name: 'Session done' })).toBeTruthy();
    expect(screen.getByText('Straight like a board')).toBeTruthy();
    expect(screen.queryByText(/one more/i)).toBeNull();
    await vi.waitFor(() => expect(wake.released).toBe(1));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      itemId: 'session-starter',
      itemVersion: 'sha256:session2',
      outcome: 'done',
      praised: ['Straight like a board', 'Push through the heels'],
      setsDone: 4,
    });

    click('Done for today');
    expect(await screen.findByText("Today's session is done. See you next time.")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });

  it('keeps every in-session control at 56 px or more', async () => {
    setViewport(width, height);
    render(<SessionPlayer session={demoSession()} layout={layout} wakeLock={fakeWake('active')} onExit={() => {}} />);
    const check = () => {
      for (const b of screen.getAllByRole('button')) expect(b.classList.contains('session-control')).toBe(true);
    };
    check();
    click('Next');
    click('Next');
    check();
    click('Start set 1');
    check();
    click('End set');
    check();
  });
});

describe('touch targets in the stylesheet', () => {
  it('sets 44 px for every button and 56 px for in-session controls', () => {
    expect(css).toMatch(/\nbutton \{[^}]*min-height: 44px;[^}]*min-width: 44px;/);
    expect(css).toMatch(/\.session-control \{[^}]*min-height: 56px;[^}]*min-width: 56px;/);
  });
});

describe('stopping', () => {
  it('"Something hurts" ends the session at once with a calm screen and a hook result', async () => {
    const results: SessionResult[] = [];
    const wake = fakeWake('active');
    render(
      <SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onFinish={(r) => results.push(r)} onExit={() => {}} />,
    );
    click('Something hurts');
    expect(screen.getByRole('heading', { name: 'Good call stopping' })).toBeTruthy();
    expect(screen.getByText(/Tell an adult now/)).toBeTruthy();
    expect(results.map((r) => r.outcome)).toEqual(['hurt']);
    await vi.waitFor(() => expect(wake.released).toBe(1));
  });

  it('Stop ends with a positive screen', () => {
    render(<SessionPlayer session={demoSession()} layout="expanded" wakeLock={fakeWake('active')} onExit={() => {}} />);
    click('Stop');
    expect(screen.getByRole('heading', { name: 'Good call' })).toBeTruthy();
  });
});

describe('wake lock in the player (AC2)', () => {
  it('without a wake lock, shows the notice and pauses a timer until tapped once a minute', async () => {
    vi.useFakeTimers();
    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={fakeWake('fallback')} onExit={() => {}} />);
    await act(async () => {});
    expect(screen.getByText(WAKE_FALLBACK_TEXT)).toBeTruthy();

    act(() => vi.advanceTimersByTime(KEEP_AWAKE_TAP_MS - 1_000));
    expect(screen.getByRole('button', { name: /^March on the spot, 11 left$/ })).toBeTruthy();
    act(() => vi.advanceTimersByTime(2_000));
    const waiting = screen.getByRole('button', { name: /^March on the spot, 1[01] left, tap to keep going$/ });
    expect(within(waiting).getByText('Tap to keep going')).toBeTruthy();
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByRole('heading', { name: 'March on the spot' })).toBeTruthy();

    fireEvent.click(waiting);
    act(() => vi.advanceTimersByTime(12_000));
    expect(screen.getByRole('heading', { name: 'Arm circles' })).toBeTruthy();
  });

  it('with a wake lock, runs the timers without asking for taps', async () => {
    vi.useFakeTimers();
    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={fakeWake('active')} onExit={() => {}} />);
    await act(async () => {});
    expect(screen.queryByText(WAKE_FALLBACK_TEXT)).toBeNull();
    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.getByRole('heading', { name: 'Arm circles' })).toBeTruthy();
    expect(screen.queryByText('Tap to keep going')).toBeNull();
  });

  it('times a hold and a rest, then moves on by itself', async () => {
    vi.useFakeTimers();
    render(
      <SessionPlayer
        session={demoSession({ warmUp: [], coolDown: [] })}
        layout="expanded"
        wakeLock={fakeWake('active')}
        onExit={() => {}}
      />,
    );
    click('Start set 1');
    act(() => vi.advanceTimersByTime(21_000));
    expect(screen.getByRole('heading', { name: 'How did set 1 look?' })).toBeTruthy();
    click('Keep breathing');
    act(() => vi.advanceTimersByTime(46_000));
    expect(screen.getByRole('button', { name: /^Hold, set 2 of 2/ })).toBeTruthy();
  });
});

describe('AC3: no approved session for today', () => {
  const lastApproved = demoSession({ itemVersion: 'sha256:session1', cards: [PLANK], minutes: 8 });

  it('offers the last approved version or rest, never the waiting one', async () => {
    const server = keeperServer(todayWith({ today: null, lastApproved, waiting: 2 }));
    render(<App fetchImpl={server.fetchImpl} wakeLock={fakeWake('active')} />);
    expect(await screen.findByText(/Today's session is waiting for your parent\. You can do the last approved version, or rest\./)).toBeTruthy();
    expect(screen.getByText('Last approved version')).toBeTruthy();
    expect(screen.queryByText('Glute bridge')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Rest today' })).toBeTruthy();

    click('Do the last approved version');
    expect(screen.getByText('Step 1 of 3')).toBeTruthy();
    click('Next');
    click('Next');
    expect(screen.getByRole('heading', { name: 'Front plank', level: 1 })).toBeTruthy();
  });

  it('offers rest only when nothing approved exists', async () => {
    const server = keeperServer(todayWith({ today: null, lastApproved: null, waiting: 1 }));
    render(<App fetchImpl={server.fetchImpl} wakeLock={fakeWake('active')} />);
    expect(await screen.findByText(/Rest today: recovery counts too\./)).toBeTruthy();
    expect(screen.queryByRole('list', { name: /^Steps in/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Start session|Do the last approved version/ })).toBeNull();
    click('Rest today');
    expect(screen.getByText('Rest day chosen. Recovery is part of training.')).toBeTruthy();
  });

  it('shows a planned rest day', async () => {
    const server = keeperServer(todayWith({ planned: false, today: null }));
    render(<App fetchImpl={server.fetchImpl} wakeLock={fakeWake('active')} />);
    expect(await screen.findByText('Rest day. Recovery is part of training.')).toBeTruthy();
  });

  it('shows no session when today cannot be loaded', async () => {
    render(<App fetchImpl={keeperServer(() => ({}) as never).fetchImpl} wakeLock={fakeWake('active')} />);
    expect(await screen.findByText(/Couldn't load today's session/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Start session/ })).toBeNull();
  });

  it('ignores a fallback sent alongside an approved session', async () => {
    const { fetchImpl } = keeperServer(todayWith({ lastApproved }));
    const today = await fetchToday(fetchImpl);
    expect(today.today?.itemVersion).toBe('sha256:session2');
    expect(today.lastApproved).toBeNull();
  });
});
