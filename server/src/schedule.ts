// The parent's choice of training weekdays. The days are the household's own data: they live in
// the app's store, never in the repo or in deployment settings. Only a parent changes them,
// every change and every refused attempt goes in the audit log, and a choice that breaks the
// training rules (strength on consecutive days) is refused with a message the parent can read.

import { randomUUID } from 'node:crypto';
import type { AuditLog } from './approvals.js';
import type { ContentLibrary } from './content.js';
import type { Role } from './roles.js';
import { DATE_RE } from './training.js';
import {
  checkPlanRules,
  checkTrainingDays,
  isWeekday,
  layOut,
  sortWeekdays,
  weekdaysText,
  type ScheduleChange,
  type Weekday,
  type WeeklyPlan,
} from './weeklyPlan.js';

/** Changes of training days, oldest first. Behind an interface like the other stores. */
export interface ScheduleStore {
  list(): Promise<ScheduleChange[]>;
  append(change: ScheduleChange): Promise<void>;
}

export class MemoryScheduleStore implements ScheduleStore {
  #changes: ScheduleChange[] = [];

  async list(): Promise<ScheduleChange[]> {
    return this.#changes.map((c) => ({ from: c.from, days: [...c.days] }));
  }

  async append(change: ScheduleChange): Promise<void> {
    this.#changes.push({ from: change.from, days: [...change.days] });
  }

  /** Dev-only demo seed and reset (src/demo.ts). */
  clear(): void {
    this.#changes = [];
  }
}

/**
 * The slice of the Firestore client this store uses. The real `Firestore` class from
 * `@google-cloud/firestore` satisfies it; tests pass a fake. The project and database come
 * from the client's own configuration (src/config.ts), never from the repo.
 */
export interface ScheduleDb {
  collection(path: string): { doc(id: string): ScheduleDocRef };
  runTransaction<T>(update: (tx: ScheduleTransaction) => Promise<T>): Promise<T>;
}
export interface ScheduleDocRef {
  get(): Promise<ScheduleSnapshot>;
  /** Deletes the document; the real client has it (household deletion, story 118). */
  delete?(): Promise<unknown>;
}
export interface ScheduleSnapshot {
  exists: boolean;
  get(field: string): unknown;
}
export interface ScheduleTransaction {
  get(ref: ScheduleDocRef): Promise<ScheduleSnapshot>;
  set(ref: ScheduleDocRef, data: { changes: ScheduleChange[] }): unknown;
}

export const SCHEDULE_COLLECTION = 'schedules';
/** The household's one schedule document. */
export const SCHEDULE_DOC = 'household';

/** Keep only well-formed changes: a date and three weekdays, nothing else. */
function readChanges(value: unknown): ScheduleChange[] {
  if (!Array.isArray(value)) return [];
  const out: ScheduleChange[] = [];
  for (const c of value as unknown[]) {
    if (!c || typeof c !== 'object') continue;
    const { from, days } = c as { from?: unknown; days?: unknown };
    if (typeof from !== 'string' || !DATE_RE.test(from)) continue;
    if (!Array.isArray(days) || checkTrainingDays(days) !== null || !days.every(isWeekday)) continue;
    out.push({ from, days: [...days] });
  }
  return out;
}

/**
 * The training days in Firestore: one document, `schedules/household`, holding only the list of
 * changes, each the date it takes effect and its three weekdays, in the order they were made.
 * An append is a transaction, so a change is never lost to another writer.
 */
export class FirestoreScheduleStore implements ScheduleStore {
  constructor(
    private readonly db: ScheduleDb,
    private readonly collection = SCHEDULE_COLLECTION,
  ) {}

  private ref(): ScheduleDocRef {
    return this.db.collection(this.collection).doc(SCHEDULE_DOC);
  }

  async list(): Promise<ScheduleChange[]> {
    const snap = await this.ref().get();
    return snap.exists ? readChanges(snap.get('changes')) : [];
  }

