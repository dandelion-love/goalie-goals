import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent, type ContentLibrary, type Dose } from '../src/content.js';
import { MemoryProgressStore, ProgressService } from '../src/progress.js';
import { MemoryScheduleStore, ScheduleError, ScheduleService } from '../src/schedule.js';
import { STARTER_SESSION, TrainingService, sessionItemId, type SessionTemplate } from '../src/training.js';
import {
  JUMP_CONTACTS_START_CAP,
  STARTER_PACK,
  WeeklyPlan,
  checkPlanRules,
  checkTrainingDays,
  contacts,
  isJumpCard,
  layOut,
  type Week,
} from '../src/weeklyPlan.js';

// Fixtures: the invented cast and invented days; content is the repo's own exercise cards.
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const PARENT = { account: SAM, role: 'parent' as const };
const KEEPER = { account: KAI, role: 'keeper' as const };
const CONTENT = loadContent();

// 2026-01-05 is a Monday; the week runs to Sunday 2026-01-11.
const WEEK = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10', '2026-01-11'];
const [MON, TUE, WED, THU, FRI, SAT, SUN] = WEEK;

let approvals: ApprovalService;
let plan: WeeklyPlan;
let training: TrainingService;

beforeEach(() => {
  approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
  plan = new WeeklyPlan();
  training = new TrainingService({ approvals, content: CONTENT, plan });
});

async function approveAllPending() {
  for (const r of await approvals.pending()) await approvals.approve(r.id, PARENT);
}

const titleOn = (date: string) => plan.sessionFor(date)?.title ?? null;

describe('AC1: the weekly plan', () => {
  it('lays out the default week: three themes on Mon, Wed and Fri, rest every other day', () => {
    expect(WEEK.map(titleOn)).toEqual([
      'Strong middle',
      null,
      'Spring legs',
      null,
      'Quick feet, strong arms',
      null,
      null,
    ]);
    expect(plan.sessionFor(MON)!.cardIds).toEqual(['plank', 'side-plank', 'glute-bridge']);
    expect(plan.sessionFor(WED)!.cardIds).toEqual(['pogo-hops', 'squat-to-box', 'split-squat']);
    expect(plan.sessionFor(FRI)!.cardIds).toEqual(['set-position', 'lateral-shuffle', 'wall-push-up']);
    // The same pattern the next week.
    expect(titleOn('2026-01-12')).toBe('Strong middle');
  });

  it('gives each session the starter warm-up and cool-down', () => {
    for (const s of STARTER_PACK) {
      expect(s.warmUp).toEqual(STARTER_SESSION.warmUp);
      expect(s.coolDown).toEqual(STARTER_SESSION.coolDown);
    }
  });

  it('counts the rest days as planned rest over a full week, so the streak never breaks', async () => {
    await training.proposeFor(MON);
    await approveAllPending();
    const progress = new ProgressService({
      store: new MemoryProgressStore(),
      plan,
      plannedSets: (v) => training.plannedSets(v),
    });
    for (const date of [MON, WED, FRI]) {
      const s = (await training.today(date)).today!;
      await progress.record(
        { date, itemId: s.itemId, itemVersion: s.itemVersion, outcome: 'done', warmUpLogged: true, praisedSets: 1 },
        'keeper',
      );
    }
    const days = await progress.days(SUN);
    expect(days.map((d) => d.kind)).toEqual(['together', 'rest', 'together', 'rest', 'together', 'rest', 'rest']);
    const summary = await progress.summary(SUN);
    expect(summary.team.current).toBeGreaterThan(0);
    expect(summary.team.current).toBe(summary.team.best);
    expect(summary.runs).toEqual([]);
  });

  it('serves a rest day with nothing planned', async () => {
    await training.proposeFor(MON);
    await approveAllPending();
    for (const date of [TUE, THU, SAT, SUN]) {
      expect(await training.today(date)).toMatchObject({ planned: false, today: null });
    }
  });
});

