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
import type { FsDb } from './firestoreDb.js';

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
  /** Parent-confirmed actual work, indexed by completed set; absent on older records. */
  squatSets?: (SquatSet | null)[];
}

export interface SquatSet { actualReps: number; clean: boolean; revision?: number }

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
  /** Absent for records made before session-instance binding. */
  instanceId?: string;
}

export interface SessionInstance {
  id: string;
  itemId: string;
  itemVersion: string;
  cards: { cardId: string; itemVersion: string }[];
  recordId: string | null;
}

/** The household's records. Behind an interface like the other stores. */
export interface HistoryStore {
  /** Keep a record; false (and nothing written) when one with its id is already kept. */
  add(record: HistoryRecord): Promise<boolean>;
  startInstance(instance: SessionInstance): Promise<boolean>;
  addBound(record: HistoryRecord, instanceId: string): Promise<boolean>;
  /** Verify the persisted instance binds this exact record and card versions. */
  isBound(record: HistoryRecord): Promise<boolean>;
  /** All stored records and starts, or null if any stored entry cannot be interpreted. */
  readinessSnapshot(): Promise<{ records: HistoryRecord[]; instances: SessionInstance[] } | null>;
  /** Every record, in no set order. */
  list(): Promise<HistoryRecord[]>;
  confirmSquatSet(id: string, version: string, set: number, evidence: SquatSet, previous: SquatSet | null): Promise<boolean>;
  /** Delete every record: the household's records go with the household. */
  deleteAll(): Promise<void>;
}

const copy = (r: HistoryRecord): HistoryRecord => ({ ...structuredClone(r), at: new Date(r.at) });

export class MemoryHistoryStore implements HistoryStore {
  #records = new Map<string, HistoryRecord>();
  #instances = new Map<string, SessionInstance>();