  async append(change: ScheduleChange): Promise<void> {
    const ref = this.ref();
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const changes = snap.exists ? readChanges(snap.get('changes')) : [];
      changes.push({ from: change.from, days: [...change.days] });
      tx.set(ref, { changes: changes.map((c) => ({ from: c.from, days: [...c.days] })) });
    });
  }

  /** Delete the training days with the household (story 118). */
  async deleteAll(): Promise<void> {
    const ref = this.ref();
    if (!ref.delete) throw new Error('This Firestore client cannot delete documents.');
    await ref.delete();
  }
}

/** Shown to the parent when the store could not keep a change. */
export const SAVE_FAILED = "Couldn't save the training days. Try again.";

export class ScheduleError extends Error {
  constructor(
    readonly code: 'forbidden' | 'invalid' | 'unavailable',
    message: string,
  ) {
    super(message);
  }
}

export const SCHEDULE_REF = 'training-days';

export interface ScheduleServiceDeps {
  store: ScheduleStore;
  plan: WeeklyPlan;
  audit: AuditLog;
  /** The cards, to check the week the new days would give. */
  content: () => ContentLibrary;
  clock?: () => Date;
}

export class ScheduleService {
  private readonly store: ScheduleStore;
  readonly plan: WeeklyPlan;
  private readonly audit: AuditLog;
  private readonly content: () => ContentLibrary;
  private readonly clock: () => Date;

  constructor({ store, plan, audit, content, clock = () => new Date() }: ScheduleServiceDeps) {
    this.store = store;
    this.plan = plan;
    this.audit = audit;
    this.content = content;
    this.clock = clock;
  }

  /** Read the stored changes into the plan (startup, or after another writer). */
  async load(): Promise<void> {
    this.plan.load(await this.store.list());
  }

  /** The training days in effect on a date, Monday first. */
  days(date: string): Weekday[] {
    return this.plan.daysOn(date);
  }

  /**
   * Set the training days from `date` on. Only a parent may; a keeper's attempt is refused and
   * logged. The new week must keep every plan rule.
   */
  async set(actor: { account: string; role: Role }, days: readonly unknown[], date: string): Promise<Weekday[]> {
    if (actor.role !== 'parent') {
      await this.log(actor, 'refused', 'the training days', `The ${actor.role} may not change the training days`);
      throw new ScheduleError('forbidden', 'Only a parent can change the training days.');
    }
    const problem = checkTrainingDays(days);
    if (problem) throw new ScheduleError('invalid', problem);
    const chosen = sortWeekdays(days as Weekday[]);
    const broken = checkPlanRules(layOut(this.plan.pack, chosen), this.content());
    if (broken.length) throw new ScheduleError('invalid', broken[0]);

    // Write first; the plan in memory moves only once the store has the change.
    const change: ScheduleChange = { from: date, days: chosen };
    try {
      await this.store.append(change);
    } catch {
      // The error itself (its stack, any resource names) stays out of the audit.
      await this.log(actor, 'refused', 'the training days', 'The change could not be saved');
      throw new ScheduleError('unavailable', SAVE_FAILED);
    }
    try {
      await this.load();
    } catch {
      // The store has the change; if it cannot be read back now, apply it to what was loaded.
      this.plan.load([...this.plan.changeLog(), change]);
    }
    await this.log(actor, 'changed', `the training days (${weekdaysText(chosen)})`, null);
    return chosen;
  }

  private async log(
    actor: { account: string; role: Role },
    action: 'changed' | 'refused',
    title: string,
    reason: string | null,
  ): Promise<void> {
    await this.audit.append({
      at: this.clock(),
      action,
      actorRole: actor.role,
      actor: actor.account,
      requestId: randomUUID(),
      kind: 'schedule',
      itemId: SCHEDULE_REF,
      itemVersion: '',
      title,
      reason,
    });
  }
}
