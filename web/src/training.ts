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
    today: isSession(body.today) ? body.today : null,
    // Only offered when today's is not approved, as the parent-approval Decision orders it.
    lastApproved: !isSession(body.today) && isSession(body.lastApproved) ? body.lastApproved : null,
    waiting: typeof body.waiting === 'number' ? body.waiting : 0,
  };
}

/** What a finished session hands on. XP and streaks (a later story) start from here. */
export interface SessionResult {
  itemId: string;
  itemVersion: string;
  outcome: 'done' | 'stopped' | 'hurt';
  /** Cues the parent marked as looking good, in order. */
  praised: string[];
  setsDone: number;
  startedAt: string;
  endedAt: string;
}
