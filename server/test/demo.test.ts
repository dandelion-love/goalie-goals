import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { ConfigError, loadConfig, type Config } from '../src/config.js';
import { ApprovalService, MemoryApprovalStore } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { MemoryPainStore, PainService } from '../src/pain.js';
import { MemoryProgressStore, ProgressService } from '../src/progress.js';
import { MemoryRoleStore } from '../src/roles.js';
import { TrainingService } from '../src/training.js';
import { loadContent } from '../src/content.js';
import { DEMO_REQUESTS } from '../src/demoData.js';
import { MemoryScheduleStore, ScheduleService } from '../src/schedule.js';
import { checkPlanRules, checkTrainingDays, STARTER_PACK, weekdayOf, WeeklyPlan } from '../src/weeklyPlan.js';
import {
  DEMO_HISTORY,
  DemoAuditLog,
  DemoRefused,
  DemoWeeklyPlan,
  demoTrainingDays,
  isDemoAccount,
  localDate,
  resetDemoHousehold,
  seedDemoHousehold,
  shiftDate,
  type DemoTarget,
} from '../src/demo.js';

/** Every card's dossier request (story 115), in the order the content is read. */
const DOSSIER_REQUESTS = [
  'dossier-broad-jump-stick',
  'dossier-glute-bridge',
  'dossier-lateral-shuffle',
  'dossier-plank',
  'dossier-pogo-hops',
  'dossier-set-position',
  'dossier-side-plank',
  'dossier-split-squat',
  'dossier-squat-to-box',
  'dossier-wall-chest-pass',
  'dossier-wall-push-up',
];

// Fixtures: the invented cast (keeper Kai, parent Sam) at example.com. The outsider is an
// obviously fake address at another reserved example domain: it is not a demo account.
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const OUTSIDER = 'someone@example.org';
const TODAY = '2026-03-10';

function devConfig(overrides: Partial<Config> = {}): Config {
  return {
    audience: '',
    devMockIdentity: true,
    devMockAccount: KAI,
    roleSeed: '',
    roleStore: 'memory',
    port: 0,
    webRoot: '',
    production: false,
    demoSeed: true,
    ...overrides,
  };
}

/** A target built the way app.ts builds it, for the seed functions on their own. */
function target(overrides: Partial<DemoTarget> = {}): DemoTarget {
  const roles = new MemoryRoleStore();
  const approvalStore = new MemoryApprovalStore();
  const audit = new DemoAuditLog();
  const notifier = new InAppNotifier();
  const approvals = new ApprovalService({ store: approvalStore, audit, notifier });
  const plan = new DemoWeeklyPlan();
  const training = new TrainingService({ approvals, content: loadContent(), plan });
  const scheduleStore = new MemoryScheduleStore();
  const schedule = new ScheduleService({ store: scheduleStore, plan, audit, content: () => training.library });
  const pain = new MemoryPainStore();
  const painService = new PainService({ store: pain, audit, notifier });
  const progressStore = new MemoryProgressStore();
  const progress = new ProgressService({
    store: progressStore,
    plan,
    plannedSets: (v) => training.plannedSets(v),
    pauses: painService,
  });
  return {
    production: false,
    devMockIdentity: true,
    roles,
    approvalStore,
    audit,
    notifier,
    approvals,
    training,
    plan,
    schedule,
    scheduleStore,
    progressStore,
    progress,
    pain,
    ...overrides,
  };
}

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

const as = (account: string) => ({ cookie: `dev_as=${encodeURIComponent(account)}` });

describe('demo accounts', () => {
  it('are accounts at example.com only', () => {
    expect(isDemoAccount(KAI)).toBe(true);
    expect(isDemoAccount(' Sam@Example.com ')).toBe(true);
    expect(isDemoAccount(OUTSIDER)).toBe(false);
    expect(isDemoAccount('example.com')).toBe(false);
  });
});

