// Client for this week at a glance (story 114). The server works out each day's state from the
// plan the parent set, the recorded sessions and any pause (server/src/week.ts); this module only
// reads it and words it.

import { localDate } from './training';

export type WeekDayState = 'trained' | 'stopped' | 'rest' | 'paused' | 'planned' | 'today' | 'open';

export interface WeekDay {
  date: string;
  day: string;
  state: WeekDayState;
  isToday: boolean;
  title: string | null;
}

export interface NextSession {
  date: string;
  day: string;
  title: string;
}

export interface WeekView {
  date: string;
  days: WeekDay[];
  kept: number;
  planned: number;
  next: NextSession | null;
}

/**
 * Each state's label on the strip. Gain-framed: a safety stop is a kept day, and a past planned
 * day with nothing logged says so plainly. No day ever reads as missed.
 */
export const STATE_LABEL: Record<WeekDayState, string> = {
  trained: 'Trained',
  stopped: 'Safe stop',
  rest: 'Rest',
  paused: 'Paused',
  planned: 'Planned',
  today: 'Today',
  open: 'No session',
};

/** "1 of 3 sessions": the near goal across the week. */
export function countText(w: Pick<WeekView, 'kept' | 'planned'>): string {
  return `${w.kept} of ${w.planned} ${w.planned === 1 ? 'session' : 'sessions'}`;
}

/** "Next session: Wed, Spring legs." */
export function nextText(next: NextSession): string {
  return `Next session: ${next.day}, ${next.title}.`;
}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };

function isWeek(value: unknown): value is WeekView {
  const w = value as WeekView | null;
  return !!w && Array.isArray(w.days) && w.days.length === 7 && typeof w.kept === 'number' && typeof w.planned === 'number';
}

export async function fetchWeek(fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<WeekView> {
  const res = await fetchImpl(`/api/progress/week?date=${localDate(now)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as unknown;
  if (!isWeek(body)) throw new Error('Unexpected response');
  return { ...body, next: body.next ?? null };
}
