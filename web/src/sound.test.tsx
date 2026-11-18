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
  it('plays nothing before the unlocking tap, then plays cues on the primed context', async () => {
    const audio = fakeAudio('suspended');
    const make = vi.fn(() => audio as unknown as AudioContext);
    let now = 0;
    const engine = createSoundEngine(make, () => now, readyCues());

    expect(engine.play('start')).toBe(false);
    expect(make).not.toHaveBeenCalled();
    expect(audio.started).toHaveLength(0);

    engine.prime();
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

  it('makes the context ahead of the tap when primed, silent until the tap resumes it (story #98 AC5)', async () => {
    const audio = fakeAudio('suspended');
    const make = vi.fn(() => audio as unknown as AudioContext);
    const engine = createSoundEngine(make, () => 0, readyCues());
    engine.prime();
    engine.prime();
    expect(make).toHaveBeenCalledTimes(1);
    await settle();
    // Made and loaded, but nothing plays and nothing is resumed before the tap.
    expect(engine.ready('start')).toBe(true);
    expect(engine.unlocked).toBe(false);
    expect(engine.play('start')).toBe(false);
    expect(audio.resumes).toBe(0);
    expect(audio.started).toHaveLength(0);

    // The tap only resumes the context it already has, and plays the silent unlock buffer.
    engine.unlock();
    expect(make).toHaveBeenCalledTimes(1);
    expect(audio.resumes).toBe(1);
    expect(audio.started).toHaveLength(1);
    expect(engine.play('start')).toBe(true);
  });

  it('skips a cue when audio stays blocked, rather than playing it late', async () => {
    const audio = fakeAudio('suspended');
    let now = 0;
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => now, readyCues());
    engine.prime();
    engine.unlock();
    await settle();
    expect(engine.ready('rest')).toBe(true);
    now = 5_000;
    expect(engine.play('rest')).toBe(false);
    expect(audio.started).toHaveLength(1);
    // A play never resumes the context (story 103): only a tap's unlock does.
    expect(audio.resumes).toBe(1);
  });

  it('makes each cue’s buffer once, after the unlock, and a play only starts a source on it (story #97 AC1)', async () => {
    const audio = fakeAudio();
    const prepare = readyCues();
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => 0, prepare);
    engine.warm();
    expect(audio.buffers).toBe(0);
    engine.prime();
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
    // Another tap reuses the context and its buffers: nothing is prepared or made again, and
    // with the context running no silent buffer either (story #98: a tap does no audio work).
    engine.unlock();
    await settle();
    expect(audio.buffers).toBe(1 + CUE_NAMES.length);
    audio.state = 'suspended';
    engine.unlock();
    expect(audio.buffers).toBe(1 + CUE_NAMES.length + 1);
    expect(prepare).toHaveBeenCalledTimes(2); // warm() and prime(); prepare returns the same work
  });

  it('plays the start cue in the unlocking tap itself once the cues were warmed before it', async () => {
    const audio = fakeAudio();
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => 0, readyCues());
    engine.warm();
    await settle();
    // Primed, then the tap: unlock and the first cue, with no wait between them. Only the start
    // cue's buffer is made at once; the rest follow in their own tasks.
    engine.prime();
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
    engine.prime();
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
    engine.prime();
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
    engine.prime();
    engine.unlock();
    await settle();
    expect(engine.play('go')).toBe(false);
    expect(engine.play('tick')).toBe(true);
  });

  it('never makes the context in a tap other than Start: unlock only marks sound as wanted (story 103)', async () => {
    const audio = fakeAudio('suspended');
    const make = vi.fn(() => audio as unknown as AudioContext);
    const engine = createSoundEngine(make, () => 0, readyCues());
    engine.unlock();
    expect(make).not.toHaveBeenCalled();
    expect(engine.unlocked).toBe(false);
    expect(engine.play('start')).toBe(false);

    // Made later, outside a tap, the iPad keeps it suspended: no resume, no cue.
    engine.prime();
    await settle();
    expect(make).toHaveBeenCalledTimes(1);
    expect(audio.resumes).toBe(0);
    expect(engine.play('switch')).toBe(false);
    expect(audio.started).toHaveLength(0);

    // The next tap resumes it, and its cue plays as normal.
    engine.unlock();
    expect(make).toHaveBeenCalledTimes(1);
    expect(audio.resumes).toBe(1);
    expect(engine.play('switch')).toBe(true);
  });

  it('plays on a context made after an early tap once the browser runs it (a desktop browser)', async () => {
    const audio = fakeAudio('running');
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => 0, readyCues());
    // Primed with no tap at all: nothing plays.
    engine.prime();
    await settle();
    expect(engine.play('start')).toBe(false);
    // A tap asked for sound: the running context plays.
    engine.unlock();
    expect(engine.play('go')).toBe(true);
  });

  it('the Start tap makes the context when it does not exist yet, unlocks it and plays the start cue (story 103)', async () => {
    const audio = fakeAudio('suspended');
    const make = vi.fn(() => audio as unknown as AudioContext);
    const engine = createSoundEngine(make, () => 0, readyCues());
    engine.warm();
    await settle();
    // A quick Start: no prime yet. Made, resumed and unlocked in the tap itself.
    engine.unlockForStart();
    expect(make).toHaveBeenCalledTimes(1);
    expect(audio.resumes).toBe(1);
    expect(engine.unlocked).toBe(true);
    expect(engine.play('start')).toBe(true);
    // Primed already: the Start tap only resumes it.
    engine.unlockForStart();
    engine.prime();
    expect(make).toHaveBeenCalledTimes(1);
  });

  it('the Start tap only resumes a context made ahead of it', () => {
    const audio = fakeAudio('suspended');
    const make = vi.fn(() => audio as unknown as AudioContext);
    const engine = createSoundEngine(make, () => 0, readyCues());
    engine.prime();
    expect(make).toHaveBeenCalledTimes(1);
    engine.unlockForStart();
    expect(make).toHaveBeenCalledTimes(1);
    expect(audio.resumes).toBe(1);
  });

  it('computes the start cue alone on warmStart, and the tap makes its buffer from it (story 103)', async () => {
    const audio = fakeAudio('suspended');
    const prepare = readyCues();
    const prepareStart = vi.fn(() => Promise.resolve(new Float32Array(77)));
    const engine = createSoundEngine(() => audio as unknown as AudioContext, () => 0, prepare, 48000, prepareStart);
    engine.warmStart();
    expect(prepareStart).toHaveBeenCalledTimes(1);
    expect(prepare).not.toHaveBeenCalled();
    await settle();
    // A quick Start: the start cue's buffer is made in the tap, and it plays at once.
    engine.unlockForStart();
    expect(engine.ready('start')).toBe(true);
    expect(engine.play('start')).toBe(true);
    expect(audio.started.at(-1)!.length).toBe(77);
  });

  it('plays a quick Start’s cue once its samples are ready, if within START_CUE_LATE_MS, and skips it after', async () => {
    const { START_CUE_LATE_MS } = await import('./sound');
    // Inside the rubric's +125 ms sync window: 120 ms late plays, 121 ms is skipped.
    expect(START_CUE_LATE_MS).toBe(120);
    for (const late of [START_CUE_LATE_MS, START_CUE_LATE_MS + 1]) {
      const audio = fakeAudio('running');
      let finish!: (d: Float32Array) => void;
      const slow = new Promise<Float32Array>((resolve) => (finish = resolve));
      let now = 0;
      const engine = createSoundEngine(() => audio as unknown as AudioContext, () => now, readyCues({ start: slow }));
      engine.unlockForStart();
      expect(engine.play('start')).toBe(false);
      expect(audio.started).toHaveLength(1); // the silent unlock buffer
      now = late;
      finish(new Float32Array(50));
      await settle();
      expect(audio.started, `${late} ms late`).toHaveLength(late <= START_CUE_LATE_MS ? 2 : 1);
      // Only once: a later buffer for it plays nothing by itself.
      expect(engine.ready('start')).toBe(true);
    }
  });

  it('does nothing where there is no Web Audio at all', () => {
    const engine = createSoundEngine(() => null);
    engine.prime();
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
    const unlock = vi.spyOn(sound, 'unlockForStart').mockImplementation(() => {});
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

describe('warming the cues (story #98 AC4)', () => {
  /** A recording requestIdleCallback: the idle callbacks run only when `idle()` is called. */
  function idleQueue() {
    const queue = new Map<number, () => void>();
    let next = 1;
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      queue.set(next, cb);
      return next++;
    });
    vi.stubGlobal('cancelIdleCallback', (id: number) => queue.delete(id));
    return () => {
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) cb();
    };
  }

  /** The parent's home, with demo content only. */
  function parentServer() {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/me') return json({ role: 'parent' });
      if (url === '/api/approvals/pending') return json({ requests: [] });
      if (url === '/api/notifications/badge') return json({ unread: 0 });
      if (url === '/api/audit') return json({ events: [] });
      return json({ error: 'not found' }, 404);
    };
    return fetchImpl as unknown as typeof fetch;
  }

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('never warms them on the parent’s phone', async () => {
    const idle = idleQueue();
    const warm = vi.spyOn(sound, 'warm').mockImplementation(() => {});
    const prime = vi.spyOn(sound, 'prime').mockImplementation(() => {});
    render(<App fetchImpl={parentServer()} wakeLock={wake} />);
    await screen.findByRole('heading', { name: /approval|inbox|waiting/i });
    idle();
    await new Promise((r) => setTimeout(r, 0));
    idle();
    expect(warm).not.toHaveBeenCalled();
    expect(prime).not.toHaveBeenCalled();
  });

  it('warms them, and makes the audio context, once the keeper’s home is up and the page is idle', async () => {
    const idle = idleQueue();
    const warm = vi.spyOn(sound, 'warm').mockImplementation(() => {});
    const prime = vi.spyOn(sound, 'prime').mockImplementation(() => {});
    render(<App fetchImpl={keeperServer(todayWith()).fetchImpl} wakeLock={wake} />);
    await screen.findByRole('button', { name: 'Start session' });
    expect(warm).not.toHaveBeenCalled();
    expect(prime).not.toHaveBeenCalled();
    idle();
    expect(warm).toHaveBeenCalled();
    expect(prime).toHaveBeenCalled();
  });

  it('renders the start cue right after the keeper’s home first paints, before the idle queue runs (story 103)', async () => {
    const idle = idleQueue();
    const order: string[] = [];
    vi.spyOn(sound, 'warmStart').mockImplementation(() => void order.push('warmStart'));
    vi.spyOn(sound, 'warm').mockImplementation(() => void order.push('warm'));
    vi.spyOn(sound, 'prime').mockImplementation(() => void order.push('prime'));
    render(<App fetchImpl={keeperServer(todayWith()).fetchImpl} wakeLock={wake} />);
    await screen.findByRole('button', { name: 'Start session' });
    // After the paint, with no idle period yet: the start cue only.
    await vi.waitFor(() => expect(order).toContain('warmStart'));
    expect(order.every((o) => o === 'warmStart')).toBe(true);
    idle();
    expect(order.slice(-2)).toEqual(['warm', 'prime']);
  });

  it('computes the start cue first in slices well under 50 ms, and the rest share that work', async () => {
    const { forgetCues, prepareCue, prepareCues, cueStats, SLICE_MS } = await import('./cues');
    forgetCues(8000);
    let t = 0;
    const slices: number[] = [];
    let sliceStart = 0;
    const options = {
      clock: () => (t += 0.01),
      pause: async () => {
        slices.push(t - sliceStart);
        sliceStart = t;
      },
    };
    const before = cueStats.synthesised;
    const start = await prepareCue('start', 8000, options);
    expect(cueStats.synthesised).toBe(before + 1);
    expect(Math.max(...slices)).toBeLessThanOrEqual(SLICE_MS + 1);
    expect(SLICE_MS).toBeLessThan(50);
    // prepareCues reuses the start cue rather than computing it again.
    const all = prepareCues(8000, options);
    expect(await all.start).toBe(start);
    await Promise.all(Object.values(all));
    expect(cueStats.synthesised).toBe(before + CUE_NAMES.length);
    forgetCues(8000);
  });

  it('warms them when the session player mounts', () => {
    const idle = idleQueue();
    const warm = vi.spyOn(sound, 'warm').mockImplementation(() => {});
    render(<SessionPlayer session={demoSession({ warmUp: [], coolDown: [] })} layout="medium" wakeLock={wake} onExit={() => {}} />);
    idle();
    expect(warm).toHaveBeenCalled();
  });
});

