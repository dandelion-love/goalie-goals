// Sound cues for the session's moments, synthesised in the browser: no audio files, so no
// licence to check and nothing to precache (story #79).
//
// Each cue is a few sine partials under an attack-and-decay envelope, computed into an
// AudioBuffer and played as an AudioBufferSourceNode. `render(ctx, name)` does that on any
// BaseAudioContext: it is the quality rubric's Script K entry, and it schedules the same
// samples, through the same `schedule()`, that the app plays, so what is measured is what plays.
// A buffer source (rather than OscillatorNodes) is also what the rubric's sound probe
// (Script E) logs, so SO1 and SO3 can see every cue.
//
// Synthesis is a JS loop (about 0.45 s for "done" on a fast machine), so the app never runs it
// in one go (story #97): `prepareCues()` computes every cue once, in slices of a few
// milliseconds that yield to the page between them, and caches the samples. The sound engine
// turns each into an AudioBuffer once, after the unlocking tap, and a cue then only starts a
// buffer source. The sliced and the one-go paths run the same steps, so the samples are equal.
//
// Every tone here is original and generic (a beep, a blip, a rising major third, a soft
// low strike). None copies or imitates another app's sounds or jingles.
//
// Levels (docs/knowledge/cc0-media/sound-format.md): three tiers, functional loudest, then
// celebration, then calm, at the format's targets (-16, -18 and -22), with RMS over the
// trimmed cue standing in for LUFS. Every peak stays under -3 dBFS, a 1 dB margin under the
// -2 dBTP ceiling. The rubric's SO2 checks each cue against its own tier's target, so the
// calm cues are both quieter and softer than the success cues.

export type CueName = 'start' | 'go' | 'tick' | 'switch' | 'setDone' | 'rest' | 'done' | 'safety' | 'pause';
export type Tier = 'functional' | 'celebration' | 'calm';

/** One note: sine partials (frequency multiple, relative amplitude) under an envelope. */
export interface Note {
  /** Start, in seconds from the cue's start. */
  at: number;
  /** Fundamental, Hz. */
  hz: number;
  /** Length, in seconds; the note fades to silence by its end. */
  len: number;
  /** Rise time to full level, in seconds. */
  attack: number;
  /** Exponential decay time constant after the attack, in seconds. */
  decay: number;
  partials: ReadonlyArray<readonly [multiple: number, amplitude: number]>;
  gain?: number;
}

export interface CueSpec {
  /** The session moment it marks, in words. */
  moment: string;
  tier: Tier;
  notes: readonly Note[];
}

/** Target RMS per tier, dBFS, over the cue with leading and trailing silence trimmed (as Script K does). */
export const TIER_RMS_DB: Record<Tier, number> = { functional: -16, celebration: -18, calm: -22 };
/** No sample above this, dBFS. */
export const PEAK_CEILING_DB = -3;
/** Longest cue per tier, seconds (sound-format.md: 1 s functional, 2.5 s rest and safety stop, 4 s session done). */
export const MAX_SECONDS: Record<Tier, number> = { functional: 1, celebration: 4, calm: 2.5 };

const BRIGHT = [[1, 1], [2, 0.3], [3, 0.12]] as const;
const BELL = [[1, 1], [2, 0.4], [3, 0.15], [4.2, 0.06]] as const;
const SOFT = [[1, 1], [2, 0.12]] as const;

