import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { SessionPlayer } from './SessionPlayer';
import { STOP_UNDO_MS, initialState, reduce, stepsOf, type Action, type PlayerState } from './player';
import { MUTE_KEY, createSoundEngine, cueForChange, sound } from './sound';
import { CUE_NAMES, RUBRIC_MOMENTS, type CueName } from './cues';
import type { WakeLockController } from './wakeLock';
import { PLANK, demoSession, keeperServer, todayWith } from './session.fixture';

/** A live AudioContext stand-in: counts buffer sources started and can be blocked. */
function fakeAudio(state: AudioContextState = 'running') {
  const fake = {
    state,
    sampleRate: 48000,
    currentTime: 0,
    destination: {},
    started: [] as { length: number }[],
    resumes: 0,
    resume() {
      fake.resumes += 1;
      return Promise.resolve();
    },
    buffers: 0,
    createBuffer: (_c: number, length: number) => {
      fake.buffers += 1;
      return { length, getChannelData: () => new Float32Array(length) };
    },
    createBufferSource() {
      const src = {
        buffer: null as { length: number } | null,
        connect() {},
        start() {
          fake.started.push(src.buffer!);
        },
      };
      return src;
    },
  };
  return fake;
}

/** Every cue's samples already computed: a stand-in for `prepareCues`, counting its calls. */
function readyCues(overrides: Partial<Record<CueName, Promise<Float32Array>>> = {}) {
  const promises = Object.fromEntries(CUE_NAMES.map((n) => [n, overrides[n] ?? Promise.resolve(new Float32Array(100 + CUE_NAMES.indexOf(n)))])) as Record<
    CueName,
    Promise<Float32Array>
  >;
  for (const p of Object.values(promises)) p.catch(() => {});
  const prepare = vi.fn(() => promises);
  return prepare;
}

