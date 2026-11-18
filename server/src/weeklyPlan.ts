// The get-stronger starter pack: three themed sessions a week from the nine cards, with every
// other day a planned rest day. The parent picks the three training weekdays in the app
// (src/schedule.ts); Monday, Wednesday and Friday are the default.
//
// The training-rules Decision (docs/knowledge/decisions/training-rules.md) sets the limits the
// pack must keep, and `checkPlanRules` checks them: strength on 2 to 3 days a week, never on
// consecutive days (Sunday to Monday included); jumps on at most 2 days, starting at no more
// than 50 contacts a session; jumps and quick-feet work before strength; a 5 to 10 minute
// warm-up and a cool-down every session; and every dose the card's own.

import type { CardSource, ContentLibrary, Dose } from './content.js';
import { STARTER_SESSION, type SessionTemplate, type TrainingPlan } from './training.js';

/** 0 is Sunday, 1 Monday, ... 6 Saturday, as `Date.getUTCDay()` gives. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** The default training days: Monday, Wednesday and Friday. */
export const DEFAULT_TRAINING_DAYS: readonly Weekday[] = [1, 3, 5];

/** How many training days the pack has, one per theme. */
export const TRAINING_DAYS_PER_WEEK = 3;

/** The low end of the starting jump-contact range (50 to 60 a session). */
export const JUMP_CONTACTS_START_CAP = 50;
export const MAX_JUMP_DAYS = 2;
export const MAX_STRENGTH_DAYS = 3;
export const WARM_UP_MIN_S = 5 * 60;
export const WARM_UP_MAX_S = 10 * 60;

const warmUp = STARTER_SESSION.warmUp;
const coolDown = STARTER_SESSION.coolDown;

/** The pack in week order: the first theme goes on the first training day of the week. */
export const STARTER_PACK: readonly SessionTemplate[] = [
  { id: 'strong-middle', title: 'Strong middle', warmUp, cardIds: ['plank', 'side-plank', 'glute-bridge'], coolDown },
  { id: 'spring-legs', title: 'Spring legs', warmUp, cardIds: ['pogo-hops', 'squat-to-box', 'split-squat'], coolDown },
  {
    id: 'quick-feet-strong-arms',
    title: 'Quick feet, strong arms',
    warmUp,
    cardIds: ['lateral-shuffle', 'broad-jump-stick', 'wall-push-up'],
    coolDown,
  },
];

export function weekdayOf(date: string): Weekday {
  return new Date(`${date}T00:00:00Z`).getUTCDay() as Weekday;
}

/** Monday first, Sunday last: the order themes are laid out over the week. */
function weekOrder(d: Weekday): number {
  return (d + 6) % 7;
}

export function sortWeekdays(days: readonly Weekday[]): Weekday[] {
  return [...days].sort((a, b) => weekOrder(a) - weekOrder(b));
}

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

export function weekdaysText(days: readonly Weekday[]): string {
  return sortWeekdays(days).map((d) => WEEKDAY_NAMES[d]).join(', ');
}

/** A week as the plan lays it out: the session on each weekday (index 0 is Sunday), or rest. */
export type Week = readonly (SessionTemplate | null)[];

/** Lay the pack over the chosen days, in week order. */
export function layOut(pack: readonly SessionTemplate[], days: readonly Weekday[]): Week {
  const week: (SessionTemplate | null)[] = [null, null, null, null, null, null, null];
  sortWeekdays(days).forEach((d, i) => {
    if (i < pack.length) week[d] = pack[i];
  });
  return week;
}

/** A schedule change takes effect from its date; earlier dates keep the days they had. */
export interface ScheduleChange {
  from: string;
  days: Weekday[];
}

/**
 * The themed week. Rest days return null, so progress counts them as planned rest, which never
 * breaks a streak. Each change of days applies from its own date onward.
 */
export class WeeklyPlan implements TrainingPlan {
  private changes: ScheduleChange[] = [];

  constructor(
    readonly pack: readonly SessionTemplate[] = STARTER_PACK,
    private readonly defaultDays: readonly Weekday[] = DEFAULT_TRAINING_DAYS,
  ) {}

  sessions(): readonly SessionTemplate[] {
    return this.pack;
  }

  /** The days in effect on a date. */
  daysOn(date: string): Weekday[] {
    let days = [...this.defaultDays];
    for (const c of this.changes) if (c.from <= date) days = [...c.days];
    return sortWeekdays(days);
  }

  weekOn(date: string): Week {
    return layOut(this.pack, this.daysOn(date));
  }

  sessionFor(date: string): SessionTemplate | null {
    return this.weekOn(date)[weekdayOf(date)];
  }

  /** Replace the change history, in the order the changes were made (the store's copy). */
  load(changes: readonly ScheduleChange[]): void {
    this.changes = changes.map((c) => ({ from: c.from, days: [...c.days] }));
  }

