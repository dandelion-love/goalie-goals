// The device's outbox for session events (story #94): the start and the finish of a session.
//
// The front-end Decision lets the device hold these until the server confirms them: the date,
// the session id and version, the outcome, and the form ratings (the approved cue tapped for a
// rated set). Never notes or free text. Each event is deleted as soon as the server answers it,
// so an empty outbox leaves nothing on the device. Events go in the order they were made, one
// at a time; a send that fails on the network stops the run and waits for the next try (back
// online, the app opened again). Pain reports keep their own outbox in pain.ts.

import { localDate, type Session, type SessionResult } from './training';
import type { Credit, FinishProgress, ProgressSummary } from './progress';

export interface StartEvent {
  id: string;
  kind: 'start';
  date: string;
  itemId: string;
  itemVersion: string;
  /**
   * The start could not reach the server at the Start tap (offline, or the app closed first).
   * The server then accepts it even if the parent's undo landed first (story #94 AC2).
   */
  late: boolean;
}

export interface FinishEvent {
  id: string;
  kind: 'finish';
  date: string;
  itemId: string;
  itemVersion: string;
  outcome: SessionResult['outcome'];
  warmUpLogged: boolean;
  /** The form ratings: the approved cue tapped for each rated set. */
  praised: string[];
  /**
   * A stop queued at the Stop tap while Resume is still offered: kept, not sent. Resume deletes
   * it; the end of the Resume window, Done, or the app opening again releases it.
   */
  held: boolean;
}

export type OutboxEvent = StartEvent | FinishEvent;

export interface OutboxStore {
  read(): OutboxEvent[];
  write(events: OutboxEvent[]): void;
}

export const OUTBOX_KEY = 'goalie-goals.outbox';

const str = (v: unknown): v is string => typeof v === 'string';
const OUTCOMES: readonly string[] = ['done', 'stopped', 'hurt'];

/** Only the fields the Decision allows survive a read: anything else is dropped. */
function clean(value: unknown): OutboxEvent | null {
  const e = value as Record<string, unknown> | null;
  if (!e || !str(e.id) || !str(e.date) || !str(e.itemId) || !str(e.itemVersion)) return null;
  const base = { id: e.id, date: e.date, itemId: e.itemId, itemVersion: e.itemVersion };
  if (e.kind === 'start') return { ...base, kind: 'start', late: e.late === true };
  if (e.kind === 'finish' && str(e.outcome) && OUTCOMES.includes(e.outcome)) {
    return {
      ...base,
      kind: 'finish',
      outcome: e.outcome as FinishEvent['outcome'],
      warmUpLogged: e.warmUpLogged === true,
      praised: Array.isArray(e.praised) ? e.praised.filter(str) : [],
      held: e.held === true,
    };
  }
  return null;
}

/** localStorage, with an in-memory copy when storage is blocked or full. Empty: no key at all. */
export class LocalOutboxStore implements OutboxStore {
  private memory: OutboxEvent[] = [];

