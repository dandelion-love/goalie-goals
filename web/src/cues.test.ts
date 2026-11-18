import { describe, expect, it } from 'vitest';
import {
  CUES,
  CUE_NAMES,
  MAX_SECONDS,
  PEAK_CEILING_DB,
  PREPARE_ORDER,
  RUBRIC_MOMENTS,
  TIER_RMS_DB,
  cueHookEnabled,
  cueStats,
  forgetCues,
  prepareCues,
  installCueHook,
  levels,
  render,
  samples,
  seconds,
  toDb,
  type CueHook,
  type CueName,
} from './cues';

// A minimal OfflineAudioContext for jsdom (which has no Web Audio): buffers, buffer sources
// and a renderer that mixes every started source into the output, upmixing mono to each
// channel as Web Audio's "speakers" rule does.
class FakeBuffer {
  private readonly data: Float32Array[];
  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  get duration() {
    return this.length / this.sampleRate;
  }
  getChannelData(c: number) {
    return this.data[c];
  }
}

interface FakeSource {
  buffer: FakeBuffer | null;
  to: unknown;
  at: number | null;
  connect(dest: unknown): void;
  start(when?: number): void;
}

class FakeOfflineContext {
  readonly destination = { kind: 'destination' };
  readonly currentTime = 0;
  readonly sources: FakeSource[] = [];
  constructor(
    private readonly channels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {}
  createBuffer(ch: number, len: number, rate: number) {
    return new FakeBuffer(ch, len, rate);
  }
  createBufferSource(): FakeSource {
    const src: FakeSource = {
      buffer: null,
      to: null,
      at: null,
      connect(dest) {
        src.to = dest;
      },
      start(when = 0) {
        src.at = when;
      },
    };
    this.sources.push(src);
    return src;
  }
  async startRendering() {
    const out = new FakeBuffer(this.channels, this.length, this.sampleRate);
    for (const s of this.sources) {
      if (s.to !== this.destination || s.at === null || !s.buffer) continue;
      const offset = Math.round(s.at * this.sampleRate);
      for (let c = 0; c < this.channels; c++) {
        const from = s.buffer.getChannelData(Math.min(c, s.buffer.numberOfChannels - 1));
        const to = out.getChannelData(c);
        for (let i = 0; i < from.length && offset + i < to.length; i++) to[offset + i] += from[i];
      }
    }
    return out;
  }
}

// The rubric's Script K, as written there, run against the hook with the fake context.
async function scriptK(cues: CueHook, rate = 48000) {
  const floor = 0.001;
  const db = (v: number) => (v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -Infinity);
  const out = [];
  for (const name of cues.names) {
    const secs = (cues.seconds?.(name) ?? 3) + 0.5;
    const ctx = new FakeOfflineContext(2, Math.ceil(secs * rate), rate);
    await cues.render(ctx as unknown as BaseAudioContext, name);
    const buf = await ctx.startRendering();
    const chans = [...Array(buf.numberOfChannels)].map((_, c) => buf.getChannelData(c));
    const loud = (i: number) => chans.some((d) => Math.abs(d[i]) >= floor);
    let first = 0;
    let last = buf.length - 1;
    while (first < buf.length && !loud(first)) first++;
    while (last > first && !loud(last)) last--;
    let peak = 0;
    let sum = 0;
    let n = 0;
    for (const d of chans)
      for (let i = first; i <= last; i++) {
        const a = Math.abs(d[i]);
        if (a > peak) peak = a;
        sum += d[i] * d[i];
        n++;
      }
    out.push({ name, peakDb: db(peak), rmsDb: db(n ? Math.sqrt(sum / n) : 0), ms: Math.round(((last - first + 1) / rate) * 1000) });
  }
  return out;
}

/** SO2 as the rubric adopts it: each cue's RMS within this of its tier's target, every peak at most -1.0 dB. */
const SO2_RMS_TOLERANCE_DB = 1.5;
const SO2_PEAK_MAX_DB = -1.0;

const SUCCESS: CueName[] = CUE_NAMES.filter((n) => CUES[n].tier !== 'calm');
const CALM: CueName[] = CUE_NAMES.filter((n) => CUES[n].tier === 'calm');

/** Zero crossings per second: a rough pitch and brightness measure from the rendered samples. */
function crossingsPerSecond(name: CueName, rate = 48000) {
  const d = samples(name, rate);
  const { first, last } = levels(d);
  let n = 0;
  for (let i = first + 1; i <= last; i++) if (d[i - 1] < 0 !== d[i] < 0) n++;
  return n / ((last - first + 1) / rate);
}

/** The first note's rise: time from the first audible sample to 90% of the level it reaches in its first 100 ms (before any second note). */
function riseSeconds(name: CueName, rate = 48000) {
  const d = samples(name, rate);
  const { first } = levels(d);
  const end = Math.min(d.length, first + Math.round(0.1 * rate));
  let top = 0;
  for (let i = first; i < end; i++) top = Math.max(top, Math.abs(d[i]));
  let at = first;
  while (at < end && Math.abs(d[at]) < 0.9 * top) at++;
  return (at - first) / rate;
}

describe('the cue map', () => {
  it('has a cue for each of the rubric’s seven moments, each moment its own sound', () => {
    expect(Object.keys(RUBRIC_MOMENTS)).toHaveLength(7);
    const used = Object.values(RUBRIC_MOMENTS);
    expect(new Set(used).size).toBe(7);
    for (const name of used) expect(CUE_NAMES).toContain(name);
    // Switch and pause from the sound shortlist too.
    expect(CUE_NAMES).toEqual(expect.arrayContaining(['switch', 'pause']));
  });

  it('keeps each cue within its tier’s length', () => {
    for (const name of CUE_NAMES) {
      expect(seconds(name)).toBeGreaterThan(0);
      expect(seconds(name), name).toBeLessThanOrEqual(MAX_SECONDS[CUES[name].tier]);
    }
  });

  it('puts the safety stop and pause in the calm tier, below every success cue', () => {
    expect(CUES.safety.tier).toBe('calm');
    expect(CUES.pause.tier).toBe('calm');
    expect(CUES.rest.tier).toBe('calm');
    expect(TIER_RMS_DB.functional).toBeGreaterThan(TIER_RMS_DB.celebration);
    expect(TIER_RMS_DB.celebration).toBeGreaterThan(TIER_RMS_DB.calm);
  });
});

describe('calm cues against success cues', () => {
  const fundamentals = (n: CueName) => CUES[n].notes.map((x) => x.hz);
  const attacks = (n: CueName) => CUES[n].notes.map((x) => x.attack);

  it('are lower in pitch: every calm note sits below every success note', () => {
    const calmTop = Math.max(...CALM.flatMap(fundamentals));
    const successBottom = Math.min(...SUCCESS.flatMap(fundamentals));
    expect(calmTop).toBeLessThan(successBottom);
    // Measured from the samples, too.
    const calmBright = Math.max(...CALM.map((n) => crossingsPerSecond(n)));
    const successBright = Math.min(...SUCCESS.map((n) => crossingsPerSecond(n)));
    expect(calmBright).toBeLessThan(successBright);
  });

  it('have a softer, slower envelope', () => {
    expect(Math.min(...CALM.flatMap(attacks))).toBeGreaterThanOrEqual(0.04);
    expect(Math.max(...SUCCESS.flatMap(attacks))).toBeLessThanOrEqual(0.01);
    const calmRise = Math.min(...CALM.map((n) => riseSeconds(n)));
    const successRise = Math.max(...SUCCESS.map((n) => riseSeconds(n)));
    expect(calmRise).toBeGreaterThan(successRise);
    const decay = (n: CueName) => Math.max(...CUES[n].notes.map((x) => x.decay));
    expect(decay('safety')).toBeGreaterThan(Math.max(...SUCCESS.map(decay)));
  });

  it('make the safety stop a different sound from rest', () => {
    expect(CUES.safety.notes).toHaveLength(1);
    expect(CUES.safety.notes[0].hz).toBeLessThan(Math.min(...fundamentals('rest')));
  });
});

describe('levels (SO2)', () => {
  it.each([44100, 48000])('keeps each cue at its tier’s level and under the peak ceiling, at %i Hz', (rate) => {
    for (const n of CUE_NAMES) {
      const l = levels(samples(n, rate));
      expect(toDb(l.peak), `${n} peak`).toBeLessThanOrEqual(PEAK_CEILING_DB + 0.01);
      expect(Math.abs(toDb(l.rms) - TIER_RMS_DB[CUES[n].tier]), `${n} rms`).toBeLessThanOrEqual(SO2_RMS_TOLERANCE_DB);
    }
  });
});

describe('the audit hook (AC4)', () => {
  it.each([44100, 48000])('renders every cue through the app’s own render function, and Script K reads SO2 at 3 (%i Hz)', async (rate) => {
    const target: { __cues?: CueHook } = {};
    installCueHook(target, true);
    const hook = target.__cues!;
    expect(hook.names).toEqual(CUE_NAMES);
    expect(hook.render).toBe(render);
    expect(Object.isFrozen(hook)).toBe(true);

    const result = await scriptK(hook, rate);
    expect(result.map((r) => r.name)).toEqual(CUE_NAMES);
    for (const r of result) {
      expect(r.peakDb, r.name).toBeLessThanOrEqual(SO2_PEAK_MAX_DB);
      expect(Math.abs(r.rmsDb - TIER_RMS_DB[CUES[r.name].tier]), r.name).toBeLessThanOrEqual(SO2_RMS_TOLERANCE_DB);
      expect(r.ms, r.name).toBeGreaterThan(0);
      expect(r.ms, r.name).toBeLessThanOrEqual(seconds(r.name) * 1000 + 1);
    }
  });

  it('schedules each cue at time 0 on the destination, as one buffer source', () => {
    const ctx = new FakeOfflineContext(1, 48000, 48000);
    render(ctx as unknown as BaseAudioContext, 'go');
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0].at).toBe(0);
    expect(ctx.sources[0].to).toBe(ctx.destination);
    expect(ctx.sources[0].buffer!.duration).toBeCloseTo(seconds('go'), 2);
  });

