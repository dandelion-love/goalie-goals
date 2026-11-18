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
import {
  DEMO_WEEK,
  DemoAuditLog,
  DemoPlan,
  DemoRefused,
  isDemoAccount,
  localDate,
  resetDemoHousehold,
  seedDemoHousehold,
  shiftDate,
  type DemoTarget,
} from '../src/demo.js';

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
  const plan = new DemoPlan();
  const training = new TrainingService({ approvals, content: loadContent(), plan });
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
  it('creates Kai and Sam, the inbox, today\'s approved session and a week of history', async () => {
    const t = target();
    await seedDemoHousehold(t, TODAY);

    expect(await t.roles.roleFor(KAI)).toBe('keeper');
    expect(await t.roles.roleFor(SAM)).toBe('parent');

    // The inbox holds the demo requests: real cards at their spec doses (demoData.ts).
    const pending = await t.approvals.pending();
    expect(pending.map((r) => r.itemId)).toEqual(DEMO_REQUESTS.map((r) => r.itemId));

    // Today's starter session and its cards are approved.
    const today = await t.training.today(TODAY);
    expect(today.today?.cards.map((c) => c.id)).toEqual(['plank', 'glute-bridge']);
    expect((await t.training.approvedCards()).map((c) => c.id).sort()).toEqual(['glute-bridge', 'plank']);

    // A week of history: trained days, one planned rest day, one safety stop, none missed.
    const days = await t.progress.days(TODAY);
    const kinds = Object.fromEntries(days.map((d) => [d.date, d.kind]));
    expect(kinds[shiftDate(TODAY, -4)]).toBe('rest');
    expect(kinds[shiftDate(TODAY, -3)]).toBe('safety_stop');
    expect(days.filter((d) => d.kind === 'together')).toHaveLength(DEMO_WEEK.filter((d) => d.kind === 'trained').length);
    expect(days.some((d) => d.kind === 'missed')).toBe(false);

    const summary = await t.progress.summary(TODAY);
    expect(summary.team.current).toBe(6);
    expect(summary.keeper.current).toBe(6);
    expect(summary.parent.current).toBe(6);
    expect(summary.xp.total).toBeGreaterThan(0);
    expect(summary.xp.today).toBe(0);
    expect(summary.today).toBeNull();
  });

  it('runs at server start with the flag, and the app serves the household', async () => {
    app = await buildApp({ config: devConfig() });
    const date = localDate();
    expect((await app.inject({ url: '/api/me', headers: as(KAI) })).json()).toEqual({ role: 'keeper' });
    expect((await app.inject({ url: '/api/me', headers: as(SAM) })).json()).toEqual({ role: 'parent' });
    const inbox = await app.inject({ url: '/api/approvals/pending', headers: as(SAM) });
    expect(inbox.statusCode).toBe(200);
    expect(JSON.stringify(inbox.json())).toContain('Squat to box');
    const today = (await app.inject({ url: `/api/training/today?date=${date}`, headers: as(KAI) })).json();
    expect(today.today?.title).toBe('Strong middle');
    const summary = (await app.inject({ url: `/api/progress/summary?date=${date}`, headers: as(KAI) })).json();
    expect(summary.team.current).toBe(6);
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

    const reset = await app.inject({ method: 'POST', url: '/api/dev/demo/reset' });
    expect(reset.statusCode).toBe(200);
    expect(reset.json()).toEqual({ ok: true, date });

    expect((await app.inject({ url: '/api/pain/status', headers: as(SAM) })).json().paused).toBe(false);
    const after = (await app.inject({ url: '/api/approvals/pending', headers: as(SAM) })).json();
    expect((Array.isArray(after) ? after : after.requests).length).toBe(DEMO_REQUESTS.length);
    expect((await app.inject({ url: `/api/progress/summary?date=${date}`, headers: as(SAM) })).json()).toEqual(before);
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
    expect((await t.approvals.pending()).length).toBe(DEMO_REQUESTS.length);
  });
});