describe('seed the demo household (AC1)', () => {
  it('creates Kai and Sam, the inbox, the approved themed week and two weeks of history', async () => {
    const t = target();
    await seedDemoHousehold(t, TODAY);

    expect(await t.roles.roleFor(KAI)).toBe('keeper');
    expect(await t.roles.roleFor(SAM)).toBe('parent');

    // The inbox holds the demo requests: real cards at their spec doses (demoData.ts), and every
    // card's dossier (story 115), left waiting for the demo parent.
    const pending = await t.approvals.pending();
    expect(pending.map((r) => r.itemId)).toEqual([...DEMO_REQUESTS.map((r) => r.itemId), ...DOSSIER_REQUESTS]);

    // The invented Tuesday is a training day carrying Strong middle, approved.
    expect(weekdayOf(TODAY)).toBe(2);
    expect(t.schedule.days(TODAY)).toEqual([2, 4, 6]);
    const today = await t.training.today(TODAY);
    expect(today.today?.title).toBe('Strong middle');
    expect(today.today?.cards.map((c) => c.id)).toEqual(['plank', 'side-plank', 'glute-bridge']);
    // Every card of the pack is approved, so each theme plays on its day.
    expect((await t.training.approvedCards()).map((c) => c.id).sort()).toEqual(
      [...new Set(STARTER_PACK.flatMap((s) => s.cardIds))].sort(),
    );
    expect((await t.training.today(shiftDate(TODAY, 2))).today?.title).toBe('Spring legs');
    expect((await t.training.today(shiftDate(TODAY, 4))).today?.title).toBe('Quick feet, strong arms');
    expect((await t.training.today(shiftDate(TODAY, 1))).planned).toBe(false);

    // Two weeks of history on the training days: trained, one safety stop, rest between, none missed.
    const days = await t.progress.days(TODAY);
    const kinds = Object.fromEntries(days.map((d) => [d.date, d.kind]));
    expect(days[0].date).toBe(shiftDate(TODAY, -14));
    expect(kinds[shiftDate(TODAY, -7)]).toBe('safety_stop');
    expect(kinds[shiftDate(TODAY, -1)]).toBe('rest');
    expect(kinds[shiftDate(TODAY, -2)]).toBe('rest');
    expect(days.filter((d) => d.kind === 'together').map((d) => d.date)).toEqual(
      DEMO_HISTORY.filter((d) => d.kind === 'trained').map((d) => shiftDate(TODAY, -d.daysAgo)),
    );
    expect(days.some((d) => d.kind === 'missed')).toBe(false);
    // Each record names the session the plan had on its day.
    const records = await t.progressStore.list();
    expect(records.map((r) => r.itemId)).toEqual([
      'session-strong-middle',
      'session-spring-legs',
      'session-quick-feet-strong-arms',
      'session-strong-middle',
      'session-spring-legs',
      'session-quick-feet-strong-arms',
    ]);

    // The documented start (docs/demo.md): streaks of 6 training days and 94 XP.
    const summary = await t.progress.summary(TODAY);
    expect(summary.team.current).toBe(6);
    expect(summary.keeper.current).toBe(6);
    expect(summary.parent.current).toBe(6);
    expect(summary.xp.total).toBe(94);
    expect(summary.xp.today).toBe(0);
    expect(summary.today).toBeNull();
    // The seeded days are seed data, not a parent's change: the parent's History has none.
    expect((await t.audit.list()).some((e) => e.kind === 'schedule')).toBe(false);
  });

  it('makes every weekday a training day carrying Strong middle, with valid days and the same streak and XP', async () => {
    // An invented week: Monday 2026-03-09 to Sunday 2026-03-15.
    for (let i = 0; i < 7; i++) {
      const date = shiftDate('2026-03-09', i);
      const days = demoTrainingDays(date);
      expect(checkTrainingDays(days)).toBeNull();
      expect(days).toContain(weekdayOf(date));

      const t = target();
      await seedDemoHousehold(t, date);
      // Today is the first theme; the other two follow two and four days on.
      expect((await t.training.today(date)).today?.title).toBe('Strong middle');
      expect((await t.training.today(date)).today?.cards.map((c) => c.id)).toEqual(['plank', 'side-plank', 'glute-bridge']);
      expect(t.plan.sessionFor(shiftDate(date, 2))?.title).toBe('Spring legs');
      expect(t.plan.sessionFor(shiftDate(date, 4))?.title).toBe('Quick feet, strong arms');
      // The demo's week keeps every plan rule.
      expect(checkPlanRules(t.plan.weekOn(date), loadContent())).toEqual([]);
      const summary = await t.progress.summary(date);
      expect([summary.team.current, summary.keeper.current, summary.parent.current, summary.xp.total]).toEqual([6, 6, 6, 94]);
    }
  });

  it("starts the themes on the anchor only in the demo's plan; the real plan stays Monday first", () => {
    const thu = '2026-03-12';
    const days = demoTrainingDays(thu); // Mon, Thu, Sat
    const demo = new DemoWeeklyPlan();
    const real = new WeeklyPlan();
    for (const p of [demo, real]) p.load([{ from: '2026-03-01', days }]);
    const titles = (p: WeeklyPlan) => days.map((d) => p.weekOn(thu)[d]?.title);
    // No anchor: the same as the real plan.
    expect(titles(demo)).toEqual(titles(real));
    expect(titles(real)).toEqual(['Strong middle', 'Spring legs', 'Quick feet, strong arms']);
    demo.anchor = weekdayOf(thu);
    expect(titles(demo)).toEqual(['Quick feet, strong arms', 'Strong middle', 'Spring legs']);
    expect(titles(real)).toEqual(['Strong middle', 'Spring legs', 'Quick feet, strong arms']);
    // Days the parent picks without the anchor day go back to the real order.
    demo.load([{ from: '2026-03-01', days: [2, 5, 0] }]); // Tue, Fri, Sun: no Thursday
    expect([2, 5, 0].map((d) => demo.weekOn(thu)[d]?.title)).toEqual(['Strong middle', 'Spring legs', 'Quick feet, strong arms']);
  });

  it('runs at server start with the flag, and the app serves the household', async () => {
    app = await buildApp({ config: devConfig() });
    const date = localDate();
    expect((await app.inject({ url: '/api/me', headers: as(KAI) })).json()).toEqual({ role: 'keeper' });
    expect((await app.inject({ url: '/api/me', headers: as(SAM) })).json()).toEqual({ role: 'parent' });
    const inbox = await app.inject({ url: '/api/approvals/pending', headers: as(SAM) });
    expect(inbox.statusCode).toBe(200);
    expect(JSON.stringify(inbox.json())).toContain('Squat to box');
    // Today is always a training day, and always Strong middle, approved, whatever the weekday.
    const today = (await app.inject({ url: `/api/training/today?date=${date}`, headers: as(KAI) })).json();
    expect(today.planned).toBe(true);
    expect(today.today?.title).toBe('Strong middle');
    const summary = (await app.inject({ url: `/api/progress/summary?date=${date}`, headers: as(KAI) })).json();
    expect(summary.team.current).toBe(6);
    expect(summary.xp.total).toBe(94);
    // The parent's Training days panel has the demo's days, with the three themes.
    const days = await app.inject({ url: `/api/training/days?date=${date}`, headers: as(SAM) });
    expect(days.statusCode).toBe(200);
    expect(days.json().days).toEqual(demoTrainingDays(date));
    const themes = days.json().themes as { day: number; title: string }[];
    expect(themes.map((th) => th.title).sort()).toEqual(STARTER_PACK.map((s) => s.title).sort());
    expect(themes.find((th) => th.day === weekdayOf(date))?.title).toBe('Strong middle');
  });

  it('keeps the old dev-mock start when the flag is off', async () => {
    app = await buildApp({ config: devConfig({ demoSeed: false, roleSeed: `${KAI}=keeper;${SAM}=parent` }) });
    const summary = (await app.inject({ url: `/api/progress/summary?date=${localDate()}`, headers: as(KAI) })).json();
    expect(summary.team.current).toBe(0);
  });
});

