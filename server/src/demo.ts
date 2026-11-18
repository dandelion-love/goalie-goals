// The demo household, for local development and showing the app: keeper Kai and parent Sam
// (the invented cast, at example.com), approved demo cards and today's starter session, a few
// requests in the parent's inbox, and a week of history so XP and streaks show something.
//
// Stores are in memory, so the seed runs inside the server: at startup with GOALIE_DEMO_SEED=1,
// or through the dev-only reset route. Both refuse in production, without the mock identity,
// and against a target that holds any account outside the demo domain. Refusals never echo
// an account.

import { ConfigError } from './config.js';
import {
  MemoryApprovalStore,
  MemoryAuditLog,
  type ApprovalService,
  type AuditEvent,
  type AuditLog,
} from './approvals.js';
import { DEMO_PARENT, seedDemoRequests, seedDemoSession } from './demoData.js';
import type { InAppNotifier } from './notifier.js';
import type { MemoryPainStore } from './pain.js';
import type { MemoryProgressStore, ProgressService } from './progress.js';
import type { Outcome } from './progression.js';
import { normaliseAccount, type MemoryRoleStore, type Role } from './roles.js';
import { STARTER_SESSION, type SessionTemplate, type TrainingPlan, type TrainingService } from './training.js';

export { DEMO_PARENT } from './demoData.js';
export const DEMO_KEEPER = { account: 'kai@example.com', role: 'keeper' as const };

/** Only accounts at this domain are demo accounts. */
export const DEMO_DOMAIN = 'example.com';

export function isDemoAccount(account: string): boolean {
  const a = normaliseAccount(account);
  const at = a.lastIndexOf('@');
  return at > 0 && a.slice(at + 1) === DEMO_DOMAIN;
}

/**
 * The dev-mock audit log. Each log it holds is a `MemoryAuditLog`, append-only as ever; a demo
 * reset drops the whole log and starts a new one, it never edits or deletes an event.
 */
export class DemoAuditLog implements AuditLog {
  #log = new MemoryAuditLog();