export const CUES: Record<CueName, CueSpec> = {
  // Functional: short, clear attack, bright enough to carry across a room.
  start: {
    moment: 'session start',
    tier: 'functional',
    notes: [
      { at: 0, hz: 784, len: 0.16, attack: 0.005, decay: 0.25, partials: BRIGHT },
      { at: 0.18, hz: 1175, len: 0.26, attack: 0.005, decay: 0.25, partials: BRIGHT },
    ],
  },
  go: {
    moment: 'set start',
    tier: 'functional',
    notes: [{ at: 0, hz: 1047, len: 0.42, attack: 0.004, decay: 0.3, partials: [[1, 1], [1.5, 0.5], [2, 0.25]] }],
  },
  tick: {
    moment: 'last three seconds of rest (one per second)',
    tier: 'functional',
    notes: [{ at: 0, hz: 880, len: 0.12, attack: 0.003, decay: 0.09, partials: [[1, 1], [2, 0.25]] }],
  },
  switch: {
    moment: 'switch side or move',
    tier: 'functional',
    notes: [
      { at: 0, hz: 1319, len: 0.1, attack: 0.003, decay: 0.08, partials: BRIGHT },
      { at: 0.14, hz: 1319, len: 0.1, attack: 0.003, decay: 0.08, partials: BRIGHT },
    ],
  },
  setDone: {
    moment: 'set end',
    tier: 'functional',
    notes: [
      { at: 0, hz: 1047, len: 0.3, attack: 0.004, decay: 0.15, partials: [[1, 1], [4, 0.15]] },
      { at: 0.12, hz: 1319, len: 0.45, attack: 0.004, decay: 0.18, partials: [[1, 1], [4, 0.15]] },
    ],
  },
  // Celebration: a little longer and warmer, never louder than the functional cues.
  done: {
    moment: 'session done',
    tier: 'celebration',
    notes: [
      { at: 0, hz: 523, len: 0.5, attack: 0.006, decay: 0.3, partials: BELL },
      { at: 0.12, hz: 659, len: 0.5, attack: 0.006, decay: 0.3, partials: BELL },
      { at: 0.24, hz: 784, len: 0.5, attack: 0.006, decay: 0.3, partials: BELL },
      { at: 0.4, hz: 1047, len: 1.9, attack: 0.006, decay: 0.6, partials: BELL },
      { at: 0.4, hz: 659, len: 1.9, attack: 0.006, decay: 0.6, partials: BELL, gain: 0.5 },
      { at: 0.4, hz: 784, len: 1.9, attack: 0.006, decay: 0.6, partials: BELL, gain: 0.5 },
    ],
  },
  // Calm: low, soft attack, slow decay. No buzzer, alarm or falling "fail" tone.
  rest: {
    moment: 'rest start',
    tier: 'calm',
    notes: [
      { at: 0, hz: 440, len: 0.7, attack: 0.05, decay: 0.45, partials: SOFT },
      { at: 0.4, hz: 330, len: 1.2, attack: 0.05, decay: 0.55, partials: SOFT },
    ],
  },
  safety: {
    moment: 'safety stop or pain report',
    tier: 'calm',
    notes: [{ at: 0, hz: 196, len: 2.4, attack: 0.08, decay: 0.9, partials: [[1, 1], [2.76, 0.3], [5.4, 0.08]] }],
  },
  pause: {
    moment: 'pause',
    tier: 'calm',
    notes: [{ at: 0, hz: 294, len: 0.55, attack: 0.04, decay: 0.25, partials: SOFT }],
  },
};

export const CUE_NAMES = Object.keys(CUES) as CueName[];

/** The quality rubric's seven moments (SO1) and the cue each one plays. */
export const RUBRIC_MOMENTS = {
  'session start': 'start',
  'set start': 'go',
  'set end': 'setDone',
  'rest start': 'rest',
  'last three seconds of rest': 'tick',
  'session done': 'done',
  'safety stop or pain report': 'safety',
} as const satisfies Record<string, CueName>;

/** The cue's length in seconds, to the end of its last note. */
export function seconds(name: CueName): number {
  return Math.max(...CUES[name].notes.map((n) => n.at + n.len));
}

const FADE_IN = 0.002;
const FADE_OUT = 0.03;
/** Samples of one note between checks of the slice's time budget. */
const STEP = 1024;

/**
 * Synthesise the cue, yielding every STEP samples of a note so a caller can spread the work
 * over several tasks. Run to the end in one go, it is the plain synthesis loop.
 */
