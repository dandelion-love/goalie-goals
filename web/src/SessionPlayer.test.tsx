import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import css from './styles.css?raw';
import { App } from './App';
import { RESUME_TEXT, SessionPlayer, WAKE_FALLBACK_TEXT } from './SessionPlayer';
import { STOP_UNDO_MS } from './player';
import { cascaded, parseRules, px } from './cssCascade';
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

/** The quality rubric's iPad sizes in CSS px (its audit rig): portrait and landscape. */
const SIZES = [
  { name: 'iPad portrait', width: 820, height: 1180, layout: 'medium', panes: 'player-stack' },
  { name: 'iPad landscape', width: 1180, height: 820, layout: 'expanded', panes: 'player-panes' },
] as const;

const rules = parseRules(css);
/** The declared minimum height and width of a control, from the stylesheet's cascade. */
const minSize = (el: Element) => ({
  h: px(cascaded(rules, el, 'min-height')),
  w: px(cascaded(rules, el, 'min-width')),
});

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
    expect(screen.getByRole('button', { name: '1:00 left', description: 'March on the spot' })).toBeTruthy();
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
    expect(screen.getByRole('button', { name: '20 left', description: 'Hold, set 1 of 2' })).toBeTruthy();
    click('End set');

    // Immediate feedback names the cue, never the person.
    expect(screen.getByRole('heading', { name: 'How did set 1 look?' })).toBeTruthy();
    click('Stay board-straight');
    expect(screen.getByRole('status').textContent).toBe('Stay board-straight: nice');
    expect(screen.getByRole('button', { name: '45 left', description: 'Rest' })).toBeTruthy();
    click('Skip rest');
    click('End set');
    click('Skip');

    // Glute bridge: a rep counter up to the set's target.
    expect(screen.getByRole('heading', { name: 'Glute bridge', level: 1 })).toBeTruthy();
    click('Start set 1');
    expect(screen.getByText('reps left').closest('.counter')!.textContent).toBe('Set 1 of 2, 12 reps left');
    click('+1');
    expect(screen.getByText('reps left').closest('.counter')!.querySelector('.counter-value')!.textContent).toBe('11');
    for (let i = 0; i < 13; i += 1) click('+1');
    // The counter shows reps left, down to 0.
    const counter = screen.getByText('reps left').closest('.counter')!;
    expect(counter.querySelector('.counter-value')!.textContent).toBe('0');
    expect((screen.getByRole('button', { name: '+1' }) as HTMLButtonElement).disabled).toBe(true);
    click('Set done');
    click('Push through heels');
    click('Skip rest');
    click('Set done');
    click('Skip');

    // Cool-down, then the finish screen.
    expect(screen.getByRole('heading', { name: 'Easy walk and slow breaths' })).toBeTruthy();
    click('Next');
    expect(screen.getByRole('heading', { name: 'Session done' })).toBeTruthy();
    expect(screen.getByText('Stay board-straight')).toBeTruthy();
    expect(screen.queryByText(/one more/i)).toBeNull();
    await vi.waitFor(() => expect(wake.released).toBe(1));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      itemId: 'session-starter',
      itemVersion: 'sha256:session2',
      outcome: 'done',
      praised: ['Stay board-straight', 'Push through heels'],
      setsDone: 4,
    });

    click('Done for today');
    expect(await screen.findByText("Today's session is done. See you next time.")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });

  it('keeps every in-session control at 56 px or more on every step (AC2)', async () => {
    setViewport(width, height);
    render(<SessionPlayer session={demoSession()} layout={layout} wakeLock={fakeWake('active')} onExit={() => {}} />);
    const seen = new Set<string>();
    const check = () => {
      for (const b of screen.getAllByRole('button')) {
        seen.add(b.textContent ?? '');
        expect(b.classList.contains('session-control'), b.textContent ?? '').toBe(true);
        const { h, w } = minSize(b);
        expect(h, `${b.textContent} min-height`).toBeGreaterThanOrEqual(56);
        expect(w, `${b.textContent} min-width`).toBeGreaterThanOrEqual(56);
      }
    };
    check(); // warm-up move on a countdown (K2)
    click('Next');
    click('Next');
    check(); // ready
    click('Start set 1');
    check(); // timed hold (K3)
    click('End set');
    check(); // the form-cue rating
    click('Keep breathing');
    check(); // rest (K5)
    click('Skip rest');
    click('End set');
    click('Skip');
    click('Start set 1');
    check(); // rep set (K4)
    click('Stop');
    check(); // the stop screen, Resume included
    expect([...seen]).toEqual(
      expect.arrayContaining(['Next', 'Start set 1', 'End set', 'Skip rest', 'Set done', '+1', 'Pause', 'Resume', 'Something hurts', 'Stop']),
    );
  });

  it('puts the timer or counter and the next action ahead of the drill notes (AC1)', () => {
    setViewport(width, height);
    render(
      <SessionPlayer session={demoSession({ warmUp: [], coolDown: [] })} layout={layout} wakeLock={fakeWake('active')} onExit={() => {}} />,
    );
    click('Start set 1');
    const grid = document.querySelector(`.${panes}`)!;
    const [main, controls, side] = [...grid.children];
    expect(main.classList.contains('player-main')).toBe(true);
    expect(controls.classList.contains('player-controls')).toBe(true);
    expect(side.classList.contains('player-side')).toBe(true);
    expect(within(controls as HTMLElement).getByRole('button', { name: '20 left', description: 'Hold, set 1 of 2' })).toBeTruthy();
    expect(within(controls as HTMLElement).getByRole('button', { name: 'End set' })).toBeTruthy();
    if (layout === 'expanded') {
      // Landscape: the drill spans the left column, so the controls start the right column.
      expect(grid.classList.contains('card-panes')).toBe(true);
      expect(cascaded(rules, main, 'grid-row')).toBe('span 2');
    }
  });
});

