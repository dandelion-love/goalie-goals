// The parent's choice of training weekdays. The days are the household's own data: they live in
// the app's store, never in the repo or in deployment settings. Only a parent changes them,
// every change and every refused attempt goes in the audit log, and a choice that breaks the
// training rules (strength on consecutive days) is refused with a message the parent can read.

import { randomUUID } from 'node:crypto';
import type { AuditLog } from './approvals.js';
import type { ContentLibrary } from './content.js';
import type { Role } from './roles.js';
import {
  checkPlanRules,
  checkTrainingDays,
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
}

export class ScheduleError extends Error {
  constructor(
    readonly code: 'forbidden' | 'invalid',
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

    await this.store.append({ from: date, days: chosen });
    await this.load();
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