  it('is built into development, test and demo builds only', () => {
    expect(cueHookEnabled({ MODE: 'test' })).toBe(true);
    expect(cueHookEnabled({ MODE: 'development' })).toBe(true);
    expect(cueHookEnabled({ MODE: 'demo' })).toBe(true);
    expect(cueHookEnabled({ MODE: 'production' })).toBe(false);
    expect(cueHookEnabled({ MODE: 'production', VITE_DEMO: '1' })).toBe(true);
    const target: { __cues?: CueHook } = {};
    installCueHook(target, false);
    expect(target).toEqual({});
  });
});

describe('preparing the cues (story #97)', () => {
  it('lists every cue once in the prepare order, the session’s first cue first', () => {
    expect([...PREPARE_ORDER].sort()).toEqual([...CUE_NAMES].sort());
    expect(PREPARE_ORDER[0]).toBe('start');
    expect(PREPARE_ORDER.at(-1)).toBe('done');
  });

  it('renders each cue once, in slices that yield, to the same samples as the one-go path', async () => {
    // A rate no other test uses, so nothing is cached yet.
    const rate = 16000;
    let clock = 0;
    let pauses = 0;
    const before = cueStats.synthesised;
    // Each step of work moves the fake clock 1 ms; a 4 ms budget forces many slices.
    const jobs = prepareCues(rate, { sliceMs: 4, clock: () => clock++, pause: async () => void pauses++ });
    expect(prepareCues(rate)).toBe(jobs);
    const ready = await Promise.all(CUE_NAMES.map((n) => jobs[n]));
    expect(cueStats.synthesised - before).toBe(CUE_NAMES.length);
    // The work was split: far more pauses than cues.
    expect(pauses).toBeGreaterThan(CUE_NAMES.length * 3);
    // The one-go path now reuses the prepared samples: nothing is rendered again.
    CUE_NAMES.forEach((n, i) => expect(samples(n, rate)).toBe(ready[i]));
    expect(cueStats.synthesised - before).toBe(CUE_NAMES.length);
    // The sliced samples hold the same levels the one-go path is pinned to (SO2).
    CUE_NAMES.forEach((n, i) => {
      const l = levels(ready[i]);
      expect(toDb(l.peak), n).toBeLessThanOrEqual(PEAK_CEILING_DB + 0.01);
      expect(Math.abs(toDb(l.rms) - TIER_RMS_DB[CUES[n].tier]), n).toBeLessThanOrEqual(SO2_RMS_TOLERANCE_DB);
    });
  });

  it('gives the same samples sliced as in one go, sample for sample', async () => {
    const rate = 11025;
    const once = CUE_NAMES.map((n) => Float32Array.from(samples(n, rate)));
    forgetCues(rate);
    let clock = 0;
    const jobs = prepareCues(rate, { sliceMs: 1, clock: () => clock++, pause: async () => {} });
    for (let i = 0; i < CUE_NAMES.length; i++) {
      const sliced = await jobs[CUE_NAMES[i]];
      expect(sliced, CUE_NAMES[i]).not.toBe(once[i]);
      expect(sliced, CUE_NAMES[i]).toEqual(once[i]);
    }
  });

  it('keeps every cue to a slice of work between pauses', async () => {
    const rate = 8000;
    let clock = 0;
    let steps = 0;
    let longest = 0;
    const jobs = prepareCues(rate, {
      sliceMs: 3,
      clock: () => {
        steps++;
        return clock++;
      },
      pause: async () => {
        longest = Math.max(longest, steps);
        steps = 0;
      },
    });
    await Promise.all(CUE_NAMES.map((n) => jobs[n]));
    // Each slice reads the clock once to set its end and once per step, up to the budget.
    expect(longest).toBeLessThanOrEqual(3 + 2);
  });
});