// Story #102 AC1. The rubric's audit measured a cue-rating button at 55.9 px in landscape. The
// 56 px must be the declared floor of the whole box (min-height from the session target token,
// border-box sizing), with nothing in the cascade that sets a height, caps it or scales the
// button, so no label length or viewport can bring it under 56 px.
describe.each(SIZES)('a full 56 px with a long cue label on $name (#102)', ({ width, height, layout }) => {
  const LONG_CUE = 'Squeeze your bottom and tummy tight and keep your hips level from start to finish';

  const expectFloor = (b: HTMLElement) => {
    const name = b.textContent ?? '';
    expect(b.classList.contains('session-control'), name).toBe(true);
    expect(cascaded(rules, b, 'min-height'), name).toBe('var(--target-session)');
    expect(px(cascaded(rules, b, 'min-height')), name).toBe(56);
    expect(px(cascaded(rules, b, 'min-width')), name).toBeGreaterThanOrEqual(56);
    expect(cascaded(rules, b, 'box-sizing'), name).toBe('border-box');
    for (const p of ['height', 'max-height', 'block-size', 'max-block-size', 'transform', 'scale', 'zoom']) {
      expect(cascaded(rules, b, p), `${name} ${p}`).toBeNull();
    }
  };

  it('holds every button on the cue-rating screen and the stop screen at the floor', () => {
    setViewport(width, height);
    const plank = { ...PLANK, cues: [...PLANK.cues, LONG_CUE] };
    render(
      <SessionPlayer
        session={demoSession({ warmUp: [], coolDown: [], cards: [plank] })}
        layout={layout}
        wakeLock={fakeWake('active')}
        onExit={() => {}}
      />,
    );
    click('Start set 1');
    click('End set');

    // The cue-rating screen: every cue, the long one included, Skip and the bar's controls.
    expect(screen.getByRole('heading', { name: 'How did set 1 look?' })).toBeTruthy();
    const rating = [...document.querySelectorAll<HTMLElement>('.cue-buttons button')].map((b) => b.textContent);
    expect(rating).toEqual([...PLANK.cues, LONG_CUE, 'Skip']);
    const onRating = screen.getAllByRole('button');
    expect(onRating.map((b) => b.textContent)).toEqual(expect.arrayContaining(['Squeeze your bottom', LONG_CUE, 'Skip', 'Stop']));
    onRating.forEach(expectFloor);

    // The stop screen: Resume and everything else on it.
    click('Stop');
    const onStop = screen.getAllByRole('button');
    expect(onStop.map((b) => b.textContent)).toContain('Resume');
    onStop.forEach(expectFloor);
  });
});