describe('reset the demo household (AC1)', () => {
  it('restores the seeded state after the demo changed it', async () => {
    app = await buildApp({ config: devConfig() });
    const date = localDate();
    const before = (await app.inject({ url: `/api/progress/summary?date=${date}`, headers: as(SAM) })).json();
    const pending = (await app.inject({ url: '/api/approvals/pending', headers: as(SAM) })).json();
    const first = (Array.isArray(pending) ? pending : pending.requests)[0];
    expect((await app.inject({ method: 'POST', url: `/api/approvals/${first.id}/approve`, headers: as(SAM) })).statusCode).toBe(200);
    await app.inject({
      method: 'POST',
      url: '/api/pain',
      headers: as(KAI),
      payload: { id: 'demo-report-0001', bodyArea: 'knee', date },
    });
    expect((await app.inject({ url: '/api/pain/status', headers: as(SAM) })).json().paused).toBe(true);
    const daysBefore = (await app.inject({ url: `/api/training/days?date=${date}`, headers: as(SAM) })).json();
    const other = [1, 3, 5].every((d) => daysBefore.days.includes(d)) ? [2, 4, 6] : [1, 3, 5];
    const put = await app.inject({ method: 'PUT', url: '/api/training/days', headers: as(SAM), payload: { days: other, date } });
    expect(put.statusCode).toBe(200);

    const reset = await app.inject({ method: 'POST', url: '/api/dev/demo/reset' });
    expect(reset.statusCode).toBe(200);
    expect(reset.json()).toEqual({ ok: true, date });

    expect((await app.inject({ url: '/api/pain/status', headers: as(SAM) })).json().paused).toBe(false);
    const after = (await app.inject({ url: '/api/approvals/pending', headers: as(SAM) })).json();
    expect((Array.isArray(after) ? after : after.requests).length).toBe(DEMO_REQUESTS.length + DOSSIER_REQUESTS.length);
    expect((await app.inject({ url: `/api/progress/summary?date=${date}`, headers: as(SAM) })).json()).toEqual(before);
    expect((await app.inject({ url: `/api/training/days?date=${date}`, headers: as(SAM) })).json()).toEqual(daysBefore);
  });

  it('is not a route without the mock identity', async () => {
    app = await buildApp({
      config: devConfig({ devMockIdentity: false, demoSeed: false, audience: '/test/audience/goalie-goals', roleSeed: `${KAI}=keeper` }),
    });
    const res = await app.inject({ method: 'POST', url: '/api/dev/demo/reset' });
    expect(res.statusCode).not.toBe(200);
  });
});

