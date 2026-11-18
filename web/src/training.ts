// Client for today's session. The server sends approved item versions only; this module
// reads them and never builds a session of its own.

export interface Move {
  name: string;
  seconds: number;
  cue: string;
}

export interface Dose {
  kind: 'reps' | 'contacts' | 'efforts' | 'hold';
  sets: number;
  reps?: number;
  seconds?: number;
  distance_m?: number;
  per_side: boolean;
  rest_s: number;
  tempo?: string;
}

export interface Card {
  id: string;
  itemVersion: string;
  name: string;
  why: string;
  setup: Record<string, string>;
  steps: string[];
  cues: string[];
  mistakes: { mistake: string; fix: string }[];
  stopIf: string[];
  easier: { variant: string; useWhen: string };
  dose: Dose;
  doseText: string;
  timer: 'reps' | 'interval' | 'countdown' | 'none';
  figureUrl: string;
  credit: string;
}

export interface Session {
  itemId: string;
  itemVersion: string;
  title: string;
  minutes: number;
  warmUp: Move[];
  cards: Card[];
  coolDown: Move[];
}

export interface Today {
  date: string;
  planned: boolean;
  today: Session | null;
  lastApproved: Session | null;
  waiting: number;
  /** Training is paused after a pain report: nothing to train until the parent clears it. */
  paused: boolean;
}

/** The device's local date, YYYY-MM-DD: "today" is the keeper's day, not the server's. */
export function localDate(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function isSession(value: unknown): value is Session {
  const s = value as Session | null;
  return !!s && typeof s.itemId === 'string' && Array.isArray(s.cards) && Array.isArray(s.warmUp);
}

export async function fetchToday(fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<Today> {
  const res = await fetchImpl(`/api/training/today?date=${localDate(now)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as Partial<Today>;
  if (typeof body.planned !== 'boolean') throw new Error('Unexpected response');
  return {
    date: String(body.date ?? ''),
    planned: body.planned,
    today: body.paused !== true && isSession(body.today) ? body.today : null,
    // Only offered when today's is not approved, as the parent-approval Decision orders it.
    // Neither is offered while training is paused.
    lastApproved:
      body.paused !== true && !isSession(body.today) && isSession(body.lastApproved) ? body.lastApproved : null,
    waiting: typeof body.waiting === 'number' ? body.waiting : 0,
    paused: body.paused === true,
  };
}

/**
 * Tell the server the keeper started this session, so its approval can no longer be undone.
 * `refused`: the version is no longer approved (the parent just undid it). Offline or any other
 * answer: `unknown`, and the session runs from the device as approved when it was loaded.
 */
export async function markStarted(
  session: Pick<Session, 'itemId' | 'itemVersion'>,
  fetchImpl: typeof fetch = fetch,
): Promise<'ok' | 'refused' | 'unknown'> {
  try {
    const res = await fetchImpl('/api/training/started', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: session.itemId, itemVersion: session.itemVersion }),
    });
    if (res.ok) return 'ok';
    return res.status === 409 ? 'refused' : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** What a finished session hands on: XP and streaks are recorded from here (progress.ts). */
export interface SessionResult {
  itemId: string;
  itemVersion: string;
  outcome: 'done' | 'stopped' | 'hurt';
  /** Cues the parent marked as looking good, in order. */
  praised: string[];
  setsDone: number;
  /** The warm-up was logged (or the session had none): the session credit is earned from here. */
  warmUpLogged: boolean;
  startedAt: string;
  endedAt: string;
}