describe('AC2: the plan rules', () => {
  const week = (): Week => layOut(STARTER_PACK, [1, 3, 5]);

  it('passes every rule for the pack as the sessions serve it', async () => {
    const served = new Map<string, Dose>();
    for (const t of STARTER_PACK) {
      for (const c of training.currentSession(t)!.cards) served.set(c.source.card.id, c.source.card.dose);
    }
    expect(checkPlanRules(week(), CONTENT, served)).toEqual([]);
    expect(checkPlanRules(plan.weekOn(MON), CONTENT)).toEqual([]);
  });

  it('puts jumps on one day (story 109 traded the broad jump out), at 18 contacts, under the starting cap', () => {
    const perDay = week().map((s) =>
      s ? s.cardIds.map((id) => CONTENT.cards.get(id)!.card).filter(isJumpCard).reduce((n, c) => n + contacts(c.dose), 0) : 0,
    );
    expect(perDay).toEqual([0, 0, 0, 18, 0, 0, 0]);
    expect(Math.max(...perDay)).toBeLessThanOrEqual(JUMP_CONTACTS_START_CAP);
  });

  it('refuses strength on consecutive days, Sunday to Monday included', () => {
    expect(checkPlanRules(layOut(STARTER_PACK, [1, 2, 4]), CONTENT)).toContain('Strength on consecutive days: Mon and Tue.');
    expect(checkPlanRules(layOut(STARTER_PACK, [0, 1, 3]), CONTENT)).toContain('Strength on consecutive days: Sun and Mon.');
  });

  it('refuses jumps on more than two days', () => {
    const jumpy: SessionTemplate = { ...STARTER_PACK[1], id: 'jumpy', cardIds: ['pogo-hops'] };
    expect(checkPlanRules(layOut([jumpy, jumpy, jumpy], [1, 3, 5]), CONTENT)).toContain('Jumps on 3 days a week; at most 2.');
  });

  it('refuses a session over the jump-contact cap', () => {
    const cards = new Map(CONTENT.cards);
    const src = cards.get('pogo-hops')!;
    cards.set('pogo-hops', { ...src, card: { ...src.card, dose: { ...src.card.dose, sets: 10 } } });
    const problems = checkPlanRules(week(), { cards } as ContentLibrary);
    expect(problems.some((p) => p.includes('60 jump contacts'))).toBe(true);
  });

  it('refuses jumps after strength', () => {
    const late: SessionTemplate = { ...STARTER_PACK[1], cardIds: ['squat-to-box', 'pogo-hops'] };
    expect(checkPlanRules(layOut([STARTER_PACK[0], late, STARTER_PACK[2]], [1, 3, 5]), CONTENT)).toContain(
      'Wed "Spring legs": Low pogo hops comes after strength work; jumps go first.',
    );
  });

  it('refuses a short warm-up, a missing cool-down and an unknown card', () => {
    const bad: SessionTemplate = { ...STARTER_PACK[0], warmUp: STARTER_SESSION.warmUp.slice(0, 2), coolDown: [], cardIds: ['plank', 'nope'] };
    const problems = checkPlanRules(layOut([bad, STARTER_PACK[1], STARTER_PACK[2]], [1, 3, 5]), CONTENT);
    expect(problems).toEqual(
      expect.arrayContaining([
        'Mon "Strong middle": no card "nope".',
        'Mon "Strong middle": the warm-up is 105 s, not 5 to 10 minutes.',
        'Mon "Strong middle": no cool-down.',
      ]),
    );
  });

  it("refuses a dose that is not the card's own", () => {
    const plank = CONTENT.cards.get('plank')!.card;
    const served = new Map<string, Dose>([['plank', { ...plank.dose, seconds: 60 }]]);
    expect(checkPlanRules(week(), CONTENT, served)).toContain(`Mon "Strong middle": ${plank.name} is not at the card's own dose.`);
  });
});

