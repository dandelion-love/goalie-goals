import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent } from '../src/content.js';
import { MemoryProgressStore, ProgressService, type PauseSource } from '../src/progress.js';
import type { Outcome, Person } from '../src/progression.js';
import { TrainingService } from '../src/training.js';
import { WeeklyPlan } from '../src/weeklyPlan.js';
import { weekStart, weekView, type PauseSpan, type WeekView } from '../src/week.js';

// Story 114: this week at a glance. Invented cast and invented days only. The default plan
// trains Mon, Wed and Fri; 2026-01-05 is a Monday and the week runs to Sunday 2026-01-11.
const [MON, TUE, WED, THU, FRI, SAT, SUN] = [
  '2026-01-05',
  '2026-01-06',
  '2026-01-07',
  '2026-01-08',
  '2026-01-09',
  '2026-01-10',
  '2026-01-11',
];
const NEXT_MON = '2026-01-12';

function setup(spans: PauseSpan[] = []) {
  const plan = new WeeklyPlan();
  const pauses: PauseSource = { spans: async () => spans };
  const progress = new ProgressService({
    store: new MemoryProgressStore(),
    plan,
    plannedSets: async () => 4,
    pauses,
  });
  const record = (date: string, outcome: Outcome = 'done', present: Person[] = ['keeper', 'parent']) =>
    progress.record({ date, itemId: 'session-x', itemVersion: 'v1', outcome, warmUpLogged: true, praisedSets: 0, present }, 'keeper');
  const week = async (today: string): Promise<WeekView> =>
    weekView({ today, plan, days: await progress.days(today), pauses: await pauses.spans() });
  return { plan, progress, record, week };
}

const states = (w: WeekView) => w.days.map((d) => d.state);