/** Let settled cue promises make their buffers (one task each, after the tap's own). */
const settle = async () => {
  for (let i = 0; i <= CUE_NAMES.length; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const wake: WakeLockController = {
  status: 'active',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('the sound engine', () => {
  it('plays nothing before the unlocking tap, then plays cues on the context it made', async () => {
    const audio = fakeAudio('suspended');
    const make = vi.fn(() => audio as unknown as AudioContext);
    let now = 0;
    const engine = createSoundEngine(make, () => now, readyCues());

    expect(engine.play('start')).toBe(false);
    expect(make).not.toHaveBeenCalled();
    expect(audio.started).toHaveLength(0);

    engine.unlock();
    expect(make).toHaveBeenCalledTimes(1);
    expect(audio.resumes).toBe(1);
    expect(audio.started).toEqual([expect.objectContaining({ length: 1 })]); // the silent unlock buffer
    await settle();

    // The resume asked for in the tap may still be settling: the first cue still plays.
    expect(engine.play('start')).toBe(true);
    expect(audio.started).toHaveLength(2);

    audio.state = 'running';
    now = 60_000;
    expect(engine.play('go')).toBe(true);
    expect(audio.started).toHaveLength(3);
  });

  it('skips a cue when audio stays blocked, rather than playing it late', async () => {
    const audio = fakeAudio('suspended');
    let now = 0;
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => now, readyCues());
    engine.unlock();
    await settle();
    expect(engine.ready('rest')).toBe(true);
    now = 5_000;
    expect(engine.play('rest')).toBe(false);
    expect(audio.started).toHaveLength(1);
    expect(audio.resumes).toBeGreaterThan(1);
  });

  it('makes each cue’s buffer once, after the unlock, and a play only starts a source on it (story #97 AC1)', async () => {
    const audio = fakeAudio();
    const prepare = readyCues();
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => 0, prepare);
    engine.warm();
    expect(audio.buffers).toBe(0);
    engine.unlock();
    await settle();
    // The silent unlock buffer, then one buffer per cue.
    expect(audio.buffers).toBe(1 + CUE_NAMES.length);
    for (const name of CUE_NAMES) {
      expect(engine.play(name), name).toBe(true);
      expect(engine.play(name), name).toBe(true);
    }
    expect(audio.buffers).toBe(1 + CUE_NAMES.length);
    // Two plays of a cue start two sources on the same buffer.
    const played = audio.started.slice(1);
    for (let i = 0; i < CUE_NAMES.length; i++) {
      expect(played[2 * i]).toBe(played[2 * i + 1]);
      expect(played[2 * i].length).toBe(100 + i);
    }
    // Another tap reuses the context and its buffers: nothing is prepared or made again.
    engine.unlock();
    await settle();
    expect(audio.buffers).toBe(1 + CUE_NAMES.length + 1);
    expect(prepare).toHaveBeenCalledTimes(2); // warm() and the first unlock; prepare returns the same work
  });

  it('plays the start cue in the unlocking tap itself once the cues were warmed before it', async () => {
    const audio = fakeAudio();
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => 0, readyCues());
    engine.warm();
    await settle();
    // The tap: unlock and the first cue, with no wait between them. Only the start cue's
    // buffer is made in the tap; the rest follow in their own tasks.
    engine.unlock();
    expect(engine.ready('start')).toBe(true);
    expect(engine.play('start')).toBe(true);
    expect(audio.started).toHaveLength(2);
    expect(audio.buffers).toBe(2);
    expect(engine.ready('done')).toBe(false);
    await settle();
    expect(audio.buffers).toBe(1 + CUE_NAMES.length);
    expect(engine.play('done')).toBe(true);
  });

  it('skips a cue whose buffer is not ready, silently, and plays the next as normal (story #97 AC2)', async () => {
    const audio = fakeAudio();
    let finish!: (d: Float32Array) => void;
    const slow = new Promise<Float32Array>((resolve) => (finish = resolve));
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => 0, readyCues({ done: slow }));
    engine.unlock();
    await settle();
    expect(engine.ready('done')).toBe(false);
    expect(() => engine.play('done')).not.toThrow();
    expect(engine.play('done')).toBe(false);
    expect(audio.started).toHaveLength(1);
    expect(engine.play('start')).toBe(true);
    expect(audio.started).toHaveLength(2);
    // Once ready, it plays.
    finish(new Float32Array(10));
    await settle();
    expect(engine.play('done')).toBe(true);
    expect(audio.started).toHaveLength(3);
  });

  it('skips a cue whose render failed, silently, and plays the next as normal (story #97 AC2)', async () => {
    const audio = fakeAudio();
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => 0, readyCues({ setDone: Promise.reject(new Error('render failed')) }));
    engine.unlock();
    await settle();
    expect(engine.ready('setDone')).toBe(false);
    expect(() => engine.play('setDone')).not.toThrow();
    expect(engine.play('setDone')).toBe(false);
    expect(engine.play('rest')).toBe(true);
    expect(audio.started).toHaveLength(2);
  });

  it('skips a cue whose buffer could not be made, and plays the rest', async () => {
    const audio = fakeAudio();
    const make = audio.createBuffer;
    audio.createBuffer = (c: number, length: number) => {
      if (length === 100 + CUE_NAMES.indexOf('go')) throw new Error('no buffer');
      return make(c, length);
    };
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => 0, readyCues());
    engine.unlock();
    await settle();
    expect(engine.play('go')).toBe(false);
    expect(engine.play('tick')).toBe(true);
  });

  it('does nothing where there is no Web Audio at all', () => {
    const engine = createSoundEngine(() => null);
    engine.unlock();
    expect(engine.unlocked).toBe(false);
    expect(engine.play('start')).toBe(false);
  });
});

/** Run a list of actions through the player and collect the cue each change plays. */
function cuesFor(actions: Action[], session = demoSession()): CueName[] {
  const steps = stepsOf(session);
  let s: PlayerState = initialState(steps);
  const out: CueName[] = [];
  const first = cueForChange(null, s);
  if (first) out.push(first);
  for (const a of actions) {
    const n = reduce(steps, s, a);
    const cue = cueForChange(s, n);
    if (cue) out.push(cue);
    s = n;
  }
  return out;
}