describe('AC3: the pack goes to the parent in one sitting', () => {
  it('proposes every session and every card it uses, each once, as its own request', async () => {
    await training.proposeFor(MON);
    const pending = await approvals.pending();
    const ids = pending.map((r) => r.itemId);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    expect(pending.filter((r) => r.kind === 'exercise')).toHaveLength(9);
    expect(pending.filter((r) => r.kind === 'plan').map((r) => r.itemId)).toEqual(STARTER_PACK.map((s) => sessionItemId(s.id)));
    // Asking again adds nothing.
    await training.proposeFor(WED);
    expect(await approvals.pending()).toHaveLength(12);
  });

  it('plays nothing until approved, then each training day its own theme', async () => {
    await training.proposeFor(MON);
    for (const date of [MON, WED, FRI]) expect(await training.today(date)).toMatchObject({ planned: true, today: null, lastApproved: null });
    await approveAllPending();
    expect((await training.today(MON)).today!.title).toBe('Strong middle');
    expect((await training.today(WED)).today!.cards.map((c) => c.id)).toEqual(['pogo-hops', 'squat-to-box', 'split-squat']);
    expect((await training.today(FRI)).today!.title).toBe('Quick feet, strong arms');
  });

  it('falls back to rest on the day of a declined session', async () => {
    await training.proposeFor(MON);
    for (const r of await approvals.pending()) {
      if (r.itemId === sessionItemId('spring-legs')) await approvals.decline(r.id, PARENT, 'Not yet');
      else await approvals.approve(r.id, PARENT);
    }
    expect(await training.today(WED)).toMatchObject({ planned: true, today: null, lastApproved: null });
    expect((await training.today(MON)).today!.title).toBe('Strong middle');
  });
});

describe('AC4: the parent sets the training days', () => {
  let audit: MemoryAuditLog;
  let schedule: ScheduleService;

  beforeEach(() => {
    audit = new MemoryAuditLog();
    schedule = new ScheduleService({ store: new MemoryScheduleStore(), plan, audit, content: () => CONTENT });
  });

  it('defaults to Mon, Wed and Fri', () => {
    expect(schedule.days(MON)).toEqual([1, 3, 5]);
  });

  it('moves the themes to the new days from the date of the change, and audits it', async () => {
    await schedule.set(PARENT, [6, 2, 4], TUE);
    expect(schedule.days(TUE)).toEqual([2, 4, 6]);
    expect(WEEK.slice(1).map(titleOn)).toEqual([
      'Strong middle',
      null,
      'Spring legs',
      null,
      'Quick feet, strong arms',
      null,
    ]);
    // Earlier days keep the days they had.
    expect(titleOn(MON)).toBe('Strong middle');
    expect(checkPlanRules(plan.weekOn(TUE), CONTENT)).toEqual([]);
    const events = await audit.list();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: 'changed',
      actorRole: 'parent',
      kind: 'schedule',
      title: 'the training days (Tue, Thu, Sat)',
    });
  });

  it('refuses consecutive days with a clear message, Sunday to Monday included', async () => {
    await expect(schedule.set(PARENT, [1, 2, 4], MON)).rejects.toThrow(/Mon and Tue are back to back/);
    await expect(schedule.set(PARENT, [0, 1, 3], MON)).rejects.toThrow(/Sun and Mon are back to back/);
    await expect(schedule.set(PARENT, [1, 3], MON)).rejects.toThrow(/exactly 3 different/);
    await expect(schedule.set(PARENT, [1, 3, 3], MON)).rejects.toThrow(/exactly 3 different/);
    await expect(schedule.set(PARENT, [1, 3, 9], MON)).rejects.toBeInstanceOf(ScheduleError);
    expect(schedule.days(MON)).toEqual([1, 3, 5]);
    expect(await audit.list()).toHaveLength(0);
  });

  it('refuses the keeper, and logs the attempt', async () => {
    await expect(schedule.set(KEEPER, [2, 4, 6], MON)).rejects.toMatchObject({ code: 'forbidden' });
    expect(schedule.days(MON)).toEqual([1, 3, 5]);
    expect((await audit.list())[0]).toMatchObject({ action: 'refused', actorRole: 'keeper', kind: 'schedule' });
  });

  it('checks a choice of days on its own', () => {
    expect(checkTrainingDays([1, 3, 5])).toBeNull();
    expect(checkTrainingDays([0, 2, 4])).toBeNull();
    expect(checkTrainingDays([5, 6, 2])).toMatch(/Fri and Sat/);
  });
});