describe('warming without an idle callback (the iPad)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('waits at least WARM_FALLBACK_MS, so the first paint and an early tap come first', async () => {
    const { warmWhenIdle, WARM_FALLBACK_MS } = await import('./sound');
    expect(WARM_FALLBACK_MS).toBeGreaterThanOrEqual(1000);
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.stubGlobal('cancelIdleCallback', undefined);
    const calls: string[] = [];
    const engine = { warm: () => calls.push('warm'), prime: () => calls.push('prime'), warmStart: () => {} } as unknown as Parameters<
      typeof warmWhenIdle
    >[0];
    const cancel = warmWhenIdle(engine);
    vi.advanceTimersByTime(WARM_FALLBACK_MS - 1);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(calls).toEqual(['warm', 'prime']);
    cancel();
  });
});

describe('making the audio context before the Start tap (story 103)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('asks for an idle period with a ~2 s timeout, and makes it at the timeout on a page that never settles (AC1)', async () => {
    const { warmWhenIdle, PRIME_TIMEOUT_MS } = await import('./sound');
    expect(PRIME_TIMEOUT_MS).toBe(2000);
    const asks: { cb: (d: IdleDeadline) => void; timeout?: number }[] = [];
    vi.stubGlobal('requestIdleCallback', (cb: (d: IdleDeadline) => void, opts?: { timeout?: number }) => asks.push({ cb, timeout: opts?.timeout }));
    vi.stubGlobal('cancelIdleCallback', () => {});
    const calls: string[] = [];
    const engine = { warm: () => calls.push('warm'), prime: () => calls.push('prime'), warmStart: () => {} } as unknown as Parameters<typeof warmWhenIdle>[0];
    warmWhenIdle(engine);
    expect(asks).toHaveLength(1);
    expect(asks[0].timeout).toBeGreaterThan(1900);
    expect(asks[0].timeout).toBeLessThanOrEqual(PRIME_TIMEOUT_MS);
    // A short idle period, before the timeout: wait for a longer one, within the same 2 s.
    asks[0].cb({ didTimeout: false, timeRemaining: () => 5 } as IdleDeadline);
    expect(calls).toEqual([]);
    expect(asks).toHaveLength(2);
    expect(asks[1].timeout).toBeLessThanOrEqual(asks[0].timeout!);
    // The timeout: made now, however busy the page, so the Start tap only resumes it.
    asks[1].cb({ didTimeout: true, timeRemaining: () => 0 } as IdleDeadline);
    expect(calls).toEqual(['warm', 'prime']);
  });
});