function* synthesising(spec: CueSpec, rate: number): Generator<void, Float32Array> {
  const length = Math.ceil(Math.max(...spec.notes.map((n) => n.at + n.len)) * rate);
  const out = new Float32Array(length);
  for (const n of spec.notes) {
    const first = Math.round(n.at * rate);
    const count = Math.min(length - first, Math.round(n.len * rate));
    const gain = n.gain ?? 1;
    for (let i = 0; i < count; i++) {
      const t = i / rate;
      // A smooth rise, an exponential fall, and a short fade so the note never clicks.
      const rise = t < n.attack ? Math.sin((Math.PI / 2) * (t / n.attack)) : Math.exp(-(t - n.attack) / n.decay);
      const edge = Math.min(1, t / FADE_IN, (n.len - t) / FADE_OUT);
      let v = 0;
      for (const [m, a] of n.partials) v += a * Math.sin(2 * Math.PI * n.hz * m * t);
      out[first + i] += gain * rise * Math.max(0, edge) * v;
      if (i % STEP === STEP - 1) yield;
    }
    yield;
  }
  return out;
}

/** Script K's measure: peak and RMS over the cue with samples below -60 dBFS trimmed from both ends. */
export function levels(data: ArrayLike<number> | SampleReader, floor = 0.001): Levels {
  const steps = measuring(data, floor);
  let r = steps.next();
  while (!r.done) r = steps.next();
  return r.value;
}

type Levels = { peak: number; rms: number; first: number; last: number };

/** `levels`, yielding every 8 * STEP samples so a long cue's measure never runs as one long task (story 103 AC5). */
export function* measuring(data: ArrayLike<number> | SampleReader, floor = 0.001): Generator<void, Levels> {
  const at = 'get' in data && typeof data.get === 'function' ? (i: number) => (data as SampleReader).get(i) : (i: number) => (data as ArrayLike<number>)[i];
  let first = 0;
  let last = data.length - 1;
  while (first < data.length && Math.abs(at(first)) < floor) first++;
  while (last > first && Math.abs(at(last)) < floor) last--;
  let peak = 0;
  let sum = 0;
  for (let i = first; i <= last; i++) {
    const v = at(i);
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sum += v * v;
    if ((i - first) % (8 * STEP) === 8 * STEP - 1) yield;
  }
  const n = last - first + 1;
  return { peak, rms: n > 0 ? Math.sqrt(sum / n) : 0, first, last };
}

export const toDb = (v: number) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const fromDb = (db: number) => 10 ** (db / 20);

const cache = new Map<string, Float32Array>();

/** How many times a cue has been synthesised, across rates: each cue at a rate is synthesised once. */
export const cueStats = { synthesised: 0 };

/** The cue's samples at `rate`, scaled to its tier's RMS and kept under the peak ceiling, yielding between steps. */
function* computing(name: CueName, rate: number): Generator<void, Float32Array> {
  const spec = CUES[name];
  const raw = yield* synthesising(spec, rate);
  // The trimmed span depends on the scale, so settle it in a few rounds. Each round measures the
  // samples as scaled and stored (float32), without making a scaled copy.
  let scale = 1;
  for (let round = 0; round < 4; round++) {
    const s = scale;
    const { rms } = yield* measuring({ length: raw.length, get: (i) => Math.fround(raw[i] * s) }, 0.001);
    if (rms > 0) scale *= fromDb(TIER_RMS_DB[spec.tier]) / rms;
    yield;
  }
  const peak = (yield* measuring(raw, 0.001)).peak * scale;
  if (peak > fromDb(PEAK_CEILING_DB)) scale *= fromDb(PEAK_CEILING_DB) / peak;
  yield;
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw[i] * scale;
    if (i % (8 * STEP) === 8 * STEP - 1) yield;
  }
  cueStats.synthesised += 1;
  return out;
}

