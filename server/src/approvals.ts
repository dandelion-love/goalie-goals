// Parent approval: requests, approvals bound to one version of one item, and the audit log.
// Per the parent-approval Decision: silence is never consent, a request lapses after 7 days,
// and only a parent can approve. The store and the audit log sit behind interfaces: in memory
// for tests and the demo, in the household's Firestore data in production (story 118).

import { createHash, randomUUID } from 'node:crypto';
import { bumpEvidenceRevision, evidenceRevisionRef, readEvidenceRevision } from './evidenceRevision.js';
import { asDate, asObject, createOrdered, deleteCollection, prepareOrderedCreate, seqOf, type FsDb, type FsDocSnap, type FsTx } from './firestoreDb.js';
import type { Notifier } from './notifier.js';
import { isRole, type Role } from './roles.js';

export type RequestKind = 'plan' | 'exercise' | 'harder_version' | 'dossier';
export type RequestState = 'pending' | 'approved' | 'declined' | 'expired';

/** `dossier`: an exercise dossier (story 115), shown to the keeper only once approved. */
export const REQUEST_KINDS: readonly RequestKind[] = ['plan', 'exercise', 'harder_version', 'dossier'];

/** A request lapses to "not approved (expired)" after this long without an answer. */
export const REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How long a parent may undo an approval: 30 seconds, long enough to catch a mistaken tap
 * from the toast or the History entry, short enough that the keeper is unlikely to have
 * started the session yet. An undo after this, or once the session has started, is refused;
 * a later change of mind is a new request, never an edit of the past.
 */
export const UNDO_WINDOW_MS = 30 * 1000;

/**
 * How the audit names a start that was queued offline and landed after the parent's undo: the
 * keeper began in good faith, so the session and its XP stand.
 */
export const LATE_START_REASON = 'Started before the undo reached the device';

/** Earliest and latest civil time zones, in hours from UTC. */
const ZONE_BEHIND_H = 12;
const ZONE_AHEAD_H = 14;

/**
 * Whether the instant `at` falls on the calendar day `date` (YYYY-MM-DD) in some civil time
 * zone: the device sends its own local date, and the server does not know its zone.
 */
export function onLocalDate(at: Date, date: string): boolean {
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const t = at.getTime();
  return day(t - ZONE_BEHIND_H * 3_600_000) <= date && date <= day(t + ZONE_AHEAD_H * 3_600_000);
}

/** Injected so tests can move time; the system clock otherwise. */
export type Clock = () => Date;
export const systemClock: Clock = () => new Date();

/** What the parent approves and the keeper later sees, exactly as approved. */
export interface ItemContent {
  title: string;
  detail: string;
  /**
   * Internal: what else the version is bound to (card hashes, exact moves) that the plain
   * words leave out. Hashed into `itemVersion`, never stored with the request or shown.
   */
  binding?: string;
}

export interface ApprovalRequest {
  id: string;
  kind: RequestKind;
  itemId: string;
  /** Content hash of `content`: an approval covers this version only. */
  itemVersion: string;
  content: ItemContent;
  state: RequestState;
  createdAt: Date;
  decidedAt: Date | null;
  /** Account that approved or declined, or `system` for an expiry. Internal; not sent to clients. */
  decidedBy: string | null;
  reason: string | null;
}

export interface Decision {
  state: Exclude<RequestState, 'pending'>;
  decidedAt: Date;
  decidedBy: string;
  reason: string | null;
}

export interface ApprovalStore {
  create(request: ApprovalRequest): Promise<void>;
  get(id: string): Promise<ApprovalRequest | null>;
  list(filter?: { state?: RequestState }): Promise<ApprovalRequest[]>;
  /**
   * Move a pending request to a final state. Returns the updated request, or null when it
   * was not pending (a final state never changes again).
   */
  decide(id: string, decision: Decision): Promise<ApprovalRequest | null>;
  /** The approved request for exactly this item version, or null. */
  approvedVersion(itemId: string, itemVersion: string): Promise<ApprovalRequest | null>;
  /**
   * Undo an approval: move an approved request back to pending, the one way a final state
   * changes. Returns the reopened request, or null when it was not approved. The service
   * checks the undo window first; the audit log keeps the approval and the undo.
   */
  reopen(id: string): Promise<ApprovalRequest | null>;
}

