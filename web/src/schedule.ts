// Client for the parent's training days. The server checks the role and the training rules;
// this module only reads the days and sends the parent's choice.

import { localDate } from './training';

/** 0 is Sunday ... 6 Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TrainingDays {
  days: Weekday[];
  /** Each day's theme and its minutes by the server's one estimate (story 120). */
  themes: { day: Weekday; name: string; title: string; minutes?: number }[];
}

/** The week as the control shows it, Monday first. */
export const WEEK: readonly { day: Weekday; name: string }[] = [
  { day: 1, name: 'Mon' },
  { day: 2, name: 'Tue' },
  { day: 3, name: 'Wed' },
  { day: 4, name: 'Thu' },
  { day: 5, name: 'Fri' },
  { day: 6, name: 'Sat' },
  { day: 0, name: 'Sun' },
];

export const DAYS_PER_WEEK = 3;

/** A refused choice: the server's message, written for the parent. */
export class DaysRefused extends Error {}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };

function parse(body: unknown): TrainingDays {
  const b = body as Partial<TrainingDays> | null;
  if (!b || !Array.isArray(b.days) || !Array.isArray(b.themes)) throw new Error('Unexpected response');
  return { days: b.days, themes: b.themes };
}

export async function fetchTrainingDays(fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<TrainingDays> {
  const res = await fetchImpl(`/api/training/days?date=${localDate(now)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parse(await res.json());
}

export async function saveTrainingDays(
  days: readonly Weekday[],
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<TrainingDays> {
  const res = await fetchImpl('/api/training/days', {
    method: 'PUT',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ days, date: localDate(now) }),
  });
  // 400: the days break a rule. 503: the server could not save them; the old days stay.
  if (res.status === 400 || res.status === 503) {
    const body = (await res.json().catch(() => ({}))) as { message?: unknown };
    const fallback = res.status === 400 ? "Those days can't be used." : "Couldn't save the training days. Try again.";
    throw new DaysRefused(typeof body.message === 'string' ? body.message : fallback);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parse(await res.json());
}
