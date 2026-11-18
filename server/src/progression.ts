// Progression rules, per the progression Decision (docs/knowledge/decisions/progression-design.md).
//
// Pure functions only: no clock, no store, no network. The service below feeds them.
//
// - XP counts consistency and form, never volume: a fixed session credit once the warm-up is
//   logged, plus one form star per set the parent rated well, capped at the planned sets.
// - A safety stop (pain, a warning sign, either person pressing Stop) counts as a kept day
//   and earns the same session credit as finishing. Nothing earned is taken away.
// - Streaks: one team streak and a personal streak each for the keeper and the parent.
//   Planned rest and a pause hold every streak. A missed planned day ends the run quietly:
//   the run is archived as a completed run, and a new one starts at the next session.
// - Extra sessions on the same day, and sessions on a rest day, earn nothing.

export type Person = 'keeper' | 'parent';
export const PEOPLE: readonly Person[] = ['keeper', 'parent'];

export type Outcome = 'done' | 'stopped' | 'hurt';

/** One state per calendar day (the Decision's training calendar). */
export type DayKind = 'together' | 'solo' | 'safety_stop' | 'rest' | 'paused' | 'missed';

export interface Day {
  date: string;
  kind: DayKind;
  /** Who trained, for `together`, `solo` and `safety_stop`. A safety stop defaults to both. */
  present?: readonly Person[];
}

/** Fixed session credit: the same for a short or a long session. */
export const SESSION_XP = 10;
/** One form star: a set the parent rated as looking good. */
export const STAR_XP = 2;

export interface SessionCreditInput {
  outcome: Outcome;
  /** The warm-up was logged (or the session had none). */
  warmUpLogged: boolean;
  /** Sets the parent rated as looking good (cue taps). */
  praisedSets: number;
  /** Sets in the approved plan for this session; stars above this earn nothing. */
  plannedSets: number;
}

export interface SessionCredit {
  session: number;
  stars: number;
  form: number;
  total: number;
}

export const NO_CREDIT: SessionCredit = Object.freeze({ session: 0, stars: 0, form: 0, total: 0 });

export function isSafetyStop(outcome: Outcome): boolean {
  return outcome === 'stopped' || outcome === 'hurt';
}

function whole(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * XP for one session. Sets done and reps never count. A safety stop earns the same session
 * credit as finishing, even before the warm-up was logged, and keeps the stars already earned.
 */
export function sessionCredit({ outcome, warmUpLogged, praisedSets, plannedSets }: SessionCreditInput): SessionCredit {
  const session = warmUpLogged || isSafetyStop(outcome) ? SESSION_XP : 0;
  const stars = Math.min(whole(praisedSets), whole(plannedSets));
  const form = stars * STAR_XP;
  return { session, stars, form, total: session + form };
}

export interface DayInput {
  date: string;
  /** The plan has a session on this date (false: a planned rest day). */
  planned: boolean;
  /** The first session recorded that day, if any. */
  session: { outcome: Outcome; present: readonly Person[] } | null;
  /** Training was paused for the keeper on this date. */
  paused: boolean;
  /** This date is today: an untrained planned day is still open, not missed. */
  isToday: boolean;
}

/** The day's state, or null for today while it is still open. */
export function classifyDay({ planned, session, paused, isToday }: DayInput): DayKind | null {
  // Training on a rest day earns nothing and changes nothing (Decision invariant 6).
  if (session && planned) {
    if (isSafetyStop(session.outcome)) return 'safety_stop';
    return session.present.length >= 2 ? 'together' : 'solo';
  }
  if (paused) return 'paused';
  if (!planned) return 'rest';
  return isToday ? null : 'missed';
}

export function trainedBy(day: Day): readonly Person[] {
  switch (day.kind) {
    case 'together':
      return PEOPLE;
    case 'solo':
      return day.present ?? [];
    case 'safety_stop':
      return day.present ?? PEOPLE;
    default:
      return [];
  }
}

export interface Run {
  start: string;
  end: string;
  /** Kept days in the run. */
  days: number;
}

export interface Streak {
  /** Kept days in the current run. */
  current: number;
  /** The longest run so far, the current one included. */
  best: number;
  /** First kept day of the current run, or null. */
  since: string | null;
  /** Runs that ended, oldest first. Shown as completed runs, never as losses. */
  completed: Run[];
}

export interface Streaks {
  team: Streak;
  keeper: Streak;
  parent: Streak;
}

type Effect = 'extend' | 'hold' | 'end';

function teamEffect(day: Day): Effect {
  if (day.kind === 'missed') return 'end';
  return trainedBy(day).length >= 2 ? 'extend' : 'hold';
}

function personEffect(day: Day, person: Person): Effect {
  if (day.kind === 'missed') return 'end';
  // A solo day for the other person, rest and pause all hold.
  return trainedBy(day).includes(person) ? 'extend' : 'hold';
}

function walk(days: readonly Day[], effect: (d: Day) => Effect): Streak {
  const completed: Run[] = [];
  let current = 0;
  let since: string | null = null;
  let last: string | null = null;
  let best = 0;
  for (const day of days) {
    const e = effect(day);
    if (e === 'extend') {
      current += 1;
      since ??= day.date;
      last = day.date;
      best = Math.max(best, current);
    } else if (e === 'end' && current > 0) {
      // Quietly archive the run; a new one starts with the next kept day.
      completed.push({ start: since!, end: last!, days: current });
      current = 0;
      since = null;
      last = null;
    }
  }
  return { current, best, since, completed };
}

/** Team and personal streaks over days in date order. Missing dates are simply not counted. */
export function computeStreaks(days: readonly Day[]): Streaks {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  return {
    team: walk(sorted, teamEffect),
    keeper: walk(sorted, (d) => personEffect(d, 'keeper')),
    parent: walk(sorted, (d) => personEffect(d, 'parent')),
  };
}

/** The next calendar date, for YYYY-MM-DD strings. */
export function nextDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Every date from `from` to `to`, both included. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = nextDate(d)) out.push(d);
  return out;
}