export type AuditAction =
  | 'requested'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'refused'
  | 'paused'
  | 'cleared'
  /** The keeper marked a pain report "Tapped by mistake": a note, never a clear (story 104). */
  | 'marked'
  | 'changed'
  /** The parent undid an approval within `UNDO_WINDOW_MS`: its own event, never an edit. */
  | 'undone'
  /**
   * A session start queued on the keeper's device reached the server after the parent undid
   * an approval it uses: recorded with `LATE_START_REASON` (story #94).
   */
  | 'started'
  /** The parent started fresh: the first event of the new history (story 121). */
  | 'reset';

export interface AuditEvent {
  id: string;
  at: Date;
  action: AuditAction;
  actorRole: Role | 'system';
  /** Internal account reference; `system` for the app itself. Not sent to clients. */
  actor: string;
  /**
   * The request; for `pause` events the pain report (its content is never in the log); for
   * `schedule` events the change.
   */
  requestId: string;
  /**
   * `schedule`: the parent's choice of training days (src/schedule.ts). `household`: the parent
   * started fresh (story 121).
   */
  kind: RequestKind | 'pause' | 'schedule' | 'household';
  itemId: string;
  itemVersion: string;
  title: string;
  reason: string | null;
}

/** Append-only: there is no update and no delete. A correction is a new event. */
export interface AuditLog {
  append(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent>;
  list(): Promise<readonly AuditEvent[]>;
}

/** Content hash of an item: any edit gives a new version, which needs a new approval. */
export function itemVersion(content: ItemContent): string {
  const canonical = JSON.stringify(
    content.binding === undefined
      ? { title: content.title, detail: content.detail }
      : { title: content.title, detail: content.detail, binding: content.binding },
  );
  return `sha256:${createHash('sha256').update(canonical).digest('hex').slice(0, 32)}`;
}

function copy(r: ApprovalRequest): ApprovalRequest {
  return {
    ...r,
    content: { ...r.content },
    createdAt: new Date(r.createdAt),
    decidedAt: r.decidedAt ? new Date(r.decidedAt) : null,
  };
}

export class MemoryApprovalStore implements ApprovalStore {
  private readonly requests = new Map<string, ApprovalRequest>();

  async create(request: ApprovalRequest): Promise<void> {
    if (this.requests.has(request.id)) throw new Error('Request id already exists.');
    this.requests.set(request.id, copy(request));
  }

  async get(id: string): Promise<ApprovalRequest | null> {
    const r = this.requests.get(id);
    return r ? copy(r) : null;
  }

  async list(filter: { state?: RequestState } = {}): Promise<ApprovalRequest[]> {
    return [...this.requests.values()]
      .filter((r) => !filter.state || r.state === filter.state)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(copy);
  }

  async decide(id: string, decision: Decision): Promise<ApprovalRequest | null> {
    const r = this.requests.get(id);
    if (!r || r.state !== 'pending') return null;
    r.state = decision.state;
    r.decidedAt = new Date(decision.decidedAt);
    r.decidedBy = decision.decidedBy;
    r.reason = decision.reason;
    return copy(r);
  }

  async approvedVersion(itemId: string, version: string): Promise<ApprovalRequest | null> {
    for (const r of this.requests.values()) {
      if (r.state === 'approved' && r.itemId === itemId && r.itemVersion === version) return copy(r);
    }
    return null;
  }

  async reopen(id: string): Promise<ApprovalRequest | null> {
    const r = this.requests.get(id);
    if (!r || r.state !== 'approved') return null;
    r.state = 'pending';
    r.decidedAt = null;
    r.decidedBy = null;
    r.reason = null;
    return copy(r);
  }