  async add(record: HistoryRecord): Promise<boolean> {
    if (this.#records.has(record.id)) return false;
    this.#records.set(record.id, copy(record));
    return true;
  }

  async startInstance(instance: SessionInstance): Promise<boolean> {
    const old = this.#instances.get(instance.id);
    if (old) return sameInstance(old, instance);
    this.#instances.set(instance.id, structuredClone(instance));
    return true;
  }

  async addBound(record: HistoryRecord, instanceId: string): Promise<boolean> {
    const instance = this.#instances.get(instanceId);
    if (!instance || !instanceMatches(instance, record)) return false;
    const previous = this.#records.get(record.id);
    if (instance.recordId !== null) return instance.recordId === record.id && !!previous && sameBoundRecord(previous, record, instanceId);
    if (previous) return false;
    this.#records.set(record.id, copy({ ...record, instanceId }));
    instance.recordId = record.id;
    return true;
  }

  async list(): Promise<HistoryRecord[]> {
    return [...this.#records.values()].map(copy);
  }

  async isBound(record: HistoryRecord): Promise<boolean> {
    const instance = record.instanceId ? this.#instances.get(record.instanceId) : undefined;
    return !!instance && instance.recordId === record.id && instanceMatches(instance, record);
  }

  async readinessSnapshot() {
    return { records: await this.list(), instances: [...this.#instances.values()].map((instance) => structuredClone(instance)) };
  }

  async confirmSquatSet(id: string, version: string, set: number, evidence: SquatSet, previous: SquatSet | null): Promise<boolean> {
    const record = this.#records.get(id);
    if (!record || !putSquatSet(record, version, set, evidence, previous)) return false;
    return true;
  }

  async deleteAll(): Promise<void> {
    this.#records.clear();
    this.#instances.clear();
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
export const INSTANCE_COLLECTION = 'sessionInstances';
const ALREADY_EXISTS = 6;
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

function sameInstance(a: SessionInstance, b: SessionInstance): boolean {
  return a.id === b.id && a.itemId === b.itemId && a.itemVersion === b.itemVersion && JSON.stringify(a.cards) === JSON.stringify(b.cards);
}
function instanceMatches(i: SessionInstance, r: HistoryRecord): boolean {
  return i.itemId === r.itemId && i.itemVersion === r.itemVersion &&
    JSON.stringify(i.cards) === JSON.stringify(r.cards.map(({ cardId, itemVersion }) => ({ cardId, itemVersion })));
}
function readInstance(id: string, value: unknown): SessionInstance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!ID_RE.test(id) || v.id !== id || typeof v.itemId !== 'string' || typeof v.itemVersion !== 'string' ||
      !(v.recordId === null || (typeof v.recordId === 'string' && ID_RE.test(v.recordId))) || !Array.isArray(v.cards) ||
      !v.cards.every((card) => card && typeof card === 'object' && typeof card.cardId === 'string' && typeof card.itemVersion === 'string')) return null;
  return { id, itemId: v.itemId, itemVersion: v.itemVersion, recordId: v.recordId as string | null, cards: v.cards.map((card) => ({ cardId: card.cardId, itemVersion: card.itemVersion })) };
}
function sameBoundRecord(old: HistoryRecord, next: HistoryRecord, instanceId: string): boolean {
  const comparable = (r: HistoryRecord) => ({ id: r.id, date: r.date, itemId: r.itemId, itemVersion: r.itemVersion,
    outcome: r.outcome, cards: r.cards.map(({ squatSets: _s, ...c }) => c) });
  return old.instanceId === instanceId && JSON.stringify(comparable(old)) === JSON.stringify(comparable(next));
}

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
  const squatSets = c.squatSets;
  if (squatSets !== undefined && (!Array.isArray(squatSets) || !squatSets.every((s) =>
    s === null || (s && typeof s === 'object' && isInt(s.actualReps, 1) && typeof s.clean === 'boolean' && isInt(s.revision, 1))))) return null;
  return {
    cardId: c.cardId,
    itemVersion: c.itemVersion,
    name: c.name,
    setsDone: c.setsDone,
    setsPlanned: c.setsPlanned,
    dose,
    cueIds: [...(c.cueIds as number[])],
    ...(squatSets !== undefined ? { squatSets: squatSets as (SquatSet | null)[] } : {}),
  };
}

function putSquatSet(record: HistoryRecord, version: string, set: number, evidence: SquatSet, previous: SquatSet | null): boolean {
  const card = record.cards.find((c) => c.cardId === 'squat-to-box' && c.itemVersion === version);
  if (!card || !isInt(set) || set >= card.setsDone || set >= card.setsPlanned || card.dose.kind !== 'reps' ||
      !isInt(evidence.actualReps, 1) || !isInt(card.dose.reps, 1) || evidence.actualReps > card.dose.reps ||
      typeof evidence.clean !== 'boolean') return false;
  const sets = [...(card.squatSets ?? [])];
  const current = sets[set] ?? null;
  const sameValue = (a: SquatSet | null, b: SquatSet | null) => a === null ? b === null : b !== null && a.actualReps === b.actualReps && a.clean === b.clean;
  if (current && sameValue(current, evidence) && current.revision === (previous?.revision ?? 0) + 1) return true;
  if (!sameValue(current, previous) || (current?.revision ?? 0) !== (previous?.revision ?? 0)) return false;
  while (sets.length <= set) sets.push(null);
  sets[set] = { ...evidence, revision: (current?.revision ?? 0) + 1 };
  card.squatSets = sets;
  return true;
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
  if (r.instanceId !== undefined && (typeof r.instanceId !== 'string' || !ID_RE.test(r.instanceId))) return null;
  return { id, date: r.date, itemId: r.itemId, itemVersion: r.itemVersion, title: r.title, outcome, cards: cards as CardRecord[], at: when,
    ...(typeof r.instanceId === 'string' ? { instanceId: r.instanceId } : {}) };
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

  async startInstance(instance: SessionInstance): Promise<boolean> {
    const db = this.db as unknown as FsDb;
    const ref = db.collection(INSTANCE_COLLECTION).doc(instance.id);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return sameInstance(snap.data() as unknown as SessionInstance, instance);
      tx.create(ref, { ...instance });
      return true;
    });
  }

  async addBound(record: HistoryRecord, instanceId: string): Promise<boolean> {
    const db = this.db as unknown as FsDb;
    const start = db.collection(INSTANCE_COLLECTION).doc(instanceId);
    const history = db.collection(this.collection).doc(record.id);
    return db.runTransaction(async (tx) => {
      const startSnap = await tx.get(start);
      const historySnap = await tx.get(history);
      if (!startSnap.exists) return false;
      const instance = startSnap.data() as unknown as SessionInstance;
      if (!instanceMatches(instance, record)) return false;
      if (instance.recordId !== null) {
        const previous = readRecord(record.id, historySnap.data());
        return instance.recordId === record.id && !!previous && sameBoundRecord(previous, record, instanceId);
      }
      if (historySnap.exists) return false;
      const { id: _id, ...data } = record;
      tx.create(history, { ...data, instanceId });
      tx.set(start, { ...instance, recordId: record.id });
      return true;
    });
  }

  async list(): Promise<HistoryRecord[]> {
    const snap = await this.db.collection(this.collection).get();
    return snap.docs.map((d) => readRecord(d.id, d.data())).filter((r): r is HistoryRecord => r !== null);
  }

  async isBound(record: HistoryRecord): Promise<boolean> {
    if (!record.instanceId) return false;
    const db = this.db as unknown as FsDb;
    const instance = (await db.collection(INSTANCE_COLLECTION).doc(record.instanceId).get()).data() as SessionInstance | undefined;
    return !!instance && instance.recordId === record.id && instanceMatches(instance, record);
  }

  async readinessSnapshot() {
    const [history, starts] = await Promise.all([this.db.collection(this.collection).get(), this.db.collection(INSTANCE_COLLECTION).get()]);
    const records = history.docs.map((doc) => readRecord(doc.id, doc.data()));
    const instances = starts.docs.map((doc) => readInstance(doc.id, doc.data()));
    if (records.some((r) => !r) || instances.some((i) => !i)) return null;
    return { records: records as HistoryRecord[], instances: instances as SessionInstance[] };
  }

  async confirmSquatSet(id: string, version: string, set: number, evidence: SquatSet, previous: SquatSet | null): Promise<boolean> {
    // Use the same document as history, so household deletion removes confirmations too.
    const db = this.db as unknown as FsDb;
    if (typeof db.runTransaction !== 'function') throw new Error('History transactions unavailable');
    const ref = db.collection(this.collection).doc(id);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const record = readRecord(id, snap.data());
      if (!record || !putSquatSet(record, version, set, evidence, previous)) return false;
      const { id: _id, ...data } = record;
      tx.set(ref, data);
      return true;
    });
  }

  async deleteAll(): Promise<void> {
    const snap = await this.db.collection(this.collection).get();
    for (const d of snap.docs) await d.ref.delete();
    const instances = await this.db.collection(INSTANCE_COLLECTION).get();
    for (const d of instances.docs) await d.ref.delete();
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

const BODY_FIELDS = new Set(['id', 'date', 'itemId', 'itemVersion', 'outcome', 'cards', 'instanceId']);
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
  itemVersion?: string;
  squatSets?: (SquatSet | null)[];
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

/** A description of recorded evidence, not a clean-session or readiness count. */
export type SquatEvidenceDetail = 'no-record' | 'ambiguous' | 'incomplete' | 'missing-confirmation' | 'not-clean' | 'below-target' | 'safety-unknown';

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

  async startInstance(id: string, itemId: string, itemVersion: string): Promise<boolean> {
    if (!ID_RE.test(id)) return false;
    const shape = this.training.sessionCards(itemId, itemVersion);
    if (!shape) return false;
    return this.store.startInstance({ id, itemId, itemVersion, cards: shape.cards.map(({ cardId, itemVersion: version }) => ({ cardId, itemVersion: version })), recordId: null });
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
    const { id, date, itemId, itemVersion, outcome, cards, instanceId } = body;
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
    if (instanceId !== undefined && (typeof instanceId !== 'string' || !ID_RE.test(instanceId))) return refuse(400, 'invalid');
    for (const c of cards) {
      if (!isObject(c)) return refuse(400, 'invalid');
      if (!onlyFields(c, CARD_FIELDS)) return refuse(400, 'unknown-field');
      if (typeof c.cardId !== 'string' || typeof c.itemVersion !== 'string' || !isInt(c.setsDone)) return refuse(400, 'invalid');
      if (!Array.isArray(c.cues) || !c.cues.every((n) => isInt(n))) return refuse(400, 'invalid');
    }
    if (instanceId === undefined && (await this.store.list()).some((r) => r.id === id)) return refuse(409, 'duplicate');
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
    if (!(instanceId === undefined ? await this.store.add(record) : await this.store.addBound(record, instanceId as string))) return refuse(409, 'duplicate');
    return { ok: true };
  }

  /** The newest records first (by the keeper's date, then by arrival), as the homes show them. */
  async recent(limit = RECENT): Promise<HistoryView[]> {
    const records = (await this.store.list()).sort(
      (a, b) => b.date.localeCompare(a.date) || b.at.getTime() - a.at.getTime(),
    );
    return records.slice(0, limit).map((r) => this.view(r));
  }

  async squatEvidenceDetail(): Promise<SquatEvidenceDetail> {
    const records = (await this.store.list())
      .flatMap((record) => record.cards.filter((card) => card.cardId === 'squat-to-box').map((card) => ({ record, card })))
      .sort((a, b) => b.record.date.localeCompare(a.record.date));
    if (!records.length) return 'no-record';
    const latest = records[0];
    if (records.length > 1 && records[1].record.date === latest.record.date) return 'ambiguous';
    const { record, card } = latest;
    if (record.outcome !== 'done' || card.setsDone !== card.setsPlanned || card.setsDone === 0) return 'incomplete';
    if (!card.squatSets || card.squatSets.length !== card.setsDone || card.squatSets.some((set) => !set)) return 'missing-confirmation';
    if (card.squatSets.some((set) => !set!.clean)) return 'not-clean';
    // The squat-to-box ladder's recorded goal is 2 x 15 (progression-library Decision).
    if (card.dose.kind === 'reps' && card.dose.reps !== undefined &&
        (card.setsPlanned < 2 || card.dose.reps < 15 || card.squatSets.some((set) => set!.actualReps < 15))) return 'below-target';
    return 'safety-unknown';
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
        ...(c.cardId === 'squat-to-box' ? { itemVersion: c.itemVersion, squatSets: c.squatSets ?? [] } : {}),
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
