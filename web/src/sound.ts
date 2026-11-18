// Playing the cues in the session player (story #79): one AudioContext, unlocked by the Start
// tap, a mute remembered on the device, and the moment each state change marks.
//
// The context is made ahead of the Start tap where it can be (story 103): making one is a long
// task (~100 ms for the first in a browser process) that can't be split. On the keeper's home it
// is made right after the home's first paint (story 107), while today's panel is still loading
// and before Start or an early "Something hurts" tap can come; the Start tap then only resumes
// it. A Start tap that comes before that makes it in the tap itself, the only tap that may: a
// context made in a tap is unlocked on the iPad, so the session-start cue plays.
// Every other tap in the player only resumes it, and "Something hurts" and Stop never make or
// resume it.
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
import { CUE_NAMES, CUE_RATE, bufferOf, prepareCue, prepareCues, schedule, yieldBriefly, yieldToPage, type CueName } from './cues';
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

/**
 * A quick Start can come before the start cue's samples are computed (story 103). Its cue then
 * plays as soon as they are, if that is within this long of the cue's moment (inside the rubric's
 * +125 ms sync window); later, it is skipped like every other cue.
 */
export const START_CUE_LATE_MS = 120;

export interface SoundEngine {
  /** Start computing the cues, in slices (safe to call any time, and more than once). */
  warm(): void;
  /**
   * Start computing the start cue alone, in slices, ahead of the rest (story 103): a quick Start
   * then finds it ready. Safe to call any time, and more than once.
   */
  warmStart(): void;
  /**
   * Make the context ahead of the Start tap (story #98 AC5), suspended and silent: making one
   * is a long task, so the tap that unlocks it only resumes it. Safe to call more than once.
   */
  prime(): void;
  /**
   * Make the context alone, suspended and silent (story 107): `prime` without loading the cues'
   * buffers, which `warm` or the next tap does. Safe to call more than once.
   */
  primeContext(): void;
  /**
   * Call from a tap handler only: resumes the context `prime` made, which unlocks sound on the
   * iPad. It never makes one (story 103): with no context yet, it only marks sound as wanted.
   */
  unlock(): void;
  /**
   * The Start tap only (story 103): `unlock`, making the context first if `prime` has not yet. The
   * one tap that may make it, so a quick Start still unlocks sound and plays the start cue.
   */
  unlockForStart(): void;
  /** Play a cue now. False when sound is not unlocked, is blocked, the cue is not ready, or failed: the screen carries on alone. */
  play(name: CueName): boolean;
  readonly unlocked: boolean;
  /** Whether the cue's buffer is ready to play on the current context. */
  ready(name: CueName): boolean;
}

/** Each cue's samples, as a promise per cue (`prepareCues`); called more than once, it returns the same promises. */
export type CuePreparer = () => Record<CueName, Promise<Float32Array>>;

/**
 * The start cue's samples alone (`prepareCue`), yielding with `pause` between slices; shares its
 * work with the `CuePreparer`.
 */
export type StartCuePreparer = (pause: () => Promise<void>) => Promise<Float32Array>;

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
  prepareStart: StartCuePreparer = (pause) => prepareCue('start', CUE_RATE, { pause }),
): SoundEngine {
  let ctx: AudioContext | null = null;
  let unlockedAt: number | null = null;
  // A tap asked for sound before the context existed (story 103): a context made later plays
  // once the browser runs it (a desktop browser that remembers the tap), and stays silent while
  // it is suspended (the iPad), until a tap resumes it.
  let wanted = false;
  // When the start cue was due but its buffer was not ready yet (a quick Start).
  let startDueAt: number | null = null;
  // Set by the Start tap: from then on cue work never competes with the player's render.
  let started = false;
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
        return;
      }
      // The start cue was due before its samples were ready: play it now if still close to its
      // moment, else skip it.
      if (name === 'start' && startDueAt !== null) {
        const late = now() - startDueAt;
        startDueAt = null;
        if (late <= START_CUE_LATE_MS) play('start');
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
  // The context whose buffers are loading.
  let loadedFor: AudioContext | null = null;
  // The current context's buffers, loading once. Loading asks for every cue's samples, so a
  // context made alone (`primeContext`, story 107: right after the home's first paint) waits for
  // `warm` or a tap: making it never starts the cues' work early, where the home's first taps land.
  const loadOnce = () => {
    if (!ctx || ctx.state === 'closed' || loadedFor === ctx) return;
    loadedFor = ctx;
    load(ctx);
  };
  // The context, made once (again only if it was closed). Assigned before `loadOnce`: `load`
  // checks its buffers belong to the current context.
  const open = () => {
    if (ctx && ctx.state !== 'closed') return;
    ctx = make();
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
      // A context made alone loads its buffers now.
      loadOnce();
    },
    warmStart() {
      // On the home, the start cue's slices take their turn with the page's own tasks, so it is
      // ready for a quick Start; once Start is tapped, they wait behind the player's render.
      prepareStart(() => (started ? yieldToPage() : yieldBriefly())).then(
        (data) => {
          if (!settled.has('start')) settled.set('start', data);
        },
        () => {
          // Left to `warm`: the start cue is tried again with the rest.
        },
      );
    },
    prime() {
      open();
      loadOnce();
    },
    primeContext() {
      open();
    },
    unlock,
    unlockForStart() {
      started = true;
      if (!ctx || ctx.state === 'closed') open();
      // In the tap: the start cue's buffer, if its samples are ready; the rest follow.
      loadOnce();
      unlock();
    },
    play,
  };
  function unlock() {
    // Already unlocked and playing: a tap has nothing to do (the player calls this on every tap).
    if (unlockedAt !== null && ctx?.state === 'running') return;
    // No context yet (or it was closed): never made here, it would hold the tap's frame. Only the
    // Start tap makes one (`unlockForStart`).
    if (!ctx || ctx.state === 'closed') {
      wanted = true;
      return;
    }
    loadOnce();
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
  }
  function play(name: CueName): boolean {
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
    if (!buffer) {
      // Not ready yet (or its render failed): skip it rather than compute it now. The start
      // cue alone may follow a moment later, once its samples are ready (a quick Start).
      if (name === 'start') startDueAt = now();
      return false;
    }
    try {
      schedule(ctx, buffer);
      return true;
    } catch {
      return false;
    }
  }
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
 * 103), so the Start tap finds one to resume rather than making it. The keeper's home now makes
 * it right after its first paint instead (story 107); this applies where that is not asked for.
 */
