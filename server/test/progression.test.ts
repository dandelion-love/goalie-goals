import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  SESSION_XP,
  STAR_XP,
  classifyDay,
  computeStreaks,
  datesBetween,
  sessionCredit,
  type Day,
  type DayInput,
} from '../src/progression.js';
import { MemoryProgressStore, ProgressService, type PauseSource } from '../src/progress.js';
import type { SessionTemplate, TrainingPlan } from '../src/training.js';
import { STARTER_SESSION, TrainingService } from '../src/training.js';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent } from '../src/content.js';

// Fixtures: the invented cast (keeper Kai, parent Sam) and invented training days only.
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const AUDIENCE = '/test/audience/goalie-goals';

const day = (date: string, kind: Day['kind'], present?: Day['present']): Day => ({ date, kind, present });

describe('session credit: consistency and form, never volume (AC1)', () => {
  it('grants the session credit once the warm-up is logged, plus one star per good-form set', () => {
    expect(sessionCredit({ outcome: 'done', warmUpLogged: true, praisedSets: 3, plannedSets: 4 })).toEqual({
      session: SESSION_XP,
      stars: 3,
      form: 3 * STAR_XP,
      total: SESSION_XP + 3 * STAR_XP,
    });
  });

  it('caps stars at the planned sets: sets beyond the plan earn nothing', () => {
    const atPlan = sessionCredit({ outcome: 'done', warmUpLogged: true, praisedSets: 4, plannedSets: 4 });
    const beyond = sessionCredit({ outcome: 'done', warmUpLogged: true, praisedSets: 9, plannedSets: 4 });
    expect(beyond).toEqual(atPlan);
    expect(beyond.stars).toBe(4);
  });

  it('has no input for sets, reps or minutes: a long session earns what a short one does', () => {
    const credit = sessionCredit({ outcome: 'done', warmUpLogged: true, praisedSets: 0, plannedSets: 4 });
    expect(credit.total).toBe(SESSION_XP);
  });

  it('grants no session credit before the warm-up is logged, unless the session stopped for safety', () => {
    expect(sessionCredit({ outcome: 'done', warmUpLogged: false, praisedSets: 0, plannedSets: 4 }).session).toBe(0);
  });

  it('ignores negative or fractional counts', () => {
    expect(sessionCredit({ outcome: 'done', warmUpLogged: true, praisedSets: -3, plannedSets: 4 }).stars).toBe(0);
    expect(sessionCredit({ outcome: 'done', warmUpLogged: true, praisedSets: 2.7, plannedSets: 4 }).stars).toBe(2);
  });
});

describe('a safety stop counts as a kept day with the same credit as finishing (AC2)', () => {
  it.each(['stopped', 'hurt'] as const)('%s earns the finishing session credit and keeps its stars', (outcome) => {
    const finished = sessionCredit({ outcome: 'done', warmUpLogged: true, praisedSets: 1, plannedSets: 4 });
    expect(sessionCredit({ outcome, warmUpLogged: true, praisedSets: 1, plannedSets: 4 })).toEqual(finished);
    // Even a stop during the warm-up gets the session credit.
    expect(sessionCredit({ outcome, warmUpLogged: false, praisedSets: 0, plannedSets: 4 }).session).toBe(SESSION_XP);
  });

  it('extends the team and both personal streaks, exactly like a together day', () => {
    const stopped = computeStreaks([day('2026-01-05', 'together'), day('2026-01-06', 'safety_stop')]);
    const finished = computeStreaks([day('2026-01-05', 'together'), day('2026-01-06', 'together')]);
    expect(stopped).toEqual(finished);
    expect(stopped.team.current).toBe(2);
  });

  it('classifies a stopped or hurt session on a planned day as a safety stop', () => {
    const base: DayInput = { date: '2026-01-06', planned: true, session: null, paused: false, isToday: false };
    expect(classifyDay({ ...base, session: { outcome: 'hurt', present: ['keeper', 'parent'] } })).toBe('safety_stop');
    expect(classifyDay({ ...base, session: { outcome: 'stopped', present: ['keeper', 'parent'] } })).toBe('safety_stop');
  });
});