describe('cue work never holds up a screen change (story 103 AC5)', () => {
  /** A stand-in `scheduler.postTask` that queues each callback with its priority, run by hand. */
  function postTaskQueue() {
    const queue: { priority: string; run: () => void }[] = [];
    const yields = vi.fn();
    vi.stubGlobal('scheduler', {
      yield: yields,
      postTask: (cb: () => void, opts: { priority: string }) =>
        new Promise<void>((resolve) => queue.push({ priority: opts.priority, run: () => (cb(), resolve()) })),
    });
    return { queue, yields };
  }

  afterEach(() => vi.unstubAllGlobals());

  it('yields with a background task, never scheduler.yield (whose continuation runs ahead of the page)', async () => {
    const { queue, yields } = postTaskQueue();
    const { yieldToPage, yieldBriefly } = await import('./cues');
    void yieldToPage();
    void yieldBriefly();
    expect(queue.map((q) => q.priority)).toEqual(['background', 'user-visible']);
    expect(yields).not.toHaveBeenCalled();
  });

  it('the Start tap computes no cue: all cue work waits for background tasks', async () => {
    const { queue } = postTaskQueue();
    const { forgetCues, prepareCues, cueStats } = await import('./cues');
    forgetCues(8000);
    const before = cueStats.synthesised;
    const engine = createSoundEngine(() => fakeAudio('suspended') as unknown as AudioContext, () => 0, () => prepareCues(8000), 8000);
    engine.unlockForStart();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    // Nothing computed in the tap or its microtasks; what is queued waits behind the page's work.
    expect(cueStats.synthesised).toBe(before);
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.every((q) => q.priority === 'background')).toBe(true);
    // Run by hand, the work completes.
    while (cueStats.synthesised < before + CUE_NAMES.length) {
      const next = queue.shift();
      if (next) next.run();
      await new Promise((r) => setTimeout(r, 0));
    }
    forgetCues(8000);
  });

  it('computes the start cue at the page’s own priority on the home, and behind the page once Start is tapped', async () => {
    const pauses: (() => Promise<void>)[] = [];
    const prepareStart = vi.fn((pause: () => Promise<void>) => {
      pauses.push(pause);
      return new Promise<Float32Array>(() => {});
    });
    const engine = createSoundEngine(() => fakeAudio('suspended') as unknown as AudioContext, () => 0, readyCues(), 48000, prepareStart);
    const { queue } = postTaskQueue();
    engine.warmStart();
    void pauses[0]();
    engine.unlockForStart();
    void pauses[0]();
    expect(queue.map((q) => q.priority)).toEqual(['user-visible', 'background']);
  });

  it('measures a long cue in short steps too, with the same result, so no step of its work is one long task', async () => {
    const { levels, measuring } = await import('./cues');
    const data = Float32Array.from({ length: 110_400 }, (_, i) => 0.5 * Math.sin(i / 7));
    const steps = measuring(data);
    let yields = 0;
    let r = steps.next();
    while (!r.done) {
      yields += 1;
      r = steps.next();
    }
    // One step per 8192 samples, not the whole cue at once.
    expect(yields).toBeGreaterThanOrEqual(Math.floor(110_400 / 8192) - 1);
    expect(r.value).toEqual(levels(data));
  });
});

