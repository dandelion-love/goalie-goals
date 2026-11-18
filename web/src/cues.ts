// Sound cues for the session's moments, synthesised in the browser: no audio files, so no
// licence to check and nothing to precache (story #79).
//
// Each cue is a few sine partials under an attack-and-decay envelope, computed into an
// AudioBuffer and played as an AudioBufferSourceNode. `render(ctx, name)` does that on any
// BaseAudioContext: the live AudioContext the player uses and the OfflineAudioContext the
// quality rubric's Script K measures with run the same code, so what is measured is what plays.
// A buffer source (rather than OscillatorNodes) is also what the rubric's sound probe
// (Script E) logs, so SO1 and SO3 can see every cue.
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

function synthesise(spec: CueSpec, rate: number): Float32Array {
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
    }
  }
  return out;
}

/** Script K's measure: peak and RMS over the cue with samples below -60 dBFS trimmed from both ends. */
export function levels(data: ArrayLike<number>, floor = 0.001): { peak: number; rms: number; first: number; last: number } {
  let first = 0;
  let last = data.length - 1;
  while (first < data.length && Math.abs(data[first]) < floor) first++;
  while (last > first && Math.abs(data[last]) < floor) last--;
  let peak = 0;
  let sum = 0;
  for (let i = first; i <= last; i++) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
    sum += data[i] * data[i];
  }
  const n = last - first + 1;
  return { peak, rms: n > 0 ? Math.sqrt(sum / n) : 0, first, last };
}

export const toDb = (v: number) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const fromDb = (db: number) => 10 ** (db / 20);

const cache = new Map<string, Float32Array>();

/** The cue's samples at `rate`, scaled to its tier's RMS and kept under the peak ceiling. */
export function samples(name: CueName, rate: number): Float32Array {
  const key = `${name}@${rate}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const spec = CUES[name];
  const raw = synthesise(spec, rate);
  // The trimmed span depends on the scale, so settle it in a few rounds.
  let scale = 1;
  for (let round = 0; round < 4; round++) {
    const scaled = raw.map((v) => v * scale);
    const { rms } = levels(scaled);
    if (rms > 0) scale *= fromDb(TIER_RMS_DB[spec.tier]) / rms;
  }
  const peak = levels(raw).peak * scale;
  if (peak > fromDb(PEAK_CEILING_DB)) scale *= fromDb(PEAK_CEILING_DB) / peak;
  const out = raw.map((v) => v * scale);
  cache.set(key, out);
  return out;
}

/**
 * Schedule the named cue at the context's time 0 (for a live AudioContext: now) on
 * `ctx.destination`. The same function plays every cue in the app and renders it in the audit.
 */
export function render(ctx: BaseAudioContext, name: CueName): AudioBufferSourceNode {
  const data = samples(name, ctx.sampleRate);
  const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
  buffer.getChannelData(0).set(data);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  return source;
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