describe('the seed refuses anything but the demo household (AC3)', () => {
  it('refuses a role store holding an account outside example.com, and writes nothing', async () => {
    const t = target();
    t.roles.set(OUTSIDER, 'parent');
    await expect(seedDemoHousehold(t, TODAY)).rejects.toBeInstanceOf(DemoRefused);
    expect(await t.approvalStore.list()).toEqual([]);
    expect(await t.progressStore.list()).toEqual([]);
    expect(await t.roles.roleFor(KAI)).toBeNull();
  });

  it('never names the account in its refusal', async () => {
    const t = target();
    t.roles.set(OUTSIDER, 'parent');
    const err = await seedDemoHousehold(t, TODAY).catch((e: Error) => e);
    expect(err).toBeInstanceOf(DemoRefused);
    expect((err as Error).message).not.toContain(OUTSIDER);
  });

  it('refuses in production and without the mock identity', async () => {
    await expect(seedDemoHousehold(target({ production: true }), TODAY)).rejects.toThrow(/production/);
    await expect(seedDemoHousehold(target({ devMockIdentity: false }), TODAY)).rejects.toThrow(/mock identity/);
  });

  it('refuses training days kept anywhere but the in-memory store', async () => {
    const stored = { list: async () => [], append: async () => undefined, clear: () => undefined };
    const t = target({ scheduleStore: stored as unknown as MemoryScheduleStore });
    await expect(seedDemoHousehold(t, TODAY)).rejects.toThrow(/in-memory stores/);
    expect(await t.progressStore.list()).toEqual([]);
  });

  it('stops the server from starting against a non-demo role seed', async () => {
    await expect(buildApp({ config: devConfig({ roleSeed: `${KAI}=keeper;${OUTSIDER}=parent` }) })).rejects.toBeInstanceOf(
      DemoRefused,
    );
  });

  it('is refused by config in production and without the mock identity', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', GOALIE_DEV_MOCK_IDENTITY: '1', GOALIE_DEMO_SEED: '1' })).toThrow(
      ConfigError,
    );
    expect(() => loadConfig({ NODE_ENV: 'production', IAP_AUDIENCE: '/a', GOALIE_DEMO_SEED: '1' })).toThrow(/production/);
    expect(() => loadConfig({ IAP_AUDIENCE: '/a', GOALIE_DEMO_SEED: '1' })).toThrow(/GOALIE_DEV_MOCK_IDENTITY/);
    expect(loadConfig({ GOALIE_DEV_MOCK_IDENTITY: '1', GOALIE_DEMO_SEED: '1' }).demoSeed).toBe(true);
  });

  it('is refused by buildApp in production even if config was built by hand', async () => {
    await expect(buildApp({ config: devConfig({ production: true }) })).rejects.toThrow(ConfigError);
    await expect(buildApp({ config: devConfig({ devMockIdentity: false, audience: '/a' }) })).rejects.toThrow(ConfigError);
  });
});

