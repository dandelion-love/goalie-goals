// The demo household, for local development and showing the app: keeper Kai and parent Sam
// (the invented cast, at example.com), the themed week (src/weeklyPlan.ts) on training days
// picked relative to today, its sessions and cards approved, a few requests in the parent's
// inbox, and two weeks of history so XP and streaks show something.
//
// Stores are in memory, so the seed runs inside the server: at startup with GOALIE_DEMO_SEED=1,
// or through the dev-only reset route. Both refuse in production, without the mock identity,
// and against a target that holds any account outside the demo domain. Refusals never echo
// an account.

import { ConfigError } from './config.js';
import { MemoryApprovalStore, RenewableAuditLog, type ApprovalService } from './approvals.js';
import { DEMO_PARENT, seedDemoRequests, seedDemoSession } from './demoData.js';
import type { InAppNotifier } from './notifier.js';
import type { MemoryPainStore } from './pain.js';
import type { MemoryProgressStore, ProgressService } from './progress.js';
import type { Outcome } from './progression.js';
import { normaliseAccount, type MemoryRoleStore, type Role } from './roles.js';
import { MemoryScheduleStore, type ScheduleService } from './schedule.js';
import type { TrainingService } from './training.js';
import type { SessionTemplate } from './training.js';
import { sortWeekdays, weekdayOf, WeeklyPlan, type Week, type Weekday } from './weeklyPlan.js';

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
 * The dev-mock audit log: a `RenewableAuditLog`, so a demo reset drops the whole log and starts a
 * new one; it never edits or deletes an event.
 */
export class DemoAuditLog extends RenewableAuditLog {}

/** The seed or the reset would touch data that is not the demo household. */
export class DemoRefused extends ConfigError {}

/**
 * The demo's training days, picked so that today is always one (story 116): today's weekday
 * and the weekdays two and four days on. They are three days apart round the end of the week,
 * so no two are back to back, Sunday to Monday included.
 */
export function demoTrainingDays(today: string): Weekday[] {
  const w = weekdayOf(today);
  return sortWeekdays([w, ((w + 2) % 7) as Weekday, ((w + 4) % 7) as Weekday]);
}

/**
 * The demo's themed week (story 116): the real weekly plan, with one difference. Where the
 * real plan puts the first theme on the first training day of the week (Monday first), the
 * demo starts the themes on its anchor day, the seed date's weekday, and goes on in week order
 * from there, round the end of the week. So today is always Strong middle, on any weekday, and
 * the quality rubric's fixed screens are always there. With no anchor, or when the parent
 * picks days without it, the order is the real plan's. Only the dev mock uses this plan.
 */
export class DemoWeeklyPlan extends WeeklyPlan {
  /** The weekday that carries the first theme; null keeps the real plan's order. */
  anchor: Weekday | null = null;

  override weekOn(date: string): Week {
    const days = this.daysOn(date);
    const at = this.anchor === null ? -1 : days.indexOf(this.anchor);
    if (at < 0) return super.weekOn(date);
    const week: (SessionTemplate | null)[] = [null, null, null, null, null, null, null];
    days.forEach((_, i) => {
      if (i < this.pack.length) week[days[(at + i) % days.length]] = this.pack[i];
    });
    return week;
  }
}

export interface DemoDay {
  /** Days before the seed date; always one of the demo's training days. */
  daysAgo: number;
  kind: 'trained' | 'safety_stop';
  /** Sets the parent rated well; the server caps it at the planned sets. */
  praisedSets: number;
}

/**
 * The two weeks before the seed date, on the demo's training days only (3, 5 and 7 days back,
 * and a week before each): five trained sessions and one safety stop (Stop pressed on a
 * warning sign, which counts as a kept day). The days between are the plan's rest days. No
 * training day is missed, so the team streak runs 6 training days; today is left open for the
 * live demo. Every praised count is within each theme's planned sets (6 or 7), so the XP is
 * 6 session credits of 10 plus 17 stars of 2: 94.
 */
export const DEMO_HISTORY: readonly DemoDay[] = [
  { daysAgo: 14, kind: 'trained', praisedSets: 3 },
  { daysAgo: 12, kind: 'trained', praisedSets: 4 },
  { daysAgo: 10, kind: 'trained', praisedSets: 2 },
  { daysAgo: 7, kind: 'safety_stop', praisedSets: 1 },
  { daysAgo: 5, kind: 'trained', praisedSets: 4 },
  { daysAgo: 3, kind: 'trained', praisedSets: 3 },
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
  /** The themed week the training service runs on. */
  plan: DemoWeeklyPlan;
  /** The parent's training days, on the in-memory store the seed writes to. */
  schedule: ScheduleService;
  scheduleStore: MemoryScheduleStore;
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
  if (
    !(target.approvalStore instanceof MemoryApprovalStore) ||
    !(target.audit instanceof DemoAuditLog) ||
    !(target.scheduleStore instanceof MemoryScheduleStore)
  ) {
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

  // The parent's training days, in effect from the first day of history, so every seeded day
  // and today fall on the week the parent's panel shows. Written to the store as seed data,
  // not as a parent's change, so the parent's History does not list it.
  target.scheduleStore.clear();
  await target.scheduleStore.append({ from: shiftDate(today, -DEMO_HISTORY[0].daysAgo), days: demoTrainingDays(today) });
  await target.schedule.load();
  // Today carries the first theme, Strong middle, whatever the weekday.
  target.plan.anchor = weekdayOf(today);

  // The parent's inbox: real cards with their spec doses only (demoData.ts).
  await seedDemoRequests(target.approvals);
  // The whole pack, its three sessions and their cards, approved as the demo parent.
  await seedDemoSession(target.training, today);
  if (!(await target.training.today(today)).today) {
    throw new Error("The demo's session for today could not be approved: is a pack card missing from content/?");
  }

  for (const d of DEMO_HISTORY) {
    const date = shiftDate(today, -d.daysAgo);
    // Each day's record names the session the plan had that day, so its stars are capped at
    // that session's own planned sets.
    const template = target.plan.sessionFor(date);
    const session = template && target.training.currentSession(template);
    if (!session) throw new Error(`The demo history day ${d.daysAgo} days back is not a training day.`);
    const outcome: Outcome = d.kind === 'safety_stop' ? 'stopped' : 'done';
    const recordedBy: Role = 'keeper';
    await target.progress.record(
      {
        date,
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
