// Client for today's session. The server sends approved item versions only; this module
// reads them and never builds a session of its own.

import type { Dossier } from './dossier';

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
  /** What the parent watches for in a set (story 112). */
  parentCheck: string[];
  stopIf: string[];
  easier: { variant: string; useWhen: string };
  dose: Dose;
  doseText: string;
  /**
   * The card's share of the session estimate (story 120), from the server: absent in a copy
   * saved on the device before it was sent, and then the player shows steps only.
   */
  seconds?: number;
  timer: 'reps' | 'interval' | 'countdown' | 'none';
  figureUrl: string;
  /** Still image from this exact approved card snapshot; older saved sessions may lack it. */
  figureStill?: string;
  credit: string;
  /** The card's dossier (story 115): sent only once the parent has approved it. */
  dossier?: Dossier;
}

export interface Session {
  itemId: string;
  itemVersion: string;
  title: string;
  minutes: number;
  warmUp: Move[];
  cards: Card[];
  coolDown: Move[];
  requiresGloves?: boolean;
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
/**
 * A session's length in plain words (story 120): "About 12 minutes". The number is always the
 * server's one estimate (`minutes`), so Today, the inbox, the training days and the week agree.
 */
export function aboutMinutes(minutes: number): string {
  return minutes === 1 ? 'About 1 minute' : `About ${minutes} minutes`;
}

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
  /** Each card's sets done and the cue ids rated good: the session's history record (story 113). */
  cards?: CardLog[];
}

/**
 * One card of a session as its history record keeps it (story 113). A cue's id is its position
 * in that card version's `cues` list: any change to the cues is a new card version, so an id
 * with its version always names the same cue. The cue text itself is never sent or kept.
 */
export interface CardLog {
  cardId: string;
  itemVersion: string;
  setsDone: number;
  /** One cue id for each set the parent rated good. */
  cues: number[];
}