/** Samples read through a function: lets `levels` measure scaled samples without a copy. */
interface SampleReader {
  readonly length: number;
  get(i: number): number;
}

const key = (name: CueName, rate: number) => `${name}@${rate}`;

/** The cue's samples at `rate`, computed in one go if not cached (the audit's path; the app uses `prepareCues`). */
export function samples(name: CueName, rate: number): Float32Array {
  const hit = cache.get(key(name, rate));
  if (hit) return hit;
  const steps = computing(name, rate);
  let r = steps.next();
  while (!r.done) r = steps.next();
  cache.set(key(name, rate), r.value);
  return r.value;
}

/** The rate the app's cue buffers are made at. Web Audio resamples a buffer to any context's rate. */
export const CUE_RATE = 48000;
/** Prepare order: the cues a session needs first come first; "done" (the longest) comes last. */
export const PREPARE_ORDER: readonly CueName[] = ['start', 'go', 'tick', 'switch', 'setDone', 'rest', 'pause', 'safety', 'done'];
/** Longest run of cue work before yielding, ms: well under the 50 ms long-task line, even on a slow device. */
export const SLICE_MS = 8;

export interface PrepareOptions {
  /** Time budget per slice, ms. */
  sliceMs?: number;
  /** Hands the main thread back to the page between slices. */
  pause?: () => Promise<void>;
  clock?: () => number;
}

type PostTask = (callback: () => void, options: { priority: 'background' | 'user-visible' }) => Promise<unknown>;

/**
 * Yield to the page for a moment: the page's tasks and frames already due go first, then the
 * work comes back in turn with them (a user-visible task where `scheduler.postTask` exists, else
 * a new task). For the start cue on the keeper's home only, before any Start tap (story 103).
 */