describe('story 114 AC1 and AC5: the seven days, one state each', () => {
  it('runs Monday to Sunday, whatever day of the week today is', async () => {
    const { week } = setup();
    for (const today of [MON, THU, SUN]) {
      const w = await week(today);
      expect(w.days.map((d) => d.date)).toEqual([MON, TUE, WED, THU, FRI, SAT, SUN]);
      expect(w.days.map((d) => d.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      expect(w.days.filter((d) => d.isToday).map((d) => d.date)).toEqual([today]);
    }
    expect(weekStart(SUN)).toBe(MON);
    expect(weekStart(NEXT_MON)).toBe(NEXT_MON);
  });

  it('marks today, planned days and rest days in a new week', async () => {
    const { week } = setup();
    const w = await week(MON);
    expect(states(w)).toEqual(['today', 'rest', 'planned', 'rest', 'planned', 'rest', 'rest']);
    expect(w.days.map((d) => d.title)).toEqual(['Strong middle', null, 'Spring legs', null, 'Quick feet, strong arms', null, null]);
  });

  it('marks a trained day, and a safety stop as a kept day, never missed', async () => {
    const { record, week } = setup();
    await record(MON, 'done');
    await record(WED, 'stopped');
    const w = await week(THU);
    expect(states(w)).toEqual(['trained', 'rest', 'stopped', 'rest', 'planned', 'rest', 'rest']);
    expect(w.kept).toBe(2);
    expect(w.planned).toBe(3);
  });

  it('counts a session stopped because something hurt as kept too', async () => {
    const { record, week } = setup();
    await record(MON, 'hurt');
    const w = await week(MON);
    expect(w.days[0]).toMatchObject({ state: 'stopped', isToday: true });
    expect(w.kept).toBe(1);
  });

  it('marks today trained once its session is in', async () => {
    const { record, week } = setup();
    await record(WED, 'done', ['keeper']);
    const w = await week(WED);
    expect(w.days[2]).toMatchObject({ state: 'trained', isToday: true });
    expect(w.kept).toBe(1);
  });

  it('never shows a rest day as missed, even with a session on it', async () => {
    const { record, week } = setup();
    await record(MON);
    await record(TUE);
    const w = await week(THU);
    expect(w.days[1].state).toBe('rest');
    expect(w.kept).toBe(1);
  });

  it('shows paused days as paused, never missed, and the days ahead while the pause holds', async () => {
    const { record, week } = setup([{ from: TUE, to: null }]);
    await record(MON);
    const w = await week(THU);
    expect(states(w)).toEqual(['trained', 'paused', 'paused', 'paused', 'paused', 'paused', 'paused']);
    expect(w.kept).toBe(1);
    expect(w.next).toBeNull();
  });

  it('after a cleared pause, the days return to the plan', async () => {
    const { record, week } = setup([{ from: TUE, to: WED }]);
    await record(MON);
    const w = await week(THU);
    expect(states(w)).toEqual(['trained', 'paused', 'paused', 'rest', 'planned', 'rest', 'rest']);
    expect(w.next).toEqual({ date: FRI, day: 'Fri', title: 'Quick feet, strong arms' });
  });

  it('shows a past planned day with nothing logged plainly as open, not missed', async () => {
    const { record, week } = setup();
    await record(MON);
    const w = await week(FRI);
    expect(w.days[2].state).toBe('open');
    expect(w.days.some((d) => (d.state as string) === 'missed')).toBe(false);
    expect(w.days[4].state).toBe('today');
  });

  it("uses the parent's own days and counts the plan's sessions", async () => {
    const { plan, week } = setup();
    plan.load([{ from: MON, days: [2, 4, 6] }]);
    const w = await week(MON);
    expect(states(w)).toEqual(['rest', 'planned', 'rest', 'planned', 'rest', 'planned', 'rest']);
    expect(w.planned).toBe(3);
    expect(w.kept).toBe(0);
  });
});

describe('story 114 AC2 and AC5: the next planned session', () => {
  it('is the first planned day after today, with its day and name', async () => {
    const { record, week } = setup();
    expect((await week(MON)).next).toEqual({ date: WED, day: 'Wed', title: 'Spring legs' });
    await record(MON);
    expect((await week(MON)).next).toEqual({ date: WED, day: 'Wed', title: 'Spring legs' });
    expect((await week(FRI)).next).toEqual({ date: NEXT_MON, day: 'Mon', title: 'Strong middle' });
    expect((await week(SAT)).next).toEqual({ date: NEXT_MON, day: 'Mon', title: 'Strong middle' });
  });
});

describe('story 114: the week route', () => {
  const AUDIENCE = '/test/audience/goalie-goals';
  const KAI = 'kai@example.com';
  const SAM = 'sam@example.com';
  const OTHER = 'someone@example.com';
  const signer = new TestSigner();
  const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('gives both roles the same week, and refuses anyone else', async () => {
    const config: Config = {
      audience: AUDIENCE,
      devMockIdentity: false,
      devMockAccount: KAI,
      roleSeed: `${KAI}=keeper;${SAM}=parent`,
      roleStore: 'memory',
      port: 0,
      webRoot: '',
      production: false,
    };
    const approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
    const training = new TrainingService({ approvals, content: loadContent(), plan: new WeeklyPlan() });
    app = await buildApp({ config, verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });

    const done = await app.inject({
      method: 'POST',
      url: '/api/progress/sessions',
      headers: as(KAI),
      payload: { date: MON, itemId: 'session-strong-middle', itemVersion: 'v1', outcome: 'done', warmUpLogged: true },
    });
    expect(done.statusCode).toBe(200);

    const kai = await app.inject({ method: 'GET', url: `/api/progress/week?date=${MON}`, headers: as(KAI) });
    const sam = await app.inject({ method: 'GET', url: `/api/progress/week?date=${MON}`, headers: as(SAM) });
    expect(kai.statusCode).toBe(200);
    expect(kai.headers['cache-control']).toBe('no-store');
    expect(kai.json()).toEqual(sam.json());
    const w = kai.json() as WeekView;
    expect(w.days[0]).toMatchObject({ date: MON, state: 'trained', isToday: true });
    expect([w.kept, w.planned]).toEqual([1, 3]);
    expect(w.next).toEqual({ date: WED, day: 'Wed', title: 'Spring legs', minutes: 15 });

    const other = await app.inject({ method: 'GET', url: '/api/progress/week', headers: as(OTHER) });
    expect(other.statusCode).toBe(403);
    const none = await app.inject({ method: 'GET', url: '/api/progress/week' });
    expect(none.statusCode).toBe(401);
  });
});