  constructor(private readonly storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {}

  read(): OutboxEvent[] {
    try {
      const raw = this.storage?.getItem(OUTBOX_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(clean).filter((e): e is OutboxEvent => e !== null);
      }
    } catch {
      // Fall back to the in-memory copy.
    }
    return this.memory.map((e) => ({ ...e }));
  }

  write(events: OutboxEvent[]): void {
    this.memory = events.map((e) => ({ ...e }));
    try {
      if (events.length) this.storage?.setItem(OUTBOX_KEY, JSON.stringify(events));
      else this.storage?.removeItem(OUTBOX_KEY);
    } catch {
      // The in-memory copy holds for this session.
    }
  }
}

export class MemoryOutboxStore implements OutboxStore {
  constructor(public events: OutboxEvent[] = []) {}
  read() {
    return this.events.map((e) => ({ ...e }));
  }
  write(events: OutboxEvent[]) {
    this.events = events.map((e) => ({ ...e }));
  }
}

function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function startEvent(session: Pick<Session, 'itemId' | 'itemVersion'>, now: Date = new Date()): StartEvent {
  return { id: newId(), kind: 'start', date: localDate(now), itemId: session.itemId, itemVersion: session.itemVersion, late: false };
}

export function finishEvent(result: SessionResult, now: Date = new Date(), held = false): FinishEvent {
  return {
    id: newId(),
    kind: 'finish',
    date: localDate(now),
    itemId: result.itemId,
    itemVersion: result.itemVersion,
    outcome: result.outcome,
    warmUpLogged: result.warmUpLogged,
    praised: [...result.praised],
    held,
  };
}

export function enqueue(store: OutboxStore, event: OutboxEvent): void {
  store.write([...store.read(), event]);
}

/** Delete an unsent event (Resume after Stop). True when it was there. */
export function cancel(store: OutboxStore, id: string): boolean {
  const events = store.read();
  const kept = events.filter((e) => e.id !== id);
  if (kept.length === events.length) return false;
  store.write(kept);
  return true;
}

/** Let a held stop go out. True when it was there. */
export function release(store: OutboxStore, id: string): boolean {
  const events = store.read();
  if (!events.some((e) => e.id === id)) return false;
  store.write(events.map((e) => (e.id === id && e.kind === 'finish' ? { ...e, held: false } : e)));
  return true;
}

/**
 * The app opened again: whatever is still in the outbox was made by an earlier run. A held
 * stop's Resume window has gone with that run, so it is released; a start still here never
 * reached the server at its tap, so it is late.
 */
export function prepareOnLaunch(store: OutboxStore): void {
  const events = store.read();
  if (!events.length) return;
  store.write(events.map((e) => (e.kind === 'finish' ? { ...e, held: false } : { ...e, late: true })));
}

/** The server's answer to one event. Every one of these deletes the event from the device. */
export type Answer =
  | { kind: 'confirmed'; progress: FinishProgress | null }
  /** A start the server refused: the version is not approved (or training is paused). */
  | { kind: 'refused' }
  /** The server will never take it (a bad request): dropped, so it cannot block the rest. */
  | { kind: 'rejected' };

export interface FlushResult {
  answers: Record<string, Answer>;
  /** Events still waiting on the device (held, or the network failed). */
  waiting: number;
}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json', 'Content-Type': 'application/json' };

/** Statuses worth trying again later: signed out (Reconnect), busy, or a server fault. */
const retry = (status: number) => status === 401 || status === 408 || status === 429 || status >= 500;

function isFinishProgress(body: unknown): body is FinishProgress {
  const b = body as { credit?: Credit; summary?: ProgressSummary } | null;
  return !!b && typeof b.credit?.total === 'number' && typeof b.summary?.xp?.total === 'number' && Array.isArray(b.summary.runs);
}

/** Send one event. Null: not answered, keep it for the next try. */
async function send(event: OutboxEvent, fetchImpl: typeof fetch): Promise<Answer | null> {
  const body =
    event.kind === 'start'
      ? { date: event.date, itemId: event.itemId, itemVersion: event.itemVersion, late: event.late }
      : {
          id: event.id,
          date: event.date,
          itemId: event.itemId,
          itemVersion: event.itemVersion,
          outcome: event.outcome,
          warmUpLogged: event.warmUpLogged,
          praised: event.praised,
        };
  let res: Response;
  try {
    res = await fetchImpl(event.kind === 'start' ? '/api/training/started' : '/api/progress/sessions', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
  } catch {
    return null;
  }
  if (retry(res.status)) return null;
  if (event.kind === 'start' && res.status === 409) return { kind: 'refused' };
  if (!res.ok) return { kind: 'rejected' };
  if (event.kind === 'start') return { kind: 'confirmed', progress: null };
  try {
    const answer: unknown = await res.json();
    return { kind: 'confirmed', progress: isFinishProgress(answer) ? answer : null };
  } catch {
    return { kind: 'confirmed', progress: null };
  }
}

async function flushOnce(store: OutboxStore, fetchImpl: typeof fetch): Promise<FlushResult> {
  const answers: Record<string, Answer> = {};
  for (;;) {
    const [head] = store.read();
    // In order: a held stop holds back whatever came after it.
    if (!head || (head.kind === 'finish' && head.held)) break;
    const answer = await send(head, fetchImpl);
    if (!answer) {
      // Not sent at the tap: from now on this start is late.
      if (head.kind === 'start' && !head.late) {
        store.write(store.read().map((e) => (e.id === head.id && e.kind === 'start' ? { ...e, late: true } : e)));
      }
      break;
    }
    // Answered: delete it from the device.
    store.write(store.read().filter((e) => e.id !== head.id));
    answers[head.id] = answer;
  }
  return { answers, waiting: store.read().length };
}

const running = new WeakMap<OutboxStore, Promise<FlushResult>>();

/**
 * Send what is waiting, oldest first. One run at a time per store: a call made during a run
 * waits for it, then runs again for anything added since, and gets both runs' answers.
 */
export function flushOutbox(store: OutboxStore, fetchImpl: typeof fetch = fetch): Promise<FlushResult> {
  const before = running.get(store);
  const run = (before ?? Promise.resolve<FlushResult>({ answers: {}, waiting: 0 })).then(async (first) => {
    const next = await flushOnce(store, fetchImpl);
    return { answers: before ? { ...first.answers, ...next.answers } : next.answers, waiting: next.waiting };
  });
  running.set(store, run);
  const done = () => {
    if (running.get(store) === run) running.delete(store);
  };
  run.then(done, done);
  return run;
}