describe('cue work where there is no scheduler.postTask (Safari on the iPad, story 103 AC5)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('both yields fall back to a new task, never scheduler.yield', async () => {
    vi.useFakeTimers();
    const yields = vi.fn(() => Promise.resolve());
    vi.stubGlobal('scheduler', { yield: yields });
    const { yieldToPage, yieldBriefly } = await import('./cues');
    let done = 0;
    void yieldToPage().then(() => (done += 1));
    void yieldBriefly().then(() => (done += 1));
    // Not a microtask: nothing resumes until a task runs.
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(done).toBe(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(2);
    expect(yields).not.toHaveBeenCalled();
  });

  it('a quick Start’s cue set never runs more than one slice while the player’s render has a task waiting', async () => {
    // The page's task queue, first in first out, run one task at a time by hand. Each task's
    // microtasks run before the next task, as in the browser.
    const realTimeout = globalThis.setTimeout;
    const flush = () => new Promise((resolve) => realTimeout(resolve, 0));
    const tasks: (() => void)[] = [];
    vi.stubGlobal('setTimeout', (fn: () => void) => {
      tasks.push(fn);
      return tasks.length;
    });
    const yields = vi.fn(() => Promise.resolve());
    vi.stubGlobal('scheduler', { yield: yields });
    const { forgetCues, prepareCues, cueStats, SLICE_MS } = await import('./cues');
    forgetCues(8000);
    const before = cueStats.synthesised;
    // A clock that moves with the work, so each slice ends on its 8 ms budget.
    let t = 0;
    const options = { clock: () => (t += 0.1) };
    const engine = createSoundEngine(() => fakeAudio('suspended') as unknown as AudioContext, () => 0, () => prepareCues(8000, options), 8000);
    // The Start tap: the context is made and the whole cue set starts.
    engine.unlockForStart();

    // The player's render, as React does it: a chain of tasks, each posting the next, then the
    // commit and paint.
    let waiting = false;
    let chunks = 0;
    const post = () => {
      waiting = true;
      tasks.push(() => {
        waiting = false;
        chunks += 1;
        if (chunks < 6) post();
      });
    };
    post();

    let worst = 0;
    let cueTasksBeforeCommit = 0;
    for (let step = 0; step < 20_000 && (chunks < 6 || cueStats.synthesised < before + CUE_NAMES.length); step++) {
      const task = tasks.shift();
      if (!task) {
        await flush();
        continue;
      }
      const wasWaiting = waiting;
      const t0 = t;
      task();
      await flush();
      // Cue work done in this one task while a render task was already queued, in budget ms.
      if (wasWaiting && waiting) worst = Math.max(worst, t - t0);
      if (chunks < 6 && t > t0) cueTasksBeforeCommit += 1;
    }
    vi.unstubAllGlobals();
    // The render reached its commit, taking turns with the cue work: at most one slice (its 8 ms
    // budget plus the step that crosses it) ever ran ahead of a waiting render task.
    expect(chunks).toBe(6);
    expect(cueTasksBeforeCommit).toBeGreaterThanOrEqual(3);
    expect(worst).toBeGreaterThan(0);
    expect(worst).toBeLessThanOrEqual(SLICE_MS + 1);
    expect(cueStats.synthesised).toBe(before + CUE_NAMES.length);
    expect(yields).not.toHaveBeenCalled();
    forgetCues(8000);
  });
});