describe('cue triggers', () => {
  const next: Action = { type: 'next' };

  it('play the rubric’s moments on the right transitions', () => {
    const plank = demoSession({ warmUp: [], coolDown: [], cards: [PLANK] });
    // ready -> set 1 -> set end -> rest -> set 2 -> set end -> session done
    expect(cuesFor([next, next, { type: 'praise', cue: PLANK.cues[0] }, next, next, next], plank)).toEqual([
      RUBRIC_MOMENTS['session start'],
      RUBRIC_MOMENTS['set start'],
      RUBRIC_MOMENTS['set end'],
      RUBRIC_MOMENTS['rest start'],
      RUBRIC_MOMENTS['set start'],
      RUBRIC_MOMENTS['set end'],
      RUBRIC_MOMENTS['session done'],
    ]);
  });

  it('play a switch between moves and steps, and nothing for a counted rep', () => {
    // Warm-up move 1 -> move 2 -> the plank's ready screen.
    expect(cuesFor([next, next])).toEqual(['start', 'switch', 'switch']);
    const bridge = demoSession({ warmUp: [], coolDown: [] }).cards[1];
    expect(cuesFor([next, { type: 'rep' }], demoSession({ warmUp: [], coolDown: [], cards: [bridge] }))).toEqual(['start', 'go']);
  });

  it('play the calm safety cue for a stop or "Something hurts", once', () => {
    expect(cuesFor([{ type: 'stop', outcome: 'hurt' }, next])).toEqual(['start', RUBRIC_MOMENTS['safety stop or pain report']]);
    expect(cuesFor([{ type: 'stop', outcome: 'stopped' }])).toEqual(['start', 'safety']);
  });

  it('Stop plays the safety cue on the tap; the Resume window and Resume are silent (story #77)', () => {
    const stop: Action = { type: 'stop', outcome: 'stopped' };
    // Stop, input while stopped, then the window closes: one safety cue, at the tap.
    expect(cuesFor([next, next, next, stop, next, { type: 'rep' }, { type: 'stop-final' }])).toEqual(['start', 'switch', 'switch', 'go', 'safety']);
    // Stop then Resume: no start or go replayed; the session's own cues carry on after.
    expect(cuesFor([next, next, next, stop, { type: 'resume' }, next])).toEqual(['start', 'switch', 'switch', 'go', 'safety', 'setDone']);
    // "Something hurts" on the stop screen is a new stop.
    expect(cuesFor([stop, { type: 'stop', outcome: 'hurt' }])).toEqual(['start', 'safety', 'safety']);
  });
});

