// Client for XP and streaks. The server applies the progression rules (server/src/progression.ts);
// this module only sends a finished session and reads the shared summary.

import { localDate, type SessionResult } from './training';

export interface Credit {
  session: number;
  stars: number;
  form: number;
  total: number;
}

export interface StreakView {
  current: number;
  best: number;
}

export interface Run {
  start: string;
  end: string;
  days: number;
}

export interface ProgressSummary {
  date: string;
  xp: { total: number; today: number };
  team: StreakView;
  keeper: StreakView;
  parent: StreakView;
  today: string | null;
  runs: Run[];
}

/** What the finish screen shows: this session's credit and the streaks after it. */
export interface FinishProgress {
  credit: Credit;
  summary: ProgressSummary;
}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };

function isSummary(value: unknown): value is ProgressSummary {
  const s = value as ProgressSummary | null;
  return !!s && typeof s.xp?.total === 'number' && typeof s.team?.current === 'number' && Array.isArray(s.runs);
}

export async function recordSession(
  result: SessionResult,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<FinishProgress> {
  const res = await fetchImpl('/api/progress/sessions', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: localDate(now),
      itemId: result.itemId,
      itemVersion: result.itemVersion,
      outcome: result.outcome,
      warmUpLogged: result.warmUpLogged,
      praised: result.praised,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { credit?: Credit; summary?: unknown };
  if (!body.credit || !isSummary(body.summary)) throw new Error('Unexpected response');
  return { credit: body.credit, summary: body.summary };
}

export async function fetchProgress(fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<ProgressSummary> {
  const res = await fetchImpl(`/api/progress/summary?date=${localDate(now)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as unknown;
  if (!isSummary(body)) throw new Error('Unexpected response');
  return body;
}