  append(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent> {
    return this.#log.append(event);
  }

  list(): Promise<readonly AuditEvent[]> {
    return this.#log.list();
  }

  /** Dev-only demo reset: begin a new, empty log for the new household. */
  restart(): void {
    this.#log = new MemoryAuditLog();
  }
}

/** The seed or the reset would touch data that is not the demo household. */
export class DemoRefused extends ConfigError {}

/** The starter session every day, except the demo week's planned rest day. */
export class DemoPlan implements TrainingPlan {
  readonly restDates = new Set<string>();
  constructor(private readonly template: SessionTemplate = STARTER_SESSION) {}
  sessionFor(date: string): SessionTemplate | null {
    return this.restDates.has(date) ? null : this.template;
  }
}

export interface DemoDay {
  /** Days before the seed date. */
  daysAgo: number;
  kind: 'trained' | 'rest' | 'safety_stop';
  /** Sets the parent rated well; the server caps it at the planned sets. */
  praisedSets: number;
}

/**
 * The week before the seed date: several trained days, one planned rest day and one safety
 * stop (Stop pressed on a warning sign, which counts as a kept day). No day is missed, so the
 * team streak runs the whole week; today is left open for the live demo.
 */
export const DEMO_WEEK: readonly DemoDay[] = [
  { daysAgo: 7, kind: 'trained', praisedSets: 3 },
  { daysAgo: 6, kind: 'trained', praisedSets: 4 },
  { daysAgo: 5, kind: 'trained', praisedSets: 2 },
  { daysAgo: 4, kind: 'rest', praisedSets: 0 },
  { daysAgo: 3, kind: 'safety_stop', praisedSets: 1 },
  { daysAgo: 2, kind: 'trained', praisedSets: 4 },
  { daysAgo: 1, kind: 'trained', praisedSets: 3 },
];

/** Everything the seed writes to. Only the in-memory stores qualify. */
export interface DemoTarget {
  production: boolean;
  devMockIdentity: boolean;
  roles: MemoryRoleStore;
  approvalStore: MemoryApprovalStore;
  audit: DemoAuditLog;
  notifier: InAppNotifier;
  approvals: ApprovalService;
  training: TrainingService;
  plan: DemoPlan;
  progressStore: MemoryProgressStore;
  progress: ProgressService;
  pain: MemoryPainStore;
}

/** Every account the target holds: roles, deciders of requests, and audit actors. */
async function accountsIn(target: DemoTarget): Promise<string[]> {
  const accounts = new Set<string>(target.roles.accounts());
  for (const r of await target.approvalStore.list()) if (r.decidedBy && r.decidedBy !== 'system') accounts.add(r.decidedBy);
  for (const e of await target.audit.list()) if (e.actor !== 'system') accounts.add(e.actor);
  return [...accounts];
}

/** Throws `DemoRefused` unless the target is a local, mock-identity, demo-only household. */
export async function assertDemoTarget(target: DemoTarget): Promise<void> {
  if (target.production) throw new DemoRefused('The demo household is refused in production.');
  if (!target.devMockIdentity) throw new DemoRefused('The demo household runs with the mock identity only.');
  if (!(target.approvalStore instanceof MemoryApprovalStore) || !(target.audit instanceof DemoAuditLog)) {
    throw new DemoRefused('The demo household runs on the in-memory stores only.');
  }
  const outsiders = (await accountsIn(target)).filter((a) => !isDemoAccount(a));
  if (outsiders.length) {
    // Never name the account: this message reaches logs and the dev route's reply.
    throw new DemoRefused(`Refusing: the data holds ${outsiders.length} account(s) outside @${DEMO_DOMAIN}.`);
  }
}

/** YYYY-MM-DD in the machine's own time zone: the demo runs locally, as the web app's date does. */
export function localDate(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function populate(target: DemoTarget, today: string): Promise<void> {
  target.roles.set(DEMO_KEEPER.account, DEMO_KEEPER.role);
  target.roles.set(DEMO_PARENT.account, DEMO_PARENT.role);

  target.plan.restDates.clear();
  for (const d of DEMO_WEEK) if (d.kind === 'rest') target.plan.restDates.add(shiftDate(today, -d.daysAgo));

  // The parent's inbox: real cards with their spec doses only (demoData.ts).
  await seedDemoRequests(target.approvals);
  // Today's starter session and its cards, approved as the demo parent.
  await seedDemoSession(target.training, today);
  const session = (await target.training.today(today)).today;
  if (!session) throw new Error('The demo session could not be approved: is a starter card missing from content/?');

  for (const d of DEMO_WEEK) {
    if (d.kind === 'rest') continue;
    const outcome: Outcome = d.kind === 'safety_stop' ? 'stopped' : 'done';
    const recordedBy: Role = 'keeper';
    await target.progress.record(
      {
        date: shiftDate(today, -d.daysAgo),
        itemId: session.itemId,
        itemVersion: session.itemVersion,
        outcome,
        warmUpLogged: true,
        praisedSets: d.praisedSets,
        present: ['keeper', 'parent'],
      },
      recordedBy,
    );
  }
}

/** Seed the demo household into a fresh target (server startup). */
export async function seedDemoHousehold(target: DemoTarget, today: string = localDate()): Promise<void> {
  await assertDemoTarget(target);
  await populate(target, today);
}

/** Wipe the in-memory household and seed it again, as of `today`. */
export async function resetDemoHousehold(target: DemoTarget, today: string = localDate()): Promise<void> {
  await assertDemoTarget(target);
  target.roles.clear();
  target.approvalStore.clear();
  target.audit.restart();
  target.notifier.clear();
  target.progressStore.clear();
  target.pain.clear();
  target.training.clearStarted();
  await populate(target, today);
}
