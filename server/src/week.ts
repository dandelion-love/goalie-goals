// This week at a glance (story 114): the seven days of the week that holds a date, Monday first,
// each in one state, the count of planned sessions kept, and the next planned session.
//
// The progression Decision (docs/knowledge/decisions/progression-design.md) shows the weekly goal
// as a near goal across days, never inside a session, and gain-framed: a rest day, a pause and a
// safety stop never show as missed. A safety stop is a kept day, counted like a session done.
// A past planned day with nothing logged is shown plainly as "open", never as missed: the
// Decision sends no message at all after a miss.
//
// Pure: the caller passes the plan, the recorded days and the pauses. The route is weekRoutes.ts.

import type { Day } from './progression.js';
import type { SessionTemplate, TrainingPlan } from './training.js';
import { WEEKDAY_NAMES, weekdayOf } from './weeklyPlan.js';

export type WeekDayState =
  /** A planned session done, together or solo. */
  | 'trained'
  /** A planned session stopped for safety: kept, exactly like one done. */
  | 'stopped'
  /** A planned rest day (a session on a rest day changes nothing). */
  | 'rest'
  /** Training paused for the keeper. */
  | 'paused'
  /** A planned session still to come. */
  | 'planned'
  /** Today's planned session, not done yet. */
  | 'today'
  /** A past planned day with nothing logged. Shown plainly, never as missed. */
  | 'open';

export interface WeekDay {
  date: string;
  /** "Mon" ... "Sun". */
  day: string;
  state: WeekDayState;
  isToday: boolean;
  /** The plan's session that day, or null on a rest day. */
  title: string | null;
}

export interface NextSession {
  date: string;
  day: string;
  title: string;
  /** Its length in whole minutes, from the app's one estimate (story 120), when the caller gives it. */
  minutes?: number;
}

export interface WeekView {
  date: string;
  days: WeekDay[];
  /** Planned sessions kept this week: done or stopped for safety. */
  kept: number;
  /** Planned sessions this week, as the plan sets them. */
  planned: number;
  /** The first planned session after today, or null (none within a week, or training paused). */
  next: NextSession | null;
}

export interface PauseSpan {
  from: string;
  to: string | null;
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Monday of the week that holds `date`. */
export function weekStart(date: string): string {
  return shiftDate(date, -((weekdayOf(date) + 6) % 7));
}

const KEPT: ReadonlySet<WeekDayState> = new Set(['trained', 'stopped']);

export function isKept(state: WeekDayState): boolean {
  return KEPT.has(state);
}

function fromDay(day: Day): WeekDayState {
  switch (day.kind) {
    case 'together':
    case 'solo':
      return 'trained';
    case 'safety_stop':
      return 'stopped';
    case 'rest':
      return 'rest';
    case 'paused':
      return 'paused';
    case 'missed':
      return 'open';
  }
}

export interface WeekInput {
  today: string;
  plan: TrainingPlan;
  /** The recorded calendar up to today, as ProgressService.days gives it. */
  days: readonly Day[];
  pauses: readonly PauseSpan[];
  /** A session's minutes by the one estimate (`templateMinutes`, story 120), for the next line. */
  minutesOf?: (session: SessionTemplate) => number;
}

/** The week that holds `today`, one state a day, with the count and the next session. */
export function weekView({ today, plan, days, pauses, minutesOf }: WeekInput): WeekView {
  const recorded = new Map(days.map((d) => [d.date, d]));
  // A pause still in force holds every day ahead of it too, until the parent clears it.
  const pausedOn = (date: string) => pauses.some((p) => p.from <= date && (p.to === null || date <= p.to));
  const openPause = pauses.some((p) => p.to === null && p.from <= today);
  const start = weekStart(today);
  const out: WeekDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = shiftDate(start, i);
    const session = plan.sessionFor(date);
    const isToday = date === today;
    let state: WeekDayState;
    const day = recorded.get(date);
    if (date <= today && day) state = fromDay(day);
    else if (date > today && openPause) state = 'paused';
    else if (date <= today && pausedOn(date)) state = 'paused';
    else if (!session) state = 'rest';
    else if (isToday) state = 'today';
    else if (date > today) state = 'planned';
    // Before the first record the calendar has no entry: shown plainly, like any open day.
    else state = 'open';
    out.push({ date, day: WEEKDAY_NAMES[weekdayOf(date)], state, isToday, title: session?.title ?? null });
  }
  let next: NextSession | null = null;
  if (!openPause) {
    for (let i = 1; i <= 7 && !next; i += 1) {
      const date = shiftDate(today, i);
      const session = plan.sessionFor(date);
      if (session) {
        next = { date, day: WEEKDAY_NAMES[weekdayOf(date)], title: session.title };
        if (minutesOf) next.minutes = minutesOf(session);
      }
    }
  }
  return {
    date: today,
    days: out,
    kept: out.filter((d) => isKept(d.state)).length,
    planned: out.filter((d) => d.title !== null).length,
    next,
  };
}