export function yieldBriefly(): Promise<void> {
  const s = (globalThis as { scheduler?: { postTask?: PostTask } }).scheduler;
  if (typeof s?.postTask === 'function') return s.postTask(() => {}, { priority: 'user-visible' }).then(() => {});
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Yield to the page, and come back only once the page has nothing more urgent (story 103 AC5):
 * a background-priority task where `scheduler.postTask` exists, else a new task. Never
 * `scheduler.yield()`: its continuation runs ahead of the page's own tasks, so back-to-back
 * slices of cue work held off React's render of the next screen, and the frames that paint it,
 * for over a second on a busy page.
 */
export function yieldToPage(): Promise<void> {
  const s = (globalThis as { scheduler?: { postTask?: PostTask } }).scheduler;
  if (typeof s?.postTask === 'function') return s.postTask(() => {}, { priority: 'background' }).then(() => {});
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function computeSliced(name: CueName, rate: number, o: Required<PrepareOptions>): Promise<Float32Array> {
  const hit = cache.get(key(name, rate));
  if (hit) return hit;
  // Each cue starts a fresh slice: the end of one cue and the start of the next never share one.
  await o.pause();
  const steps = computing(name, rate);
  for (;;) {
    const end = o.clock() + o.sliceMs;
    let r = steps.next();
    while (!r.done && o.clock() < end) r = steps.next();
    if (r.done) {
      // The audit may have computed it in one go meanwhile: keep one copy.
      const kept = cache.get(key(name, rate)) ?? r.value;
      cache.set(key(name, rate), kept);
      return kept;
    }
    await o.pause();
  }
}

const jobs = new Map<number, Record<CueName, Promise<Float32Array>>>();
/** Each cue's computation once begun, so `prepareCue` and `prepareCues` never compute one twice. */
const running = new Map<string, Promise<Float32Array>>();

function optionsOf(options: PrepareOptions): Required<PrepareOptions> {
  return {
    sliceMs: options.sliceMs ?? SLICE_MS,
    pause: options.pause ?? yieldToPage,
    clock: options.clock ?? (() => performance.now()),
  };
}

function computeOnce(name: CueName, rate: number, o: Required<PrepareOptions>): Promise<Float32Array> {
  const k = key(name, rate);
  let p = running.get(k);
  if (!p) {
    p = computeSliced(name, rate, o);
    // A failure can be tried again by a later call.
    p.catch(() => running.delete(k));
    running.set(k, p);
  }
  return p;
}

/**
 * Compute one cue at `rate`, in slices of at most `sliceMs` of work (story 103: the start cue,
 * ahead of the rest). `prepareCues` shares the work: the cue is computed once.
 */
export function prepareCue(name: CueName, rate: number = CUE_RATE, options: PrepareOptions = {}): Promise<Float32Array> {
  return computeOnce(name, rate, optionsOf(options));
}

/**
 * Compute every cue at `rate` once, in slices of at most `sliceMs` of work, one cue after
 * another in PREPARE_ORDER. Returns a promise per cue, which settles when that cue is ready; a
 * cue that fails rejects its own promise and the rest carry on. Calling it again returns the
 * same promises, so the work is done once.
 */
export function prepareCues(rate: number = CUE_RATE, options: PrepareOptions = {}): Record<CueName, Promise<Float32Array>> {
  const hit = jobs.get(rate);
  if (hit) return hit;
  const o = optionsOf(options);
  const out = {} as Record<CueName, Promise<Float32Array>>;
  let chain: Promise<unknown> = Promise.resolve();
  for (const name of PREPARE_ORDER) {
    const p = chain.then(() => computeOnce(name, rate, o));
    // Each caller handles its own cue's failure; this keeps a failure from going unhandled.
    p.catch(() => {});
    out[name] = p;
    chain = p.catch(() => {});
  }
  jobs.set(rate, out);
  return out;
}

/** Drop the cached samples and prepare job at `rate` (tests only: the app keeps them for the visit). */
export function forgetCues(rate: number): void {
  jobs.delete(rate);
  for (const name of CUE_NAMES) {
    cache.delete(key(name, rate));
    running.delete(key(name, rate));
  }
}

/** An AudioBuffer of the cue's samples, made on `ctx`. */
export function bufferOf(ctx: BaseAudioContext, data: Float32Array, rate: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, data.length, rate);
  buffer.getChannelData(0).set(data);
  return buffer;
}

/** Start `buffer` at the context's time 0 (for a live AudioContext: now) on `ctx.destination`. */
export function schedule(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  return source;
}

/**
 * Schedule the named cue at the context's time 0 on `ctx.destination`, at the context's rate:
 * the rubric's Script K entry. The app plays the same samples through the same `schedule()`.
 */
export function render(ctx: BaseAudioContext, name: CueName): AudioBufferSourceNode {
  return schedule(ctx, bufferOf(ctx, samples(name, ctx.sampleRate), ctx.sampleRate));
}

/** The rubric's audit hook (Script K): cue names, the app's own render function, and lengths. */
export interface CueHook {
  readonly names: readonly CueName[];
  render(ctx: BaseAudioContext, name: CueName): AudioBufferSourceNode;
  seconds(name: CueName): number;
}

/**
 * The hook is built into development, test and demo builds only: `npm run demo` builds with
 * `vite build --mode demo`, and `VITE_DEMO=1` turns it on in any other build. In a production
 * build both values are replaced at build time, so the condition is false and nothing is exposed.
 * Even where it is exposed it holds no data: cue names and pure functions, frozen.
 */
export function cueHookEnabled(env: { MODE?: string; VITE_DEMO?: string } = import.meta.env): boolean {
  return env.MODE !== 'production' || env.VITE_DEMO === '1';
}

export function installCueHook(target: { __cues?: CueHook } = window as { __cues?: CueHook }, enabled = cueHookEnabled()): void {
  if (!enabled) return;
  target.__cues = Object.freeze({ names: Object.freeze([...CUE_NAMES]), render, seconds });
}
