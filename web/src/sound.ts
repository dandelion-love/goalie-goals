// Playing the cues in the session player (story #79): one AudioContext, unlocked by the Start
// tap, a mute remembered on the device, and the moment each state change marks.
//
// No tap ever makes the context (story 103): making one is a long task (~100 ms for the first
// in a browser process). It is made on idle once the keeper's home is up, forced after
// PRIME_TIMEOUT_MS if the page never settles. A Start tap that comes earlier only marks sound as
// wanted, and the player makes the context after its first paint. Such a context is not unlocked
// by a tap on the iPad, so it stays silent (the first cues are skipped) until the next tap in the
// player resumes it. "Something hurts" and Stop never make or resume the context.
//
// Sound is never the only signal: every cue fires on a change the screen also shows, and if
// the iPad blocks audio the session runs exactly the same without it.
//
// No cue is synthesised as it plays (story #97). `warm()` (once the keeper's home or the player
// is up and the page is idle, story #98; and again in the unlocking tap) computes every cue's
// samples once, in short slices that yield to the page. The parent's phone never warms them.
// Once a context exists, each cue becomes an AudioBuffer as soon as its samples are ready, and
// playing a cue only starts a buffer source on it. A cue whose buffer is not ready yet, or whose
// render failed, is skipped: the screen still shows the moment, and the next cue plays as normal.

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CUE_NAMES, CUE_RATE, bufferOf, prepareCues, schedule, yieldToPage, type CueName } from './cues';
import type { PlayerState } from './player';
import { afterPaint } from './defer';

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
  /** Start computing the cues, in slices (safe to call any time, and more than once). */
  warm(): void;
  /**
   * Make the context ahead of the Start tap (story #98 AC5), suspended and silent: making one
   * is a long task, so the tap that unlocks it only resumes it. Safe to call more than once.
   */
  prime(): void;
  /**
   * Call from a tap handler only: resumes the context `prime` made, which unlocks sound on the
   * iPad. It never makes one (story 103): with no context yet, it only marks sound as wanted.
   */
  unlock(): void;
  /** Play a cue now. False when sound is not unlocked, is blocked, the cue is not ready, or failed: the screen carries on alone. */
  play(name: CueName): boolean;
  readonly unlocked: boolean;
  /** Whether the cue's buffer is ready to play on the current context. */
  ready(name: CueName): boolean;
}

/** Each cue's samples, as a promise per cue (`prepareCues`); called more than once, it returns the same promises. */
export type CuePreparer = () => Record<CueName, Promise<Float32Array>>;

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