describe('the reset refuses anything but the demo household (AC3)', () => {
  it('refuses when the role store holds an account outside example.com, and wipes nothing', async () => {
    app = await buildApp({ config: devConfig({ demoSeed: false, roleSeed: `${KAI}=keeper;${OUTSIDER}=parent` }) });
    const res = await app.inject({ method: 'POST', url: '/api/dev/demo/reset' });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('refused');
    expect(res.body).not.toContain(OUTSIDER);
    // Nothing was wiped: the outsider's role and the startup inbox are still there.
    expect((await app.inject({ url: '/api/me', headers: as(OUTSIDER) })).json()).toEqual({ role: 'parent' });
    const inbox = (await app.inject({ url: '/api/approvals/pending', headers: as(OUTSIDER) })).json();
    expect((Array.isArray(inbox) ? inbox : inbox.requests).length).toBeGreaterThan(0);
  });

  it('refuses when an outside account decided a request, even with no role', async () => {
    const t = target();
    await seedDemoHousehold(t, TODAY);
    const [first] = await t.approvals.pending();
    await t.approvals.approve(first.id, { account: OUTSIDER, role: 'parent' });
    await expect(resetDemoHousehold(t, TODAY)).rejects.toBeInstanceOf(DemoRefused);
    expect((await t.approvalStore.list()).some((r) => r.decidedBy === OUTSIDER)).toBe(true);
  });

  it('refuses in production and without the mock identity', async () => {
    const t = target();
    await seedDemoHousehold(t, TODAY);
    await expect(resetDemoHousehold({ ...t, production: true }, TODAY)).rejects.toThrow(/production/);
    await expect(resetDemoHousehold({ ...t, devMockIdentity: false }, TODAY)).rejects.toThrow(/mock identity/);
    expect((await t.progressStore.list()).length).toBeGreaterThan(0);
  });

  it('restores the same state when the target is the demo household', async () => {
    const t = target();
    await seedDemoHousehold(t, TODAY);
    const before = await t.progress.summary(TODAY);
    await resetDemoHousehold(t, TODAY);
    expect(await t.progress.summary(TODAY)).toEqual(before);
    expect((await t.approvals.pending()).length).toBe(DEMO_REQUESTS.length + DOSSIER_REQUESTS.length);
  });
});
