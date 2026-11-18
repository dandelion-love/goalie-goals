// Playing the cues in the session player (story #79): one AudioContext, unlocked by the Start
// tap, a mute remembered on the device, and the moment each state change marks.
//
// Sound is never the only signal: every cue fires on a change the screen also shows, and if
// the iPad blocks audio the session runs exactly the same without it.

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { render, type CueName } from './cues';
import type { PlayerState } from './player';

export const MUTE_KEY = 'goalie-goals.sound-muted';

export function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // No storage (a private window): the setting lasts for this visit only.
  }
}

/** A resume asked for in the unlocking tap may still be settling when the first cue is due. */
const RESUME_GRACE_MS = 1000;

export interface SoundEngine {
  /** Call from a tap handler only: creates or resumes the context, which unlocks sound on the iPad. */
  unlock(): void;
  /** Play a cue now. False when sound is not unlocked, is blocked, or failed: the screen carries on alone. */
  play(name: CueName): boolean;
  readonly unlocked: boolean;
}

type AudioContextClass = new () => AudioContext;

function defaultContext(): AudioContext | null {
  const w = globalThis as typeof globalThis & { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export function createSoundEngine(make: () => AudioContext | null = defaultContext, now: () => number = () => Date.now()): SoundEngine {
  let ctx: AudioContext | null = null;
  let unlockedAt: number | null = null;
  const resume = (c: AudioContext) => {
    try {
      void c.resume().catch(() => {});
    } catch {
      // Blocked: cues stay silent.
    }
  };
  return {
    get unlocked() {
      return unlockedAt !== null;
    },
    unlock() {
      if (!ctx || ctx.state === 'closed') ctx = make();
      if (!ctx) return;
      unlockedAt = now();
      if (ctx.state !== 'running') resume(ctx);
      try {
        // A one-frame silent buffer, played inside the tap, completes the unlock on iPadOS.
        const silent = ctx.createBufferSource();
        silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        silent.connect(ctx.destination);
        silent.start(0);
      } catch {
        // Nothing else to do: the screen carries every cue.
      }
    },
    play(name) {
      if (!ctx || unlockedAt === null || ctx.state === 'closed') return false;
      if (ctx.state !== 'running') {
        resume(ctx);
        // Past the grace period a suspended context means sound is blocked (or the app was
        // hidden): skip the cue rather than play it late, out of step with the screen.
        if (now() - unlockedAt > RESUME_GRACE_MS) return false;
      }
      try {
        render(ctx, name);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** The app's one engine. */
export const sound = createSoundEngine();

/** The cue player for the components inside the session player (the countdown's ticks and pause). */
export const CueContext = createContext<(name: CueName) => void>(() => {});
export const useCue = () => useContext(CueContext);

/** The player's sound: the mute switch (remembered on the device) and a cue function that honours it. */
export function usePlayerSound(engine: SoundEngine = sound) {
  const [muted, setMutedState] = useState(readMuted);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const setMuted = useCallback(
    (m: boolean) => {
      mutedRef.current = m;
      setMutedState(m);
      writeMuted(m);
      // Turning sound on is a tap, so it can also unlock audio.
      if (!m) engine.unlock();
    },
    [engine],
  );
  const cue = useCallback(
    (name: CueName) => {
      if (!mutedRef.current) engine.play(name);
    },
    [engine],
  );
  return { muted, setMuted, cue, unlock: engine.unlock };
}

/**
 * The cue a player state change marks, or null. The rubric's seven moments: session start,
 * set start, set end, rest start, the last three seconds of rest (the countdown plays those),
 * session done, and a safety stop. Changing move or side plays "switch".
 */
export function cueForChange(prev: PlayerState | null, next: PlayerState): CueName | null {
  if (!prev) return next.outcome ? null : 'start';
  if (prev.outcome) return null;
  if (next.outcome) return next.outcome === 'done' ? 'done' : 'safety';
  const a = prev.phase;
  const b = next.phase;
  if (b.kind === 'feedback' && a.kind === 'work') return 'setDone';
  if (next.step !== prev.step) return 'switch';
  if (a.kind === 'move' && b.kind === 'move') return a.index !== b.index ? 'switch' : null;
  if (a.kind === 'work' && b.kind === 'work') return a.side !== b.side ? 'switch' : null;
  if (b.kind === 'work' && (a.kind === 'ready' || a.kind === 'rest')) return 'go';
  if (b.kind === 'rest' && a.kind !== 'rest') return 'rest';
  return null;
}

/**
 * Play the cue for each change of player state, in the same commit as the screen change (a
 * layout effect runs right after React writes the DOM, before the browser paints).
 */
export function useStateCues(state: PlayerState, cue: (name: CueName) => void): void {
  const prev = useRef<PlayerState | null>(null);
  useLayoutEffect(() => {
    if (prev.current === state) return;
    const name = cueForChange(prev.current, state);
    prev.current = state;
    if (name) cue(name);
  }, [state, cue]);
}