describe('touch targets in the stylesheet', () => {
  it('sets 44 px for every button and 56 px for in-session controls', () => {
    // The sizes are tokens (story #76): --target and --target-session in src/tokens.css.
    const rule = (selector: string) =>
      rules.find((r) => r.selectors.includes(selector) && r.declarations.has('min-height'))!.declarations;
    for (const [selector, size] of [['button', 44], ['button.session-control', 56]] as const) {
      expect(px(rule(selector).get('min-height') ?? null), selector).toBe(size);
      expect(px(rule(selector).get('min-width') ?? null), selector).toBe(size);
    }
  });

  it('a session control stays 56 px whatever its look (AC2)', () => {
    for (const look of ['primary', 'secondary', 'danger', 'timer-face']) {
      const b = document.createElement('button');
      b.className = `${look} session-control`;
      expect(minSize(b), look).toEqual({ h: 56, w: 56 });
    }
    // Any other button is at least 44 px.
    for (const look of ['primary', 'secondary', 'day-toggle', '']) {
      const b = document.createElement('button');
      b.className = look;
      expect(minSize(b).h, look || 'plain').toBeGreaterThanOrEqual(44);
    }
  });

  it('keeps Stop at least 24 px from Something hurts (AC4)', () => {
    render(<SessionPlayer session={demoSession()} layout="expanded" wakeLock={fakeWake('active')} onExit={() => {}} />);
    const hurts = screen.getByRole('button', { name: 'Something hurts' });
    const stop = screen.getByRole('button', { name: 'Stop' });
    // Side by side in one row, with nothing between them but the row's gap.
    expect(hurts.parentElement).toBe(stop.parentElement);
    expect(hurts.nextElementSibling).toBe(stop);
    expect(cascaded(rules, hurts.parentElement!, 'display')).toBe('flex');
    expect(px(cascaded(rules, hurts.parentElement!, 'gap'))).toBeGreaterThanOrEqual(24);
    expect(px(cascaded(rules, stop, 'margin-left'))).toBe(0);
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

  /** Front plank, set 1, five seconds into the 20 s hold. */
  async function midHold(onFinish?: (r: SessionResult) => void, onExit = () => {}) {
    vi.useFakeTimers();
    const wake = fakeWake('active');
    render(
      <SessionPlayer
        session={demoSession({ warmUp: [], coolDown: [] })}
        layout="expanded"
        wakeLock={wake}
        onFinish={onFinish}
        onExit={onExit}
      />,
    );
    await act(async () => {});
    click('Start set 1');
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByRole('button', { name: '15 left', description: 'Hold, set 1 of 2' })).toBeTruthy();
    return wake;
  }

  it('Stop ends the set at once, before Resume is offered (AC4)', async () => {
    const results: SessionResult[] = [];
    await midHold((r) => results.push(r));
    click('Stop');
    // The set is over: the player and its timer are gone from the screen at once.
    expect(screen.queryByRole('region', { name: 'Session player' })).toBeNull();
    expect(screen.queryByRole('button', { name: /left$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'End set' })).toBeNull();
    // Then the calm stop screen offers Resume, with focus on it.
    expect(screen.getByRole('heading', { name: 'Good call' })).toBeTruthy();
    const resume = screen.getByRole('button', { name: 'Resume' });
    expect(document.activeElement).toBe(resume);
    expect(screen.getByText(RESUME_TEXT)).toBeTruthy();
    // The held timer does not run on behind the stop screen.
    act(() => vi.advanceTimersByTime(STOP_UNDO_MS - 1_000));
    const held = document.querySelector('.timer-time')!;
    expect(held.textContent).toBe('15');
    expect(results).toEqual([]);
  });

  it('Resume brings back the same set and the same time left (AC4)', async () => {
    const results: SessionResult[] = [];
    await midHold((r) => results.push(r));
    click('Stop');
    act(() => vi.advanceTimersByTime(STOP_UNDO_MS - 1_000));
    click('Resume');
    expect(screen.getByRole('region', { name: 'Session player' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Front plank', level: 1 })).toBeTruthy();
    expect(screen.getByRole('button', { name: '15 left', description: 'Hold, set 1 of 2' })).toBeTruthy();
    // The window is gone with the stop screen: the session goes on, and the timer runs again.
    act(() => vi.advanceTimersByTime(STOP_UNDO_MS));
    expect(screen.getByRole('button', { name: '10 left', description: 'Hold, set 1 of 2' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Good call' })).toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole('heading', { name: 'How did set 1 look?' })).toBeTruthy();
    expect(results).toEqual([]);
  });

  it(`after ${STOP_UNDO_MS / 1000} s without Resume, the session is over (AC4)`, async () => {
    const results: SessionResult[] = [];
    const wake = await midHold((r) => results.push(r));
    click('Stop');
    act(() => vi.advanceTimersByTime(STOP_UNDO_MS));
    expect(screen.getByRole('heading', { name: 'Good call' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Done for today' })).toBeTruthy();
    expect(results.map((r) => r.outcome)).toEqual(['stopped']);
    await act(async () => {});
    expect(wake.released).toBe(1);
  });

  it('Done for today during the Resume window ends the session once (AC4)', async () => {
    const results: SessionResult[] = [];
    const onExit = vi.fn();
    await midHold((r) => results.push(r), onExit);
    click('Stop');
    click('Done for today');
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.outcome)).toEqual(['stopped']);
    act(() => vi.advanceTimersByTime(STOP_UNDO_MS));
    expect(results).toHaveLength(1);
  });

  it('Something hurts still pauses at once, mid-set, with no Resume (AC4)', async () => {
    const results: SessionResult[] = [];
    await midHold((r) => results.push(r));
    click('Something hurts');
    expect(screen.getByRole('heading', { name: 'Good call stopping' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull();
    expect(results.map((r) => r.outcome)).toEqual(['hurt']);
  });
});

describe('wake lock in the player (AC2)', () => {
  it('without a wake lock, shows the notice and pauses a timer until tapped once a minute', async () => {
    vi.useFakeTimers();
    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={fakeWake('fallback')} onExit={() => {}} />);
    await act(async () => {});
    expect(screen.getByText(WAKE_FALLBACK_TEXT)).toBeTruthy();

    act(() => vi.advanceTimersByTime(KEEP_AWAKE_TAP_MS - 1_000));
    expect(screen.getByRole('button', { name: '11 left', description: 'March on the spot' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(2_000));
    const waiting = screen.getByRole('button', { name: /^1[01] left$/, description: 'March on the spot' });
    expect(screen.getByText('Tap the timer to keep going.')).toBeTruthy();
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
    expect(screen.getByRole('button', { name: /left$/, description: 'Hold, set 2 of 2' })).toBeTruthy();
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

    click('Do last version');
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
    expect(screen.queryByRole('button', { name: /Start session|Do last version/ })).toBeNull();
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