  /** A copy of the change history the plan holds, oldest first. */
  changeLog(): ScheduleChange[] {
    return this.changes.map((c) => ({ from: c.from, days: [...c.days] }));
  }
}

// --- Plan rules ---------------------------------------------------------------------------

/** Card kinds the rules treat as quick work that comes before strength in a session. */
const QUICK_CATEGORIES = new Set(['power', 'footwork']);

export function isJumpCard(card: CardSource['card']): boolean {
  return card.dose.kind === 'contacts';
}

export function contacts(dose: Dose): number {
  if (dose.kind !== 'contacts') return 0;
  return dose.sets * (dose.reps ?? 0) * (dose.per_side ? 2 : 1);
}

/** Doses as a session serves them, by card id; checked against the cards' own doses. */
export type ServedDoses = ReadonlyMap<string, Dose>;

function sameDose(a: Dose, b: Dose): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Dose>;
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

function adjacentPairs(days: readonly Weekday[]): [Weekday, Weekday][] {
  const set = new Set(days);
  const pairs: [Weekday, Weekday][] = [];
  for (const d of sortWeekdays(days)) {
    const next = ((d + 1) % 7) as Weekday;
    if (set.has(next)) pairs.push([d, next]);
  }
  return pairs;
}

/**
 * Check a choice of training days on its own: exactly three distinct weekdays, no two next to
 * each other (Sunday and Monday count as next to each other). Returns a message a parent can
 * read, or null when the choice is fine.
 */
export function checkTrainingDays(days: readonly unknown[]): string | null {
  if (!days.every(isWeekday) || new Set(days).size !== days.length || days.length !== TRAINING_DAYS_PER_WEEK) {
    return `Pick exactly ${TRAINING_DAYS_PER_WEEK} different training days.`;
  }
  const pairs = adjacentPairs(days);
  if (pairs.length) {
    const [a, b] = pairs[0];
    return (
      `${WEEKDAY_NAMES[a]} and ${WEEKDAY_NAMES[b]} are back to back. ` +
      'Strength days need a rest day between them, so pick days with a gap.'
    );
  }
  return null;
}

/**
 * Every rule the training-rules Decision sets for a week of sessions. Returns the broken rules
 * as readable messages; an empty list means the week keeps them all. `served` gives the doses
 * a session actually serves, when the caller has them; the cards' own doses are the standard.
 */
export function checkPlanRules(week: Week, content: ContentLibrary, served?: ServedDoses): string[] {
  const problems: string[] = [];
  if (week.length !== 7) return ['A week has seven days.'];

  const trainingDays = week.flatMap((s, d) => (s ? [d as Weekday] : []));
  if (trainingDays.length < 2 || trainingDays.length > MAX_STRENGTH_DAYS) {
    problems.push(`Strength goes on 2 to ${MAX_STRENGTH_DAYS} days a week, not ${trainingDays.length}.`);
  }
  for (const [a, b] of adjacentPairs(trainingDays)) {
    problems.push(`Strength on consecutive days: ${WEEKDAY_NAMES[a]} and ${WEEKDAY_NAMES[b]}.`);
  }

  let jumpDays = 0;
  week.forEach((session, d) => {
    if (!session) return;
    const where = `${WEEKDAY_NAMES[d]} "${session.title}"`;
    const cards = session.cardIds.map((id) => ({ id, source: content.cards.get(id) }));
    for (const c of cards) if (!c.source) problems.push(`${where}: no card "${c.id}".`);
    const known = cards.flatMap((c) => (c.source ? [c.source.card] : []));

    const jumps = known.filter(isJumpCard);
    if (jumps.length) jumpDays += 1;
    const total = jumps.reduce((s, c) => s + contacts(c.dose), 0);
    if (total > JUMP_CONTACTS_START_CAP) {
      problems.push(`${where}: ${total} jump contacts, above the starting cap of ${JUMP_CONTACTS_START_CAP}.`);
    }

    let strengthSeen = false;
    for (const card of known) {
      const quick = QUICK_CATEGORIES.has(card.category) || isJumpCard(card);
      if (!quick) strengthSeen = true;
      else if (strengthSeen) problems.push(`${where}: ${card.name} comes after strength work; jumps go first.`);
    }

    const warm = session.warmUp.reduce((s, m) => s + m.seconds, 0);
    if (warm < WARM_UP_MIN_S || warm > WARM_UP_MAX_S) {
      problems.push(`${where}: the warm-up is ${warm} s, not 5 to 10 minutes.`);
    }
    if (!session.coolDown.length) problems.push(`${where}: no cool-down.`);

    for (const card of known) {
      const dose = served?.get(card.id);
      if (dose && !sameDose(dose, card.dose)) problems.push(`${where}: ${card.name} is not at the card's own dose.`);
    }
  });
  if (jumpDays > MAX_JUMP_DAYS) problems.push(`Jumps on ${jumpDays} days a week; at most ${MAX_JUMP_DAYS}.`);
  return problems;
}