describe('the player’s sound', () => {
  it('has a 56 px sound switch that is remembered on the device', () => {
    const plays = vi.spyOn(sound, 'play').mockReturnValue(true);
    vi.spyOn(sound, 'unlock').mockImplementation(() => {});
    const view = render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onExit={() => {}} />);
    const toggle = screen.getByRole('button', { name: 'Sound' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toBe('Sound: on');
    expect(toggle.classList.contains('session-control')).toBe(true);
    expect(plays.mock.calls.map((c) => c[0])).toEqual(['start']);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.textContent).toBe('Sound: off');
    expect(localStorage.getItem(MUTE_KEY)).toBe('1');
    view.unmount();

    // A new session (or a reload) starts muted, and plays nothing.
    plays.mockClear();
    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onExit={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sound' }).getAttribute('aria-pressed')).toBe('false');
    click('Next');
    expect(plays).not.toHaveBeenCalled();
    // Each moment still changes the screen: nothing depends on hearing it.
    expect(screen.getByRole('heading', { name: 'Arm circles' })).toBeTruthy();
  });

  it('plays each cue as the screen changes, ticks the last three seconds of rest, and the pause', () => {
    vi.useFakeTimers();
    const plays = vi.spyOn(sound, 'play').mockReturnValue(true);
    vi.spyOn(sound, 'unlock').mockImplementation(() => {});
    render(<SessionPlayer session={demoSession({ warmUp: [], coolDown: [], cards: [PLANK] })} layout="medium" wakeLock={wake} onExit={() => {}} />);
    const heard = () => plays.mock.calls.map((c) => c[0]);

    click('Start set 1');
    expect(heard()).toEqual(['start', 'go']);
    click('End set');
    expect(heard().at(-1)).toBe('setDone');
    click('Skip');
    expect(heard().at(-1)).toBe('rest');
    expect(screen.getByRole('button', { name: '45 left' })).toBeTruthy();

    click('Pause');
    expect(heard().at(-1)).toBe('pause');
    click('Resume');
    expect(heard().at(-1)).toBe('pause');

    act(() => vi.advanceTimersByTime(41_000));
    expect(screen.getByRole('button', { name: '4 left' })).toBeTruthy();
    expect(heard().filter((c) => c === 'tick')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole('button', { name: '3 left' })).toBeTruthy();
    expect(heard().filter((c) => c === 'tick')).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1_000));
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole('button', { name: '1 left' })).toBeTruthy();
    expect(heard().filter((c) => c === 'tick')).toHaveLength(3);
    act(() => vi.advanceTimersByTime(1_000));
    // Rest over: set 2 starts, with its cue.
    expect(screen.getByText('Hold, set 2 of 2')).toBeTruthy();
    expect(heard().at(-1)).toBe('go');

    click('End set');
    click('Skip');
    expect(screen.getByRole('heading', { name: 'Session done' })).toBeTruthy();
    expect(heard().slice(-2)).toEqual(['setDone', 'done']);
    // The switch stays on the finish screen.
    expect(screen.getByRole('button', { name: 'Sound' })).toBeTruthy();
  });

  it('plays nothing while the stop screen holds the set, and no start cue on Resume (story #77)', () => {
    vi.useFakeTimers();
    const plays = vi.spyOn(sound, 'play').mockReturnValue(true);
    vi.spyOn(sound, 'unlock').mockImplementation(() => {});
    render(<SessionPlayer session={demoSession({ warmUp: [], coolDown: [], cards: [PLANK] })} layout="medium" wakeLock={wake} onExit={() => {}} />);
    const heard = () => plays.mock.calls.map((c) => c[0]);
    click('Start set 1');
    click('End set');
    click('Skip');
    // Rest, 4 s left: the last three seconds would tick if the timer ran.
    act(() => vi.advanceTimersByTime(41_000));
    expect(heard()).toEqual(['start', 'go', 'setDone', 'rest']);
    click('Stop');
    expect(heard().at(-1)).toBe('safety');
    // The sound switch stays on the stop screen.
    expect(screen.getByRole('button', { name: 'Sound' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(STOP_UNDO_MS - 500));
    expect(heard()).toEqual(['start', 'go', 'setDone', 'rest', 'safety']);
    click('Resume');
    expect(screen.getByRole('button', { name: '4 left' })).toBeTruthy();
    expect(heard()).toEqual(['start', 'go', 'setDone', 'rest', 'safety']);
    // The rest runs on and ticks as before.
    act(() => vi.advanceTimersByTime(1_000));
    expect(heard().at(-1)).toBe('tick');

    // Stop again and let the window close: nothing more plays.
    click('Stop');
    const before = heard().length;
    act(() => vi.advanceTimersByTime(STOP_UNDO_MS + 1_000));
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull();
    expect(heard().slice(before - 1)).toEqual(['safety']);
  });

  it('unlocks sound in the Start tap, and plays nothing on the home before it', async () => {
    const plays = vi.spyOn(sound, 'play').mockReturnValue(true);
    const unlock = vi.spyOn(sound, 'unlock').mockImplementation(() => {});
    const server = keeperServer(todayWith());
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} />);
    await screen.findByRole('button', { name: 'Start session' });
    expect(unlock).not.toHaveBeenCalled();
    expect(plays).not.toHaveBeenCalled();

    click('Start session');
    expect(unlock).toHaveBeenCalledTimes(1);
    expect(unlock.mock.invocationCallOrder[0]).toBeLessThan(plays.mock.invocationCallOrder[0]);
    expect(plays.mock.calls.map((c) => c[0])).toEqual(['start']);
  });
});