describe('streaks for each day type (AC1)', () => {
  it('trained together: extends the team streak and both personal streaks', () => {
    const s = computeStreaks([day('2026-01-05', 'together'), day('2026-01-06', 'together')]);
    expect([s.team.current, s.keeper.current, s.parent.current]).toEqual([2, 2, 2]);
    expect(s.team.since).toBe('2026-01-05');
  });

  it('trained solo (safe-solo subset): extends that person only and holds the team streak', () => {
    const s = computeStreaks([
      day('2026-01-05', 'together'),
      day('2026-01-06', 'solo', ['keeper']),
      day('2026-01-07', 'together'),
    ]);
    expect(s.team.current).toBe(2);
    expect(s.keeper.current).toBe(3);
    expect(s.parent.current).toBe(2);
  });

  it('planned rest: holds every streak and never breaks one', () => {
    const s = computeStreaks([
      day('2026-01-05', 'together'),
      day('2026-01-06', 'rest'),
      day('2026-01-07', 'rest'),
      day('2026-01-08', 'together'),
    ]);
    expect([s.team.current, s.keeper.current, s.parent.current]).toEqual([2, 2, 2]);
    expect(s.team.completed).toEqual([]);
  });

  it('paused: holds every streak, for as long as the pause lasts', () => {
    const paused = datesBetween('2026-01-06', '2026-01-20').map((d) => day(d, 'paused'));
    const s = computeStreaks([day('2026-01-05', 'together'), ...paused, day('2026-01-21', 'together')]);
    expect([s.team.current, s.keeper.current, s.parent.current]).toEqual([2, 2, 2]);
    expect(s.team.completed).toEqual([]);
  });

  it('missed: ends the run quietly as a completed run, and the next session starts a new one (AC3)', () => {
    const s = computeStreaks([
      day('2026-01-05', 'together'),
      day('2026-01-06', 'rest'),
      day('2026-01-07', 'safety_stop'),
      day('2026-01-08', 'missed'),
      day('2026-01-09', 'together'),
    ]);
    expect(s.team.completed).toEqual([{ start: '2026-01-05', end: '2026-01-07', days: 2 }]);
    expect(s.team.current).toBe(1);
    expect(s.team.since).toBe('2026-01-09');
    expect(s.team.best).toBe(2);
    // The result carries no "lost" count and nothing to repair: only runs kept.
    expect(Object.keys(s.team).sort()).toEqual(['best', 'completed', 'current', 'since']);
  });

  it('a second missed day does not add an empty run', () => {
    const s = computeStreaks([day('2026-01-05', 'together'), day('2026-01-06', 'missed'), day('2026-01-07', 'missed')]);
    expect(s.team.completed).toHaveLength(1);
    expect(s.team.current).toBe(0);
  });

  it('classifies each calendar day', () => {
    const base: DayInput = { date: '2026-01-06', planned: true, session: null, paused: false, isToday: false };
    expect(classifyDay({ ...base, session: { outcome: 'done', present: ['keeper', 'parent'] } })).toBe('together');
    expect(classifyDay({ ...base, session: { outcome: 'done', present: ['keeper'] } })).toBe('solo');
    expect(classifyDay({ ...base, planned: false })).toBe('rest');
    expect(classifyDay({ ...base, paused: true })).toBe('paused');
    expect(classifyDay(base)).toBe('missed');
    // Today is still open until it ends.
    expect(classifyDay({ ...base, isToday: true })).toBeNull();
    // Training on a rest day changes nothing.
    expect(classifyDay({ ...base, planned: false, session: { outcome: 'done', present: ['keeper', 'parent'] } })).toBe('rest');
  });
});

/** Planned days on Mon, Wed and Fri; rest otherwise. */
class WeekdayPlan implements TrainingPlan {
  sessionFor(date: string): SessionTemplate | null {
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    return dow === 1 || dow === 3 || dow === 5 ? STARTER_SESSION : null;
  }
}