  /** Dev-only demo reset (src/demo.ts). `ApprovalStore` itself has no delete. */
  clear(): void {
    this.requests.clear();
  }

  /** Delete every request: the household is deleted, or starts fresh (story 121). */
  async deleteAll(): Promise<void> {
    this.requests.clear();
  }
}

export class MemoryAuditLog implements AuditLog {
  readonly #events: AuditEvent[] = [];

  async append(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent> {
    const stored = Object.freeze({ ...event, id: randomUUID(), at: new Date(event.at) });
    this.#events.push(stored);
    return stored;
  }

  async list(): Promise<readonly AuditEvent[]> {
    return Object.freeze([...this.#events]);
  }
}

/**
 * The app's own audit log in memory. Each log it holds is a `MemoryAuditLog`, append-only as
 * ever; deleting the household, or starting fresh (story 121), drops the whole log and begins a
 * new one. It never edits or deletes an event.
 */
export class RenewableAuditLog implements AuditLog {
  #log = new MemoryAuditLog();

  append(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent> {
    return this.#log.append(event);
  }

  list(): Promise<readonly AuditEvent[]> {
    return this.#log.list();
  }

  /** Begin a new, empty log. */
  restart(): void {
    this.#log = new MemoryAuditLog();
  }

  async deleteAll(): Promise<void> {
    this.restart();
  }
}

/**
 * Firestore adapters (story 118): requests are `approvalRequests/{id}` and the audit log is
 * `auditEvents/{id}`, each with a sequence number so they list in the order they were written.
 * Only the server reaches them (src/firestoreDb.ts).
 */
export const APPROVALS_COLLECTION = 'approvalRequests';
export const AUDIT_COLLECTION = 'auditEvents';

const REQUEST_STATES: readonly RequestState[] = ['pending', 'approved', 'declined', 'expired'];

function readRequest(id: string, value: unknown): ApprovalRequest | null {
  const r = asObject(value);
  const content = asObject(r?.content);
  if (!r || !content || typeof content.title !== 'string' || typeof content.detail !== 'string') return null;
  const kind = REQUEST_KINDS.find((k) => k === r.kind);
  const state = REQUEST_STATES.find((k) => k === r.state);
  const createdAt = asDate(r.createdAt);
  const decidedAt = r.decidedAt === null ? null : asDate(r.decidedAt);
  if (!kind || !state || !createdAt || (r.decidedAt !== null && !decidedAt)) return null;
  if (typeof r.itemId !== 'string' || typeof r.itemVersion !== 'string') return null;
  return {
    id,
    kind,
    itemId: r.itemId,
    itemVersion: r.itemVersion,
    content: { title: content.title, detail: content.detail },
    state,
    createdAt,
    decidedAt,
    decidedBy: typeof r.decidedBy === 'string' ? r.decidedBy : null,
    reason: typeof r.reason === 'string' ? r.reason : null,
  };
}

function requestData(r: ApprovalRequest): Record<string, unknown> {
  return {
    kind: r.kind,
    itemId: r.itemId,
    itemVersion: r.itemVersion,
    // The words the parent approves only; the binding is hashed into the version, never stored.
    content: { title: r.content.title, detail: r.content.detail },
    state: r.state,
    createdAt: new Date(r.createdAt),
    decidedAt: r.decidedAt ? new Date(r.decidedAt) : null,
    decidedBy: r.decidedBy,
    reason: r.reason,
  };
}

/** Prepare an explicitly reviewed new approval and its audit event in the caller's transaction.
 * All reads happen before the returned function writes, as required by Firestore. */
export async function prepareReviewedApproval(tx: FsTx, db: FsDb, request: ApprovalRequest, event: Omit<AuditEvent, 'id'>): Promise<(() => void) | null> {
  if (request.state !== 'approved' || !request.decidedAt || event.action !== 'approved' || event.actorRole !== 'parent' ||
      event.requestId !== request.id || event.itemId !== request.itemId || event.itemVersion !== request.itemVersion ||
      event.kind !== request.kind || event.actor !== request.decidedBy) throw new Error('Invalid reviewed approval');
  const writeApproval = await prepareOrderedCreate(tx, db, APPROVALS_COLLECTION, request.id, requestData(request));
  const writeAudit = await prepareOrderedCreate(tx, db, AUDIT_COLLECTION, request.id, auditEventData(event) as unknown as Record<string, unknown>);
  if (!writeApproval || !writeAudit) return null;
  return () => { writeApproval(); writeAudit(); };
}

/** Well-formed requests from a listing, in the order they were made. */
function readRequests(docs: FsDocSnap[]): ApprovalRequest[] {
  return docs
    .map((d) => ({ seq: seqOf(d.data()), r: readRequest(d.id, d.data()) }))
    .filter((x): x is { seq: number; r: ApprovalRequest } => x.r !== null)
    .sort((a, b) => a.r.createdAt.getTime() - b.r.createdAt.getTime() || a.seq - b.seq)
    .map((x) => x.r);
}

export class FirestoreApprovalStore implements ApprovalStore {
  constructor(
    private readonly db: FsDb,
    private readonly collection = APPROVALS_COLLECTION,
  ) {}

  async create(request: ApprovalRequest): Promise<void> {
    if (!(await createOrdered(this.db, this.collection, request.id, requestData(request)))) {
      throw new Error('Request id already exists.');
    }
  }

  async get(id: string): Promise<ApprovalRequest | null> {
    const snap = await this.db.collection(this.collection).doc(id).get();
    return snap.exists ? readRequest(id, snap.data()) : null;
  }

  async list(filter: { state?: RequestState } = {}): Promise<ApprovalRequest[]> {
    const all = this.db.collection(this.collection);
    const snap = await (filter.state ? all.where('state', '==', filter.state) : all).get();
    return readRequests(snap.docs).filter((r) => !filter.state || r.state === filter.state);
  }

  /** A transaction, so two answers to one request never both land: a final state is final. */
  async decide(id: string, decision: Decision): Promise<ApprovalRequest | null> {
    return this.change(id, 'pending', (r) => ({
      ...r,
      state: decision.state,
      decidedAt: new Date(decision.decidedAt),
      decidedBy: decision.decidedBy,
      reason: decision.reason,
    }));
  }

  async approvedVersion(itemId: string, version: string): Promise<ApprovalRequest | null> {
    const snap = await this.db
      .collection(this.collection)
      .where('state', '==', 'approved')
      .where('itemId', '==', itemId)
      .where('itemVersion', '==', version)
      .get();
    return (
      readRequests(snap.docs).find((r) => r.state === 'approved' && r.itemId === itemId && r.itemVersion === version) ??
      null
    );
  }

  async reopen(id: string): Promise<ApprovalRequest | null> {
    return this.change(id, 'approved', (r) => ({ ...r, state: 'pending', decidedAt: null, decidedBy: null, reason: null }));
  }

  /** Delete every request: the household is deleted. `ApprovalStore` itself has no delete. */
  async deleteAll(): Promise<void> {
    await deleteCollection(this.db, this.collection);
  }

  private async change(
    id: string,
    from: RequestState,
    next: (r: ApprovalRequest) => ApprovalRequest,
  ): Promise<ApprovalRequest | null> {
    const ref = this.db.collection(this.collection).doc(id);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : undefined;
      const r = data ? readRequest(id, data) : null;
      if (!r || r.state !== from) return null;
      const done = next(r);
      const revision = evidenceRevisionRef(this.db);
      await readEvidenceRevision(tx, revision);
      tx.set(ref, { ...requestData(done), seq: seqOf(data) });
      bumpEvidenceRevision(tx, revision);
      return copy(done);
    });
  }
}

const AUDIT_ACTIONS: readonly AuditAction[] = [
  'requested',
  'approved',
  'declined',
  'expired',
  'refused',
  'paused',
  'cleared',
  'marked',
  'changed',
  'undone',
  'started',
  'reset',
];
const AUDIT_KINDS: readonly AuditEvent['kind'][] = [...REQUEST_KINDS, 'pause', 'schedule', 'household'];
const AUDIT_TEXT = ['actor', 'requestId', 'itemId', 'itemVersion', 'title'] as const;

function auditEventData(event: Omit<AuditEvent, 'id'>): Omit<AuditEvent, 'id'> {
  return { ...event, at: new Date(event.at) };
}

function readEvent(id: string, value: unknown): AuditEvent | null {
  const e = asObject(value);
  if (!e) return null;
  const action = AUDIT_ACTIONS.find((a) => a === e.action);
  const kind = AUDIT_KINDS.find((k) => k === e.kind);
  const actorRole = e.actorRole === 'system' ? 'system' : isRole(e.actorRole) ? e.actorRole : null;
  const at = asDate(e.at);
  if (!action || !kind || !actorRole || !at) return null;
  if (!AUDIT_TEXT.every((f) => typeof e[f] === 'string')) return null;
  return Object.freeze({
    id,
    at,
    action,
    actorRole,
    actor: e.actor as string,
    requestId: e.requestId as string,
    kind,
    itemId: e.itemId as string,
    itemVersion: e.itemVersion as string,
    title: e.title as string,
    reason: typeof e.reason === 'string' ? e.reason : null,
  });
}

/**
 * The audit log in Firestore: append-only, one document per event, created once and never
 * written again. The interface has no update and no delete; only `deleteAll`, when the household
 * itself is deleted, removes the log, and always the whole of it.
 */
export class FirestoreAuditLog implements AuditLog {
  constructor(
    private readonly db: FsDb,
    private readonly collection = AUDIT_COLLECTION,
  ) {}

  async append(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent> {
    const id = randomUUID();
    const data = auditEventData(event);
    if (!(await createOrdered(this.db, this.collection, id, data))) throw new Error('Audit event id already exists.');
    return Object.freeze({ ...data, id });
  }

  async list(): Promise<readonly AuditEvent[]> {
    const snap = await this.db.collection(this.collection).get();
    const events = snap.docs
      .map((d) => ({ seq: seqOf(d.data()), e: readEvent(d.id, d.data()) }))
      .filter((x): x is { seq: number; e: AuditEvent } => x.e !== null)
      .sort((a, b) => a.seq - b.seq || a.e.at.getTime() - b.e.at.getTime())
      .map((x) => x.e);
    return Object.freeze(events);
  }

  /** Delete the whole log with the household; never a single event. */
  async deleteAll(): Promise<void> {
    await deleteCollection(this.db, this.collection);
  }
}

export class ApprovalError extends Error {
  constructor(
    readonly code: 'not_found' | 'not_pending' | 'forbidden' | 'invalid' | 'too_late' | 'started',
    message: string,
  ) {
    super(message);
  }
}

export interface ProposeInput {
  kind: RequestKind;
  itemId: string;
  content: ItemContent;
}

export interface ApprovedItem {
  kind: RequestKind;
  itemId: string;
  itemVersion: string;
  content: ItemContent;
  approvedAt: Date;
}

export interface ApprovalServiceDeps {
  store: ApprovalStore;
  audit: AuditLog;
  notifier: Notifier;
  clock?: Clock;
}

const SYSTEM = 'system';

/** The request lifecycle. Every write is role-checked here, not only in the UI. */
export class ApprovalService {
  readonly store: ApprovalStore;
  readonly audit: AuditLog;
  readonly notifier: Notifier;
  private readonly clock: Clock;

  constructor({ store, audit, notifier, clock = systemClock }: ApprovalServiceDeps) {
    this.store = store;
    this.audit = audit;
    this.notifier = notifier;
    this.clock = clock;
  }

  expiresAt(request: ApprovalRequest): Date {
    return new Date(request.createdAt.getTime() + REQUEST_TTL_MS);
  }

  /** The app proposes an item version for the parent to approve. */
  async propose({ kind, itemId, content }: ProposeInput): Promise<ApprovalRequest> {
    if (!REQUEST_KINDS.includes(kind) || !itemId.trim() || !content.title.trim()) {
      throw new ApprovalError('invalid', 'A request needs a kind, an item id and a title.');
    }
    await this.expireDue();
    const version = itemVersion(content);
    const already = (await this.store.approvedVersion(itemId, version)) ??
      (await this.store.list({ state: 'pending' })).find((r) => r.itemId === itemId && r.itemVersion === version);
    if (already) return already;

    const request: ApprovalRequest = {
      id: randomUUID(),
      kind,
      itemId,
      itemVersion: version,
      content: { title: content.title, detail: content.detail },
      state: 'pending',
      createdAt: this.clock(),
      decidedAt: null,
      decidedBy: null,
      reason: null,
    };
    await this.store.create(request);
    await this.log(request, 'requested', SYSTEM, SYSTEM, null);
    await this.notifier.notify({ to: 'parent', ref: request.id, title: request.content.title });
    return request;
  }

  /** Lapse every pending request older than 7 days. Silence never approves. */
  async expireDue(): Promise<number> {
    const now = this.clock();
    let expired = 0;
    for (const r of await this.store.list({ state: 'pending' })) {
      if (now.getTime() < this.expiresAt(r).getTime()) continue;
      const done = await this.store.decide(r.id, {
        state: 'expired',
        decidedAt: now,
        decidedBy: SYSTEM,
        reason: 'No answer within 7 days',
      });
      if (!done) continue;
      expired += 1;
      await this.log(done, 'expired', SYSTEM, SYSTEM, done.reason);
      await this.notifier.withdraw(done.id);
    }
    return expired;
  }

  async pending(): Promise<ApprovalRequest[]> {
    await this.expireDue();
    return this.store.list({ state: 'pending' });
  }

  async approve(id: string, actor: { account: string; role: Role }): Promise<ApprovalRequest> {
    return this.decide(id, actor, 'approved', null);
  }

  async decline(id: string, actor: { account: string; role: Role }, reason: string | null): Promise<ApprovalRequest> {
    return this.decide(id, actor, 'declined', reason?.trim() || null);
  }

  private async decide(
    id: string,
    actor: { account: string; role: Role },
    state: 'approved' | 'declined',
    reason: string | null,
  ): Promise<ApprovalRequest> {
    await this.expireDue();
    const request = await this.store.get(id);
    // The role check comes first, so a keeper learns nothing about which requests exist.
    if (actor.role !== 'parent') {
      const verb = state === 'approved' ? 'approve' : 'decline';
      if (request) await this.log(request, 'refused', actor.role, actor.account, `The ${actor.role} may not ${verb}`);
      throw new ApprovalError('forbidden', 'Only a parent can answer a request.');
    }
    if (!request) throw new ApprovalError('not_found', 'No such request.');
    const done = await this.store.decide(id, { state, decidedAt: this.clock(), decidedBy: actor.account, reason });
    if (!done) throw new ApprovalError('not_pending', `This request is already ${request.state}.`);
    await this.log(done, state, actor.role, actor.account, reason);
    await this.notifier.withdraw(done.id);
    return done;
  }

  /** Milliseconds left to undo this approval; 0 when it is not approved or the window has passed. */
  undoForMs(request: ApprovalRequest): number {
    if (request.state !== 'approved' || !request.decidedAt) return 0;
    return Math.max(0, request.decidedAt.getTime() + UNDO_WINDOW_MS - this.clock().getTime());
  }

  /**
   * The parent undoes an approval within `UNDO_WINDOW_MS`. The request goes back to the inbox,
   * so the keeper no longer sees that version, and the undo is its own audit event. Refused
   * once the keeper has started a session that uses this version (`started` says so): a
   * session in progress is never pulled.
   */
  async undoApproval(
    id: string,
    actor: { account: string; role: Role },
    started: (request: ApprovalRequest) => Promise<boolean> = async () => false,
  ): Promise<ApprovalRequest> {
    const request = await this.store.get(id);
    if (actor.role !== 'parent') {
      if (request) await this.log(request, 'refused', actor.role, actor.account, `The ${actor.role} may not undo`);
      throw new ApprovalError('forbidden', 'Only a parent can undo an approval.');
    }
    if (!request) throw new ApprovalError('not_found', 'No such request.');
    if (request.state !== 'approved') throw new ApprovalError('not_pending', `This request is ${request.state}.`);
    if (this.undoForMs(request) <= 0) throw new ApprovalError('too_late', 'The undo window has passed.');
    if (await started(request)) throw new ApprovalError('started', 'The keeper has already started this session.');
    const reopened = await this.store.reopen(id);
    if (!reopened) throw new ApprovalError('not_pending', 'This request is no longer approved.');
    await this.log(reopened, 'undone', actor.role, actor.account, null);
    // It waits in the inbox again, so the badge counts it again.
    await this.notifier.notify({ to: 'parent', ref: reopened.id, title: reopened.content.title });
    return reopened;
  }

  /**
   * The request for this exact item version when its approval was undone on `date` (an
   * `undone` event in the audit log), or null. Used only to accept a start that was queued
   * before the undo reached the keeper's device, so it is bounded to the day of the undo: an
   * old undo never reopens a session. `date` is the device's local date; the undo counts as on
   * that date when the date is the undo's calendar day in some time zone (UTC-12 to UTC+14).
   */
  async undoneRequest(itemId: string, version: string, date: string): Promise<ApprovalRequest | null> {
    const undone = (await this.audit.list()).filter(
      (e) => e.action === 'undone' && e.itemId === itemId && e.itemVersion === version && onLocalDate(e.at, date),
    );
    for (const e of undone.reverse()) {
      const request = await this.store.get(e.requestId);
      if (request) return request;
    }
    return null;
  }

  /** Audit a start that landed after an undo of this request (story #94 AC2). */
  async logLateStart(request: ApprovalRequest, actor: { account: string; role: Role }): Promise<void> {
    await this.log(request, 'started', actor.role, actor.account, LATE_START_REASON);
  }

  /** True only when this exact version of the item was approved. */
  async isApproved(itemId: string, version: string): Promise<boolean> {
    return (await this.store.approvedVersion(itemId, version)) !== null;
  }

  /**
   * What the keeper may see: for each item, its most recently approved version. A newer
   * version still pending, declined or expired never shows; the last approved one runs meanwhile.
   */
  async approvedItems(): Promise<ApprovedItem[]> {
    await this.expireDue();
    const latest = new Map<string, ApprovalRequest>();
    for (const r of await this.store.list({ state: 'approved' })) {
      const seen = latest.get(r.itemId);
      if (!seen || (seen.decidedAt?.getTime() ?? 0) <= (r.decidedAt?.getTime() ?? 0)) latest.set(r.itemId, r);
    }
    return [...latest.values()].map((r) => ({
      kind: r.kind,
      itemId: r.itemId,
      itemVersion: r.itemVersion,
      content: { ...r.content },
      approvedAt: r.decidedAt!,
    }));
  }

  private async log(
    r: ApprovalRequest,
    action: AuditAction,
    actorRole: Role | 'system',
    actor: string,
    reason: string | null,
  ): Promise<void> {
    await this.audit.append({
      at: this.clock(),
      action,
      actorRole,
      actor,
      requestId: r.id,
      kind: r.kind,
      itemId: r.itemId,
      itemVersion: r.itemVersion,
      title: r.content.title,
      reason,
    });
  }
}
