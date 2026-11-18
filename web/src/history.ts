// Client for the session history (story 113). The keeper's device sends each record through
// the outbox (outbox.ts) with the finish; both homes read the recent sessions here. Like the
// approvals History, it always comes from the network and is never stored on the device.

export type Ending = 'done' | 'stopped' | 'hurt';

export interface HistoryCard {
  cardId: string;
  name: string;
  setsDone: number;
  setsPlanned: number;
  /** The work of one set: "12 reps", "20 s hold". */
  work: string;
  goodCount: number;
  /** The cues rated good, looked up by id against the card version on the server. */
  goodCues: string[];
}

export interface HistorySession {
  id: string;
  date: string;
  title: string;
  outcome: Ending;
  setsDone: number;
  setsPlanned: number;
  goodCount: number;
  cards: HistoryCard[];
}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };

/** How each ending reads in the list: at most three words. */
export const ENDING_TEXT: Record<Ending, string> = {
  done: 'Done',
  stopped: 'Stopped',
  hurt: 'Stopped for safety',
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "5 of 6 sets, 3 good-form cues". */
export function setsLine(s: Pick<HistorySession, 'setsDone' | 'setsPlanned' | 'goodCount'>): string {
  return `${s.setsDone} of ${plural(s.setsPlanned, 'set', 'sets')}, ${plural(s.goodCount, 'good-form cue', 'good-form cues')}`;
}

function isSession(v: unknown): v is HistorySession {
  const s = v as HistorySession | null;
  return (
    !!s &&
    typeof s.id === 'string' &&
    typeof s.date === 'string' &&
    typeof s.title === 'string' &&
    (s.outcome === 'done' || s.outcome === 'stopped' || s.outcome === 'hurt') &&
    typeof s.setsDone === 'number' &&
    typeof s.setsPlanned === 'number' &&
    typeof s.goodCount === 'number' &&
    Array.isArray(s.cards)
  );
}

export async function fetchHistory(fetchImpl: typeof fetch = fetch): Promise<HistorySession[]> {
  const res = await fetchImpl('/api/history/sessions', { credentials: 'same-origin', cache: 'no-store', headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { sessions?: unknown };
  return Array.isArray(body.sessions) ? body.sessions.filter(isSession) : [];
}