describe('ProgressService', () => {
  let pauses: { from: string; to: string | null }[];
  let service: ProgressService;
  const pauseSource: PauseSource = { spans: async () => pauses };
  const done = (date: string, praisedSets = 0) => ({
    date,
    itemId: 'session-starter',
    itemVersion: 'v1',
    outcome: 'done' as const,
    warmUpLogged: true,
    praisedSets,
  });

  beforeEach(() => {
    pauses = [];
    service = new ProgressService({
      store: new MemoryProgressStore(),
      plan: new WeekdayPlan(),
      plannedSets: async (v) => (v === 'v1' ? 4 : null),
      pauses: pauseSource,
    });
  });

  it('caps stars at the server-known planned sets and gives none for an unknown version', async () => {
    expect((await service.record(done('2026-01-05', 7), 'keeper')).credit.stars).toBe(4);
    const unknown = await service.record({ ...done('2026-01-07', 3), itemVersion: 'v-unknown' }, 'keeper');
    expect(unknown.credit).toEqual({ session: SESSION_XP, stars: 0, form: 0, total: SESSION_XP });
  });

  it('gives no credit for an extra session the same day, or a session on a rest day', async () => {
    await service.record(done('2026-01-05', 2), 'keeper');
    expect((await service.record(done('2026-01-05', 2), 'keeper')).credit.total).toBe(0);
    expect((await service.record(done('2026-01-06', 2), 'keeper')).credit.total).toBe(0);
    const s = await service.summary('2026-01-06');
    expect(s.xp.total).toBe(SESSION_XP + 2 * STAR_XP);
    expect(s.today).toBe('rest');
  });

  it('holds streaks through rest days and a pause, and leaves today open', async () => {
    await service.record(done('2026-01-05'), 'keeper'); // Mon
    await service.record({ ...done('2026-01-07'), outcome: 'hurt' }, 'keeper'); // Wed, safety stop
    pauses = [{ from: '2026-01-08', to: '2026-01-14' }]; // through Fri and Mon, Wed
    const s = await service.summary('2026-01-16'); // Fri, not trained yet
    expect(s.team.current).toBe(2);
    expect(s.keeper.current).toBe(2);
    expect(s.parent.current).toBe(2);
    expect(s.today).toBeNull();
    expect(s.runs).toEqual([]);
  });

  it('ends the run quietly on a missed planned day', async () => {
    await service.record(done('2026-01-05'), 'keeper'); // Mon
    await service.record(done('2026-01-07'), 'keeper'); // Wed
    // Fri 2026-01-09 missed.
    await service.record(done('2026-01-12'), 'keeper'); // Mon
    const s = await service.summary('2026-01-12');
    expect(s.runs).toEqual([{ start: '2026-01-05', end: '2026-01-07', days: 2 }]);
    expect(s.team).toEqual({ current: 1, best: 2 });
    expect(s.xp.total).toBe(3 * SESSION_XP);
  });
});

describe('progress routes', () => {
  let app: FastifyInstance | undefined;
  const signer = new TestSigner();
  const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function testApp() {
    const approvals = new ApprovalService({
      store: new MemoryApprovalStore(),
      audit: new MemoryAuditLog(),
      notifier: new InAppNotifier(),
    });
    const training = new TrainingService({ approvals, content: loadContent() });
    await training.proposeFor('2026-01-05');
    for (const r of await approvals.pending()) await approvals.approve(r.id, { account: SAM, role: 'parent' });
    const config: Config = {
      audience: AUDIENCE,
      devMockIdentity: false,
      devMockAccount: '',
      roleSeed: `${KAI}=keeper;${SAM}=parent`,
      roleStore: 'memory',
      port: 0,
      webRoot: '',
      production: false,
    };
    app = await buildApp({ config, verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });
    const today = await training.today('2026-01-05');
    return { a: app, session: today.today! };
  }

  it('records a session from the keeper and shows the same summary to both roles', async () => {
    const { a, session } = await testApp();
    const planned = session.cards.reduce((s, c) => s + c.dose.sets, 0);
    const res = await a.inject({
      method: 'POST',
      url: '/api/progress/sessions',
      headers: as(KAI),
      payload: {
        date: '2026-01-05',
        itemId: session.itemId,
        itemVersion: session.itemVersion,
        outcome: 'done',
        warmUpLogged: true,
        // More praise than planned sets: the server caps it.
        praised: Array.from({ length: planned + 3 }, () => 'Keep breathing'),
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().credit).toEqual({ session: SESSION_XP, stars: planned, form: planned * STAR_XP, total: SESSION_XP + planned * STAR_XP });
    const kai = (await a.inject({ method: 'GET', url: '/api/progress/summary?date=2026-01-05', headers: as(KAI) })).json();
    const sam = (await a.inject({ method: 'GET', url: '/api/progress/summary?date=2026-01-05', headers: as(SAM) })).json();
    expect(sam).toEqual(kai);
    expect(kai).toMatchObject({ team: { current: 1 }, keeper: { current: 1 }, parent: { current: 1 }, today: 'together' });
  });

  it('refuses an account with no role and a malformed record', async () => {
    const { a } = await testApp();
    expect((await a.inject({ method: 'GET', url: '/api/progress/summary', headers: as('nobody@example.com') })).statusCode).toBe(403);
    const bad = await a.inject({ method: 'POST', url: '/api/progress/sessions', headers: as(KAI), payload: { outcome: 'won' } });
    expect(bad.statusCode).toBe(400);
  });
});