export const PRIME_TIMEOUT_MS = 2000;

export interface WarmOptions {
  /**
   * Make the audio context right after the first paint (story 107), in a task of its own, rather
   * than on idle; alone (`primeContext`): its buffers load with the cues, on idle. The keeper's home asks for it: its first paint comes while today's panel is still
   * loading, before Start shows, so the context's long task is over before the earliest tap. On
   * idle it landed 0.4 to 0.85 s after the home appeared, where an early "Something hurts" lands.
   * A function is asked when that task runs, and the context is made only if it says yes: the
   * home says no once it is paused, so a "Something hurts" tap even quicker than the prime is
   * never followed by a context (story 103 AC3).
   */
  primeAfterPaint?: boolean | (() => boolean);
}

/**
 * Warm the cues once the page is idle (story #98 AC4): only where they will play, the keeper's
 * home and the session player. The parent's phone never computes them. `warm()` returns the
 * same work when called again, so a remount costs nothing. Returns a cancel for an unmount.
 *
 * The audio context is made here too (`prime`, story #98 AC5), suspended, so the Start tap
 * only resumes it: making one is a long task that would otherwise delay the tap's response.
 * With `primeAfterPaint` it is made after the first paint instead, and idle only warms the cues.
 */
export function warmWhenIdle(engine: SoundEngine = sound, options: WarmOptions = {}): () => void {
  const w = globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: (deadline?: IdleDeadline) => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  // A context made after the paint is not made again on idle (story 107): that would only make a
  // new one if it had been closed, a long task with no tap to unlock it, right where a later tap
  // (or the pain report's idle warm-up) may come. `warm` loads its buffers.
  const run = () => {
    engine.warm();
    if (!options.primeAfterPaint) engine.prime();
  };
  // The start cue first, right after the first paint and ahead of the idle queue (story 103), in
  // short slices: a quick Start finds it ready. The rest wait for idle, with the context, unless
  // the context is asked for after the paint (story 107): then it follows in a task of its own.
  let live = true;
  let primeId: ReturnType<typeof setTimeout> | undefined;
  afterPaint(
    () => {
      if (!live) return;
      engine.warmStart();
      const { primeAfterPaint } = options;
      if (primeAfterPaint)
        primeId = setTimeout(() => {
          if (live && (primeAfterPaint === true || primeAfterPaint())) engine.primeContext();
        }, 0);
    },
    () => {},
  );
  const { requestIdleCallback: whenIdle, cancelIdleCallback: cancel } = w;
  if (whenIdle && cancel) {
    // Making the context is one task that can't be split (story 101): it waits for a whole idle
    // period, with nothing else due, so an early tap is not held behind it. A page that is never
    // idle gets it PRIME_TIMEOUT_MS after mount (story 103); only a Start before then makes it.
    // The cues are not started in a short idle period: their slices would keep the page from ever
    // having a full one, and so hold the context back to the timeout.
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
    return () => {
      live = false;
      clearTimeout(primeId);
      cancel(id);
    };
  }
  const id = setTimeout(run, WARM_FALLBACK_MS);
  return () => {
    live = false;
    clearTimeout(primeId);
    clearTimeout(id);
  };
}

/** Warm the cues when the keeper's home or the player mounts (see `warmWhenIdle`). */
export function useWarmCues(engine: SoundEngine = sound, options: WarmOptions = {}): void {
  const { primeAfterPaint = false } = options;
  // Pass a function that keeps its identity (useCallback): a new one would warm again.
  useEffect(() => warmWhenIdle(engine, { primeAfterPaint }), [engine, primeAfterPaint]);
}

/** The cue player for the components inside the session player (the countdown's ticks and pause). */
export const CueContext = createContext<(name: CueName) => void>(() => {});
export const useCue = () => useContext(CueContext);

/** The player's sound: the mute switch (remembered on the device) and a cue function that honours it. */
export function usePlayerSound(engine: SoundEngine = sound) {
  useWarmCues(engine);
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