export function createSoundEngine(
  make: () => AudioContext | null = defaultContext,
  now: () => number = () => Date.now(),
  prepare: CuePreparer = () => prepareCues(CUE_RATE),
  rate: number = CUE_RATE,
): SoundEngine {
  let ctx: AudioContext | null = null;
  let unlockedAt: number | null = null;
  // A tap asked for sound before the context existed (story 103): a context made later plays
  // once the browser runs it (a desktop browser that remembers the tap), and stays silent while
  // it is suspended (the iPad), until a tap resumes it.
  let wanted = false;
  // Samples already computed, so the unlocking tap can make their buffers at once.
  const settled = new Map<CueName, Float32Array>();
  let watching = false;
  const prepared = () => {
    const pending = prepare();
    if (!watching) {
      watching = true;
      for (const name of CUE_NAMES) pending[name].then((data) => settled.set(name, data), () => {});
    }
    return pending;
  };
  // The buffers made on the current context: one per cue, made once.
  let buffers = new Map<CueName, AudioBuffer>();
  const load = (c: AudioContext) => {
    const own = new Map<CueName, AudioBuffer>();
    buffers = own;
    const make = (name: CueName, data: Float32Array) => {
      // A context made since (the old one was closed) loads its own.
      if (ctx !== c || own.has(name)) return;
      try {
        own.set(name, bufferOf(c, data, rate));
      } catch {
        // No buffer: this cue is skipped.
      }
    };
    const pending = prepared();
    // In the tap, only the cue it plays: the other ready ones follow, one small task each.
    const later: CueName[] = [];
    for (const name of CUE_NAMES) {
      const ready = settled.get(name);
      if (ready) {
        if (name === 'start') make(name, ready);
        else later.push(name);
        continue;
      }
      pending[name].then(
        (data) => make(name, data),
        () => {
          // The render failed: this cue is skipped; the rest play.
        },
      );
    }
    void (async () => {
      for (const name of later) {
        await yieldToPage();
        make(name, settled.get(name)!);
      }
    })();
  };
  const resume = (c: AudioContext) => {
    try {
      void c.resume().catch(() => {});
    } catch {
      // Blocked: cues stay silent.
    }
  };
  // The context, made once (again only if it was closed), with its buffers loading.
  const open = () => {
    if (ctx && ctx.state !== 'closed') return;
    ctx = make();
    // Assigned first: `load` checks its buffers belong to the current context.
    if (ctx) load(ctx);
  };
  return {
    get unlocked() {
      return unlockedAt !== null;
    },
    ready(name) {
      return buffers.has(name);
    },
    warm() {
      prepared();
    },
    prime() {
      open();
    },
    unlock() {
      // Already unlocked and playing: a tap has nothing to do (the player calls this on every tap).
      if (unlockedAt !== null && ctx?.state === 'running') return;
      // No context yet (or it was closed): never make one in a tap, it would hold the tap's frame.
      if (!ctx || ctx.state === 'closed') {
        wanted = true;
        return;
      }
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
      if (!ctx || ctx.state === 'closed') return false;
      // Never resumed here (story 103): only `unlock`, in a tap, resumes the context, so a cue
      // played in the Stop or "Something hurts" tap does no more than start a source.
      if (ctx.state !== 'running') {
        // Within the grace period the resume asked for in the unlocking tap may still be settling.
        // Past it, or with no unlocking tap at all, a suspended context means sound is blocked (or
        // the app was hidden): skip the cue rather than play it late, out of step with the screen.
        if (unlockedAt === null || now() - unlockedAt > RESUME_GRACE_MS) return false;
      } else if (unlockedAt === null && !wanted) {
        // Primed ahead of any tap: nothing plays before the Start tap.
        return false;
      }
      const buffer = buffers.get(name);
      // Not ready yet (or its render failed): skip it rather than compute it now.
      if (!buffer) return false;
      try {
        schedule(ctx, buffer);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** The app's one engine. */
export const sound = createSoundEngine();

/**
 * Where there is no idle callback (Safari on the iPad), wait this long after mount so the
 * first paint and any early tap come before the long, unsplittable context creation.
 */
export const WARM_FALLBACK_MS = 1000;

/** An idle period this long (of the browser's 50 ms at most) means nothing else is due. */
const FULL_IDLE_MS = 40;

/**
 * A page that never settles still gets its context this long after the home appears (story
 * 103), so the Start tap finds one to resume rather than making it.
 */
export const PRIME_TIMEOUT_MS = 2000;

/**
 * Warm the cues once the page is idle (story #98 AC4): only where they will play, the keeper's
 * home and the session player. The parent's phone never computes them. `warm()` returns the
 * same work when called again, so a remount costs nothing. Returns a cancel for an unmount.
 *
 * The audio context is made here too (`prime`, story #98 AC5), suspended, so the Start tap
 * only resumes it: making one is a long task that would otherwise delay the tap's response.
 */
export function warmWhenIdle(engine: SoundEngine = sound): () => void {
  const w = globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: (deadline?: IdleDeadline) => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const run = () => {
    engine.warm();
    engine.prime();
  };
  const { requestIdleCallback: whenIdle, cancelIdleCallback: cancel } = w;
  if (whenIdle && cancel) {
    // Making the context is one task that can't be split (story 101): it waits for a whole idle
    // period, with nothing else due, so an early tap is not held behind it. A page that is never
    // idle gets it PRIME_TIMEOUT_MS after mount (story 103), never in the Start tap.
    let id = 0;
    const started = Date.now();
    const ask = () => {
      const timeout = Math.max(1, PRIME_TIMEOUT_MS - (Date.now() - started));
      id = whenIdle(
        (deadline) => {
          if (deadline && !deadline.didTimeout && deadline.timeRemaining() < FULL_IDLE_MS) ask();
          else run();
        },
        { timeout },
      );
    };
    ask();
    return () => cancel(id);
  }
  const id = setTimeout(run, WARM_FALLBACK_MS);
  return () => clearTimeout(id);
}

/** Warm the cues when the keeper's home or the player mounts (see `warmWhenIdle`). */
export function useWarmCues(engine: SoundEngine = sound): void {
  useEffect(() => warmWhenIdle(engine), [engine]);
}

/** The cue player for the components inside the session player (the countdown's ticks and pause). */
export const CueContext = createContext<(name: CueName) => void>(() => {});
export const useCue = () => useContext(CueContext);

/** The player's sound: the mute switch (remembered on the device) and a cue function that honours it. */
export function usePlayerSound(engine: SoundEngine = sound) {
  useWarmCues(engine);
  // A Start tap before the context existed (story 103 AC2): make it after the player's first
  // paint, never in the tap. The first cues are skipped if it isn't ready; the next tap in the
  // player resumes it. Nothing to do when the home already made it.
  useEffect(() => {
    let live = true;
    afterPaint(
      () => {
        if (live) engine.prime();
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [engine]);
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
 * session done, and a safety stop (on the Stop tap, or "Something hurts"). Changing move or side
 * plays "switch".
 */
export function cueForChange(prev: PlayerState | null, next: PlayerState): CueName | null {
  if (!prev) return next.outcome ? null : 'start';
  if (prev.outcome) return null;
  // Stop (story #77): the safety cue plays on the tap, as the set ends. The stop screen and its
  // Resume window are silent: Resume carries on without a start cue, and the window closing
  // plays nothing more. "Something hurts" from the stop screen is a new stop and plays again.
  if (next.stopping && !prev.stopping) return 'safety';
  if (prev.stopping) return next.outcome === 'hurt' ? 'safety' : null;
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
