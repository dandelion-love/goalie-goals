// Parent approval: requests, approvals bound to one version of one item, and the audit log.
// Per the parent-approval Decision: silence is never consent, a request lapses after 7 days,
// and only a parent can approve. Nothing here talks to the network; the store and the audit
// log sit behind interfaces so a Firestore adapter can replace the in-memory ones.

import { createHash, randomUUID } from 'node:crypto';
import type { Notifier } from './notifier.js';
import type { Role } from './roles.js';

export type RequestKind = 'plan' | 'exercise' | 'harder_version';
export type RequestState = 'pending' | 'approved' | 'declined' | 'expired';

export const REQUEST_KINDS: readonly RequestKind[] = ['plan', 'exercise', 'harder_version'];

/** A request lapses to "not approved (expired)" after this long without an answer. */
export const REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
}

export type AuditAction = 'requested' | 'approved' | 'declined' | 'expired' | 'refused' | 'paused' | 'cleared';

export interface AuditEvent {
  id: string;
  at: Date;
  action: AuditAction;
  actorRole: Role | 'system';
  /** Internal account reference; `system` for the app itself. Not sent to clients. */
  actor: string;
  /** The request, or for `pause` events the pain report (its content is never in the log). */
  requestId: string;
  kind: RequestKind | 'pause';
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

  /** Dev-only demo reset (src/demo.ts). `ApprovalStore` itself has no delete. */
  clear(): void {
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
 * Firestore adapters: stubs behind the same interfaces, not wired in yet. A later story maps
 * requests to `approvalRequests/{id}` and the audit log to `auditEvents/{id}` (create-only
 * security rules, so the database refuses updates and deletes too).
 */
export class FirestoreApprovalStore implements ApprovalStore {
  private notWired(): never {
    throw new Error('FirestoreApprovalStore is not wired yet; use MemoryApprovalStore.');
  }
  async create(): Promise<void> {
    this.notWired();
  }
  async get(): Promise<ApprovalRequest | null> {
    this.notWired();
  }
  async list(): Promise<ApprovalRequest[]> {
    this.notWired();
  }
  async decide(): Promise<ApprovalRequest | null> {
    this.notWired();
  }
  async approvedVersion(): Promise<ApprovalRequest | null> {
    this.notWired();
  }
}

export class FirestoreAuditLog implements AuditLog {
  async append(): Promise<AuditEvent> {
    throw new Error('FirestoreAuditLog is not wired yet; use MemoryAuditLog.');
  }
  async list(): Promise<readonly AuditEvent[]> {
    throw new Error('FirestoreAuditLog is not wired yet; use MemoryAuditLog.');
  }
}

export class ApprovalError extends Error {
  constructor(
    readonly code: 'not_found' | 'not_pending' | 'forbidden' | 'invalid',
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
