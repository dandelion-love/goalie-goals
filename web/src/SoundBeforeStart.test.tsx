import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { sound } from './sound';
import { keeperServer, todayWith } from './session.fixture';
import type { WakeLockController } from './wakeLock';

// Story 103 AC2, in its own file so the app's one sound engine starts fresh: no context, and
// no cue work begun by another test.

const wake: WakeLockController = {
  status: 'active',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

/** An iPad's AudioContext: made suspended, running only once a tap resumes it. */
function fakeAudio() {
  const fake = {
    state: 'suspended' as AudioContextState,
    sampleRate: 48000,
    currentTime: 0,
    destination: {},
    started: [] as unknown[],
    resumes: 0,
    resume() {
      fake.resumes += 1;
      fake.state = 'running';
      return Promise.resolve();
    },
    createBuffer: (_c: number, length: number) => ({ length, getChannelData: () => new Float32Array(length) }),
    createBufferSource() {
      const src = {
        buffer: null as unknown,
        connect() {},
        start() {
          fake.started.push(src.buffer);
        },
      };
      return src;
    },
  };
  return fake;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('an early Start, before the audio context exists (story 103 AC2)', () => {
  it('an early Start makes no context in the tap; the player makes it after its paint, and the next tap resumes it (AC2)', async () => {
    // A page that never goes idle, on an iPad: a context made outside a tap stays suspended.
    vi.stubGlobal('requestIdleCallback', () => 1);
    vi.stubGlobal('cancelIdleCallback', () => {});
    const made: ReturnType<typeof fakeAudio>[] = [];
    vi.stubGlobal('AudioContext', function FakeAudioContext() {
      const audio = fakeAudio();
      made.push(audio);
      return audio;
    } as unknown as typeof AudioContext);
    const plays = vi.spyOn(sound, 'play');
    render(<App fetchImpl={keeperServer(todayWith()).fetchImpl} wakeLock={wake} />);
    const start = await screen.findByRole('button', { name: 'Start session' });

    fireEvent.pointerDown(start);
    fireEvent.click(start);
    await screen.findByRole('region', { name: 'Session player' });
    // Nothing made in the tap, and the start cue was skipped rather than waited for.
    expect(made).toHaveLength(0);
    expect(plays.mock.calls.map((c) => c[0])).toEqual(['start']);
    expect(plays.mock.results[0].value).toBe(false);

    // After the player's first paint: made, still suspended, never resumed outside a tap.
    await vi.waitFor(() => expect(made).toHaveLength(1));
    expect(made[0].state).toBe('suspended');
    expect(made[0].resumes).toBe(0);
    await vi.waitFor(() => expect(sound.ready('switch')).toBe(true), { timeout: 10_000 });
    expect(made[0].started).toHaveLength(0);

    // The next tap in the player resumes it, and its cue plays as normal.
    const next = screen.getByRole('button', { name: 'Next' });
    fireEvent.pointerDown(next);
    expect(made[0].resumes).toBe(1);
    fireEvent.click(next);
    await vi.waitFor(() => expect(plays.mock.calls.length).toBeGreaterThan(1));
    expect(plays.mock.calls.at(-1)![0]).toBe('switch');
    expect(plays.mock.results.at(-1)!.value).toBe(true);
    expect(made).toHaveLength(1);
    // The silent unlock buffer, then the switch cue.
    expect(made[0].started).toHaveLength(2);
  }, 20_000);
});
