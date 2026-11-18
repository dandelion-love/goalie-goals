// The household's session history (story 113): one record for each session that finished or
// stopped, with each card's sets done and dose and the cues the parent rated good.
//
// What a record holds, and nothing else: the keeper's local date, the session (its id, version
// and title), how it ended (done, stopped, or stopped for safety), and for each card its id,
// version, name, sets done, sets planned, dose (reps or seconds) and the ids of the cues rated
// good. The title, names and doses come from the server's own copy of the approved version,
// never from the device. No free text, no notes and no body data: a "Something hurts" stop
// keeps only that outcome here; the report itself stays with the pain flow (src/pain.ts).
//
// Cue ids. A card's cues are plain strings in its file, so a cue's id is its position (0, 1, 2,
// ...) in that card version's `cues` list. A card version is a hash of the card's content
// (src/training.ts), so any change to the cues, their wording or their order, is a new version:
// an id read with the version it was recorded under always names the same cue. The cue text is
// never stored; the history looks it up against the card version when it is shown.
//
// Only the keeper's device sends a record, for a session the server saw start, once per record
// id. Anything else is refused, and the refusal is logged by role and reason only: nothing about
// the record itself reaches a log. Records live in the household's own store: in memory, or a
// Firestore collection of their own. `deleteAll` removes every record with the household.

import type { Role } from './roles.js';
import type { Dose, DoseKind } from './content.js';
import { DATE_RE, type TrainingService } from './training.js';
import type { Outcome } from './progression.js';

export const OUTCOMES: readonly Outcome[] = ['done', 'stopped', 'hurt'];

/** The work of one set, as the record keeps it: reps, or seconds for a hold. */
export interface RecordDose {
  kind: DoseKind;
  reps?: number;
  seconds?: number;
  perSide: boolean;
}

export interface CardRecord {
  cardId: string;
  itemVersion: string;
  name: string;
  setsDone: number;
  setsPlanned: number;
  dose: RecordDose;
  /** Positions in the card version's cue list, one for each set rated good. */
  cueIds: number[];
}

export interface HistoryRecord {
  /** The device's id for this record: a resend with the same id is kept once. */
  id: string;
  /** The keeper's local date (YYYY-MM-DD). */
  date: string;
  itemId: string;
  itemVersion: string;
  title: string;
  outcome: Outcome;
  cards: CardRecord[];
  at: Date;
}

/** The household's records. Behind an interface like the other stores. */
export interface HistoryStore {
  /** Keep a record; false (and nothing written) when one with its id is already kept. */
  add(record: HistoryRecord): Promise<boolean>;
  /** Every record, in no set order. */
  list(): Promise<HistoryRecord[]>;
  /** Delete every record: the household's records go with the household. */
  deleteAll(): Promise<void>;
}

const copy = (r: HistoryRecord): HistoryRecord => ({ ...structuredClone(r), at: new Date(r.at) });

export class MemoryHistoryStore implements HistoryStore {
  #records = new Map<string, HistoryRecord>();

