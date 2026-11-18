import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { sound } from './sound';
import { cueStats } from './cues';
import { keeperServer, todayWith } from './session.fixture';
import type { WakeLockController } from './wakeLock';

// Story 103: a quick Start, before the idle prime made the audio context. In its own file so the
// app's one sound engine starts fresh: no context, and no cue work begun by another test.

const wake: WakeLockController = {
  status: 'active',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

/** An iPad's AudioContext: made suspended, running once resumed. */
function fakeAudio() {
  const fake = {
    state: 'suspended' as AudioContextState,
    sampleRate: 48000,
    currentTime: 0,
    destination: {},
    started: [] as { length: number }[],
    resumes: 0,
    resume() {
      fake.resumes += 1;
      fake.state = 'running';
      return Promise.resolve();
    },
    createBuffer: (_c: number, length: number) => ({ length, getChannelData: () => new Float32Array(length) }),
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

/** A busy page: only short idle periods, never a full one, and the 2 s timeout not reached yet: no prime. */
function shortIdlePeriodsOnly() {
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let next = 1;
  vi.stubGlobal('requestIdleCallback', (cb: (d: IdleDeadline) => void) => {
    const id = next++;
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        cb({ didTimeout: false, timeRemaining: () => 5 } as IdleDeadline);
      }, 10),
    );
    return id;
  });
  vi.stubGlobal('cancelIdleCallback', (id: number) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('a quick Start, before the idle prime made the audio context (story 103)', () => {
  it('makes the context in the Start tap, resumes it, and plays the start cue; the next tap makes none', async () => {
    shortIdlePeriodsOnly();
    const made: ReturnType<typeof fakeAudio>[] = [];
    vi.stubGlobal('AudioContext', function FakeAudioContext() {
      const audio = fakeAudio();
      made.push(audio);
      return audio;
    } as unknown as typeof AudioContext);
    const plays = vi.spyOn(sound, 'play');
    render(<App fetchImpl={keeperServer(todayWith()).fetchImpl} wakeLock={wake} />);
    const start = await screen.findByRole('button', { name: 'Start session' });
    // The start cue's samples are ready (a quick Start before they are plays its cue a moment
    // later: the engine tests cover that, with a controlled clock).
    sound.warm();
    await vi.waitFor(() => expect(cueStats.synthesised).toBeGreaterThan(0), { timeout: 10_000 });
    // The full idle period never came: no context yet.
    expect(made).toHaveLength(0);

    fireEvent.pointerDown(start);
    fireEvent.click(start);
    // Made in the tap itself, and resumed there: a gesture, so the iPad unlocks it.
    expect(made).toHaveLength(1);
    expect(made[0].resumes).toBe(1);
    await screen.findByRole('region', { name: 'Session player' });
    // The start cue plays: the silent unlock buffer, then the cue.
    expect(plays.mock.calls.map((c) => c[0])).toEqual(['start']);
    expect(plays.mock.results[0].value).toBe(true);
    expect(made[0].started).toHaveLength(2);
    expect(made[0].started[1].length).toBeGreaterThan(1);

    // Another tap in the player only uses the context there is: none made.
    await vi.waitFor(() => expect(sound.ready('switch')).toBe(true), { timeout: 10_000 });
    const next = screen.getByRole('button', { name: 'Next' });
    fireEvent.pointerDown(next);
    fireEvent.click(next);
    await vi.waitFor(() => expect(plays.mock.calls.length).toBeGreaterThan(1));
    expect(plays.mock.calls.at(-1)![0]).toBe('switch');
    expect(plays.mock.results.at(-1)!.value).toBe(true);
    expect(made).toHaveLength(1);
  }, 30_000);
});
