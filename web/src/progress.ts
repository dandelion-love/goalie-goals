// Client for XP and streaks. The server applies the progression rules (server/src/progression.ts);
// this module only reads the shared summary. A finished session goes through the outbox
// (outbox.ts), so it reaches the server even when it ends offline.

import { localDate } from './training';

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

/**
 * The finish screen's progress line: `saving` while it is sent, `queued` when it waits on the
 * device for the network (story #94), `unsaved` when the server would not take it.
 */
export type FinishProgressState = FinishProgress | 'saving' | 'queued' | 'unsaved' | null;

/** The server could not be reached at all (offline), as opposed to an error answer. */
export class OfflineError extends Error {
  constructor() {
    super('offline');
  }
}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };

function isSummary(value: unknown): value is ProgressSummary {
  const s = value as ProgressSummary | null;
  return !!s && typeof s.xp?.total === 'number' && typeof s.team?.current === 'number' && Array.isArray(s.runs);
}

/** Day kinds that mean today's session is over: trained (together or solo) or stopped for safety. */
const DONE_KINDS = new Set(['together', 'solo', 'safety_stop']);

/** True once today's session has been recorded, so the home offers nothing more to train. */
export function isDoneForToday(summary: Pick<ProgressSummary, 'today'>): boolean {
  return summary.today !== null && DONE_KINDS.has(summary.today);
}

export async function fetchProgress(fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<ProgressSummary> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/progress/summary?date=${localDate(now)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: HEADERS,
    });
  } catch {
    throw new OfflineError();
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as unknown;
  if (!isSummary(body)) throw new Error('Unexpected response');
  return body;
}