  async add(record: HistoryRecord): Promise<boolean> {
    if (this.#records.has(record.id)) return false;
    this.#records.set(record.id, copy(record));
    return true;
  }

  async list(): Promise<HistoryRecord[]> {
    return [...this.#records.values()].map(copy);
  }

  async deleteAll(): Promise<void> {
    this.#records.clear();
  }
}

/**
 * The slice of the Firestore client this store uses. The real `Firestore` class satisfies it;
 * tests pass a fake. The project and database come from the client's configuration.
 */
export interface HistoryDb {
  collection(path: string): HistoryCollectionRef;
}
export interface HistoryCollectionRef {
  doc(id: string): HistoryDocRef;
  get(): Promise<{ docs: HistoryDocSnap[] }>;
}
export interface HistoryDocRef {
  /** Fails with code 6 (ALREADY_EXISTS) when the document is there: the id is kept once. */
  create(data: Record<string, unknown>): Promise<unknown>;
  delete(): Promise<unknown>;
}
export interface HistoryDocSnap {
  id: string;
  ref: HistoryDocRef;
  data(): unknown;
}

export const HISTORY_COLLECTION = 'sessionHistory';
const ALREADY_EXISTS = 6;
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

const isInt = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min;
const DOSE_KINDS: readonly DoseKind[] = ['reps', 'contacts', 'efforts', 'hold'];

function readDose(value: unknown): RecordDose | null {
  const d = value as Record<string, unknown> | null;
  if (!d || typeof d !== 'object') return null;
  const kind = DOSE_KINDS.find((k) => k === d.kind);
  if (!kind || typeof d.perSide !== 'boolean') return null;
  const dose: RecordDose = { kind, perSide: d.perSide };
  if (isInt(d.reps)) dose.reps = d.reps;
  if (isInt(d.seconds)) dose.seconds = d.seconds;
  return dose;
}

function readCard(value: unknown): CardRecord | null {
  const c = value as Record<string, unknown> | null;
  if (!c || typeof c !== 'object') return null;
  const dose = readDose(c.dose);
  if (typeof c.cardId !== 'string' || typeof c.itemVersion !== 'string' || typeof c.name !== 'string') return null;
  if (!isInt(c.setsDone) || !isInt(c.setsPlanned) || !dose || !Array.isArray(c.cueIds)) return null;
  if (!c.cueIds.every((n) => isInt(n))) return null;
  return {
    cardId: c.cardId,
    itemVersion: c.itemVersion,
    name: c.name,
    setsDone: c.setsDone,
    setsPlanned: c.setsPlanned,
    dose,
    cueIds: [...(c.cueIds as number[])],
  };
}

/** A stored document back to a record; null (left out) when it is not well formed. */
export function readRecord(id: string, value: unknown): HistoryRecord | null {
  const r = value as Record<string, unknown> | null;
  if (!r || typeof r !== 'object' || !ID_RE.test(id)) return null;
  const outcome = OUTCOMES.find((o) => o === r.outcome);
  const at = r.at as { toDate?: () => Date } | Date | string | undefined;
  const when = at instanceof Date ? at : typeof at === 'string' ? new Date(at) : at?.toDate?.();
  if (typeof r.date !== 'string' || !DATE_RE.test(r.date) || !outcome || !when || Number.isNaN(when.getTime())) return null;
  if (typeof r.itemId !== 'string' || typeof r.itemVersion !== 'string' || typeof r.title !== 'string') return null;
  if (!Array.isArray(r.cards)) return null;
  const cards = r.cards.map(readCard);
  if (cards.some((c) => c === null)) return null;
  return { id, date: r.date, itemId: r.itemId, itemVersion: r.itemVersion, title: r.title, outcome, cards: cards as CardRecord[], at: when };
}

/**
 * The records in Firestore: one document per record in their own collection, keyed by the
 * record id. `create` refuses an id that is there, so a resend is kept once even across writers.
 */
export class FirestoreHistoryStore implements HistoryStore {
  constructor(
    private readonly db: HistoryDb,
    private readonly collection = HISTORY_COLLECTION,
  ) {}

  async add(record: HistoryRecord): Promise<boolean> {
    const { id, ...data } = structuredClone(record);
    try {
      await this.db.collection(this.collection).doc(id).create({ ...data, at: new Date(record.at) });
      return true;
    } catch (e) {
      if ((e as { code?: unknown } | null)?.code === ALREADY_EXISTS) return false;
      throw e;
    }
  }

  async list(): Promise<HistoryRecord[]> {
    const snap = await this.db.collection(this.collection).get();
    return snap.docs.map((d) => readRecord(d.id, d.data())).filter((r): r is HistoryRecord => r !== null);
  }

  async deleteAll(): Promise<void> {
    const snap = await this.db.collection(this.collection).get();
    for (const d of snap.docs) await d.ref.delete();
  }
}

/** Why a record was refused: logged with the sender's role, and nothing else. */
export type RefusalReason =
  | 'not-keeper'
  | 'unknown-field'
  | 'invalid'
  | 'duplicate'
  | 'not-started'
  | 'cards-mismatch';

export type SubmitResult = { ok: true } | { ok: false; status: number; reason: RefusalReason };

const BODY_FIELDS = new Set(['id', 'date', 'itemId', 'itemVersion', 'outcome', 'cards']);
const CARD_FIELDS = new Set(['cardId', 'itemVersion', 'setsDone', 'cues']);

const onlyFields = (o: object, allowed: Set<string>) => Object.keys(o).every((k) => allowed.has(k));
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** The work of one set in words: "12 reps", "20 s hold each side". */
export function workText(d: RecordDose): string {
  const side = d.perSide ? ' each side' : '';
  if (d.kind === 'hold') return `${d.seconds ?? 0} s hold${side}`;
  const unit = d.kind === 'contacts' ? 'contacts' : d.kind === 'efforts' ? 'efforts' : 'reps';
  return `${d.reps ?? 0} ${unit}${side}`;
}

function recordDose(d: Dose): RecordDose {
  const dose: RecordDose = { kind: d.kind, perSide: d.per_side };
  if (d.kind === 'hold') dose.seconds = d.seconds ?? 0;
  else dose.reps = d.reps ?? 0;
  return dose;
}

export interface HistoryCardView {
  cardId: string;
  name: string;
  setsDone: number;
  setsPlanned: number;
  work: string;
  /** How many sets were rated good. */
  goodCount: number;
  /** The cues rated good, each once, in the card's order; empty when the version is unknown. */
  goodCues: string[];
}

export interface HistoryView {
  id: string;
  date: string;
  title: string;
  outcome: Outcome;
  setsDone: number;
  setsPlanned: number;
  goodCount: number;
  cards: HistoryCardView[];
}

export interface HistoryServiceDeps {
  store: HistoryStore;
  training: Pick<TrainingService, 'hasStarted' | 'sessionCards' | 'cardCues'>;
  clock?: () => Date;
}

/** How many records the homes show. */
export const RECENT = 10;

export class HistoryService {
  readonly store: HistoryStore;
  private readonly training: HistoryServiceDeps['training'];
  private readonly clock: () => Date;

  constructor({ store, training, clock = () => new Date() }: HistoryServiceDeps) {
    this.store = store;
    this.training = training;
    this.clock = clock;
  }

  /**
   * Keep a record sent by `role`. Only the keeper's, with allowlisted fields only, for a session
   * that was started, once per id; each card of that session once, its sets and cue ids within
   * the card version.
   */
  async submit(role: Role | null, body: unknown): Promise<SubmitResult> {
    const refuse = (status: number, reason: RefusalReason): SubmitResult => ({ ok: false, status, reason });
    if (role !== 'keeper') return refuse(403, 'not-keeper');
    if (!isObject(body)) return refuse(400, 'invalid');
    if (!onlyFields(body, BODY_FIELDS)) return refuse(400, 'unknown-field');
    const { id, date, itemId, itemVersion, outcome, cards } = body;
    const ending = OUTCOMES.find((o) => o === outcome);
    if (
      typeof id !== 'string' ||
      !ID_RE.test(id) ||
      typeof date !== 'string' ||
      !DATE_RE.test(date) ||
      typeof itemId !== 'string' ||
      typeof itemVersion !== 'string' ||
      !ending ||
      !Array.isArray(cards)
    ) {
      return refuse(400, 'invalid');
    }
    for (const c of cards) {
      if (!isObject(c)) return refuse(400, 'invalid');
      if (!onlyFields(c, CARD_FIELDS)) return refuse(400, 'unknown-field');
      if (typeof c.cardId !== 'string' || typeof c.itemVersion !== 'string' || !isInt(c.setsDone)) return refuse(400, 'invalid');
      if (!Array.isArray(c.cues) || !c.cues.every((n) => isInt(n))) return refuse(400, 'invalid');
    }
    if ((await this.store.list()).some((r) => r.id === id)) return refuse(409, 'duplicate');
    const shape = this.training.sessionCards(itemId, itemVersion);
    if (!shape || !this.training.hasStarted({ itemId, itemVersion })) return refuse(409, 'not-started');

    // Every card of the session, once each, in its order; sets and cue ids within the card.
    if (cards.length !== shape.cards.length) return refuse(400, 'cards-mismatch');
    const kept: CardRecord[] = [];
    for (const [i, card] of shape.cards.entries()) {
      const sent = cards[i] as { cardId: string; itemVersion: string; setsDone: number; cues: number[] };
      if (sent.cardId !== card.cardId || sent.itemVersion !== card.itemVersion) return refuse(400, 'cards-mismatch');
      if (sent.setsDone > card.dose.sets || sent.cues.length > sent.setsDone) return refuse(400, 'cards-mismatch');
      if (sent.cues.some((n) => n >= card.cues.length)) return refuse(400, 'cards-mismatch');
      kept.push({
        cardId: card.cardId,
        itemVersion: card.itemVersion,
        name: card.name,
        setsDone: sent.setsDone,
        setsPlanned: card.dose.sets,
        dose: recordDose(card.dose),
        cueIds: [...sent.cues],
      });
    }
    const record: HistoryRecord = { id, date, itemId, itemVersion, title: shape.title, outcome: ending, cards: kept, at: this.clock() };
    // A resend racing the first is kept once: the store has the last word.
    if (!(await this.store.add(record))) return refuse(409, 'duplicate');
    return { ok: true };
  }

  /** The newest records first (by the keeper's date, then by arrival), as the homes show them. */
  async recent(limit = RECENT): Promise<HistoryView[]> {
    const records = (await this.store.list()).sort(
      (a, b) => b.date.localeCompare(a.date) || b.at.getTime() - a.at.getTime(),
    );
    return records.slice(0, limit).map((r) => this.view(r));
  }

  /** Delete the household's records (the household is deleted, or the demo reset). */
  async deleteHousehold(): Promise<void> {
    await this.store.deleteAll();
  }

  private view(r: HistoryRecord): HistoryView {
    const cards = r.cards.map((c): HistoryCardView => {
      const cues = this.training.cardCues(c.itemVersion);
      const good = cues ? [...new Set(c.cueIds)].sort((a, b) => a - b).map((n) => cues[n]).filter((t): t is string => !!t) : [];
      return {
        cardId: c.cardId,
        name: c.name,
        setsDone: c.setsDone,
        setsPlanned: c.setsPlanned,
        work: workText(c.dose),
        goodCount: c.cueIds.length,
        goodCues: good,
      };
    });
    return {
      id: r.id,
      date: r.date,
      title: r.title,
      outcome: r.outcome,
      setsDone: cards.reduce((s, c) => s + c.setsDone, 0),
      setsPlanned: cards.reduce((s, c) => s + c.setsPlanned, 0),
      goodCount: cards.reduce((s, c) => s + c.goodCount, 0),
      cards,
    };
  }
}