describe('AC4: training days routes', () => {
  const signer = new TestSigner();
  let app: FastifyInstance | undefined;
  const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });

  function config(): Config {
    return {
      audience: AUDIENCE,
      devMockIdentity: false,
      devMockAccount: KAI,
      roleSeed: `${KAI}=keeper;${SAM}=parent`,
      roleStore: 'memory',
      port: 0,
      webRoot: '',
      production: false,
    };
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function testApp() {
    await training.proposeFor(MON);
    await approveAllPending();
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });
    return app;
  }

  it('lets the parent read the days with their themes, and not the keeper', async () => {
    const a = await testApp();
    const sam = await a.inject({ method: 'GET', url: `/api/training/days?date=${MON}`, headers: as(SAM) });
    expect(sam.statusCode).toBe(200);
    expect(sam.headers['cache-control']).toBe('no-store');
    expect(sam.json()).toEqual({
      days: [1, 3, 5],
      themes: [
        { day: 1, name: 'Mon', title: 'Strong middle' },
        { day: 3, name: 'Wed', title: 'Spring legs' },
        { day: 5, name: 'Fri', title: 'Quick feet, strong arms' },
      ],
    });
    const kai = await a.inject({ method: 'GET', url: '/api/training/days', headers: as(KAI) });
    expect(kai.statusCode).toBe(403);
  });

  it("sets the days, and today's session follows them", async () => {
    const a = await testApp();
    const put = await a.inject({ method: 'PUT', url: '/api/training/days', headers: as(SAM), payload: { days: [2, 4, 6], date: MON } });
    expect(put.statusCode).toBe(200);
    expect(put.json().days).toEqual([2, 4, 6]);
    const tue = await a.inject({ method: 'GET', url: `/api/training/today?date=${TUE}`, headers: as(KAI) });
    expect(tue.json()).toMatchObject({ planned: true, today: { title: 'Strong middle' } });
    const wed = await a.inject({ method: 'GET', url: `/api/training/today?date=${WED}`, headers: as(KAI) });
    expect(wed.json()).toMatchObject({ planned: false, today: null });
    const history = await a.inject({ method: 'GET', url: '/api/audit', headers: as(SAM) });
    expect(history.json().events.at(-1)).toMatchObject({ action: 'changed', kind: 'schedule', title: 'the training days (Tue, Thu, Sat)' });
  });

  it('refuses consecutive days with a message, and a keeper outright', async () => {
    const a = await testApp();
    const bad = await a.inject({ method: 'PUT', url: '/api/training/days', headers: as(SAM), payload: { days: [5, 6, 2] } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject({ error: 'invalid', message: expect.stringMatching(/Fri and Sat are back to back/) });
    const kai = await a.inject({ method: 'PUT', url: '/api/training/days', headers: as(KAI), payload: { days: [2, 4, 6] } });
    expect(kai.statusCode).toBe(403);
    const days = await a.inject({ method: 'GET', url: `/api/training/days?date=${MON}`, headers: as(SAM) });
    expect(days.json().days).toEqual([1, 3, 5]);
  });

  it('has no training-days route on a plan that is not the weekly pack', async () => {
    const single = new TrainingService({ approvals, content: CONTENT });
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training: single });
    const res = await app.inject({ method: 'GET', url: '/api/training/days', headers: as(SAM) });
    expect(res.statusCode).toBe(404);
  });
});
