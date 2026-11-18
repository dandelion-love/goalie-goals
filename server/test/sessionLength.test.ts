import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { MemoryScheduleStore, ScheduleService } from '../src/schedule.js';
import { SECONDS_PER_REP, cardSeconds, loadContent } from '../src/content.js';
import {
  TrainingService,
  sessionItemId,
  sessionSeconds,
  templateMinutes,
  wholeMinutes,
  type SessionTemplate,
} from '../src/training.js';
import { MAX_SESSION_MINUTES, STARTER_PACK, WeeklyPlan, checkPlanRules, layOut } from '../src/weeklyPlan.js';

// Story 120: sessions may run up to 15 minutes, and every place a session is offered shows its
// length from the one estimate. Fixtures: the invented cast; content is the repo's own cards.
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const PARENT = { account: SAM, role: 'parent' as const };
const CONTENT = loadContent();

// 2026-01-05 is a Monday.
const [MON, WED, FRI] = ['2026-01-05', '2026-01-07', '2026-01-09'];

const doses = (t: SessionTemplate) => t.cardIds.map((id) => CONTENT.cards.get(id)!.card.dose);
const seconds = (t: SessionTemplate) => sessionSeconds(t, doses(t));

/** The pack with one session's warm-up stretched so the estimate comes to `total` seconds. */
function packWith(index: number, total: number): SessionTemplate[] {
  const base = STARTER_PACK[index];
  const extra = total - seconds(base);
  const stretched: SessionTemplate = {
    ...base,
    // The cool-down takes the extra, so the warm-up stays inside its own 5 to 10 minutes.
    coolDown: [...base.coolDown, { name: 'Slow walk', seconds: extra, cue: 'Breathe out slowly' }],
  };
  return STARTER_PACK.map((t, i) => (i === index ? stretched : t));
}

describe('AC1: the 15-minute limit', () => {
  it('the estimate: moves at their seconds, cards at 4 s a rep or the hold, sides and rests counted', () => {
    expect(SECONDS_PER_REP).toBe(4);
    // Squat to box: 2 sets of 10 reps, rest 60 s -> 2 x 10 x 4 + 60.
    expect(cardSeconds({ kind: 'reps', sets: 2, reps: 10, per_side: false, rest_s: 60 })).toBe(140);
    // A hold each side: 2 sets of 20 s each side, rest 45 s -> 2 x 40 + 45.
    expect(cardSeconds({ kind: 'hold', sets: 2, seconds: 20, per_side: true, rest_s: 45 })).toBe(125);
    expect(STARTER_PACK.map(seconds)).toEqual([691, 912, 739]);
    expect(STARTER_PACK.map((t) => templateMinutes(t, CONTENT))).toEqual([12, 15, 12]);
  });

  it('whole minutes, rounded to the nearest, never 0', () => {
    expect([0, 20, 29, 30, 89, 90, 912, 929, 930].map(wholeMinutes)).toEqual([1, 1, 1, 1, 1, 2, 15, 15, 16]);
  });

  it('the pack keeps the limit, Spring legs included', () => {
    expect(MAX_SESSION_MINUTES).toBe(15);
    expect(checkPlanRules(layOut(STARTER_PACK, [1, 3, 5]), CONTENT)).toEqual([]);
  });

  it('fails a session estimated over the limit, and passes one that rounds to it', () => {
    expect(checkPlanRules(layOut(packWith(1, 929), [1, 3, 5]), CONTENT)).toEqual([]);
    expect(checkPlanRules(layOut(packWith(1, 930), [1, 3, 5]), CONTENT)).toEqual([
      'Wed "Spring legs": about 16 minutes, over the 15-minute limit.',
    ]);
  });

  it('the parent cannot choose days that would lay out an over-long session', async () => {
    const plan = new WeeklyPlan(packWith(0, 20 * 60));
    const schedule = new ScheduleService({ store: new MemoryScheduleStore(), plan, audit: new MemoryAuditLog(), content: () => CONTENT });
    await expect(schedule.set(PARENT, [2, 4, 6], MON)).rejects.toThrow(
      'Tue "Strong middle": about 20 minutes, over the 15-minute limit.',
    );
  });
});

describe('AC2: one estimate, the same minutes everywhere a session is offered', () => {
  const signer = new TestSigner();
  const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });
  let app: FastifyInstance | undefined;
  let approvals: ApprovalService;
  let training: TrainingService;

  const config = (): Config => ({
    audience: AUDIENCE,
    devMockIdentity: false,
    devMockAccount: KAI,
    roleSeed: `${KAI}=keeper;${SAM}=parent`,
    roleStore: 'memory',
    port: 0,
    webRoot: '',
    production: false,
  });

  beforeEach(() => {
    approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
    training = new TrainingService({ approvals, content: CONTENT, plan: new WeeklyPlan() });
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("the inbox request, Today, the training days and the week's next line agree", async () => {
    await training.proposeFor(MON);
    const pending = await approvals.pending();
    // The session request in the parent's inbox leads with its minutes.
    const requested = STARTER_PACK.map((t) => {
      const r = pending.find((p) => p.itemId === sessionItemId(t.id))!;
      return Number(/^About (\d+) minutes\./.exec(r.content.detail)![1]);
    });
    for (const r of pending) await approvals.approve(r.id, PARENT);
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });

    const today = [];
    for (const date of [MON, WED, FRI]) {
      const res = await app.inject({ method: 'GET', url: `/api/training/today?date=${date}`, headers: as(KAI) });
      today.push(res.json().today.minutes as number);
    }
    const days = await app.inject({ method: 'GET', url: `/api/training/days?date=${MON}`, headers: as(SAM) });
    const themes = (days.json().themes as { minutes: number }[]).map((t) => t.minutes);
    const next = [];
    for (const date of [FRI, MON, WED]) {
      // The next session after Fri is Mon's, after Mon Wed's, after Wed Fri's: in pack order.
      const res = await app.inject({ method: 'GET', url: `/api/progress/week?date=${date}`, headers: as(KAI) });
      next.push(res.json().next.minutes as number);
    }
    const estimate = STARTER_PACK.map((t) => templateMinutes(t, CONTENT));
    expect(estimate).toEqual([12, 15, 12]);
    expect(requested).toEqual(estimate);
    expect(today).toEqual(estimate);
    expect(themes).toEqual(estimate);
    expect(next).toEqual(estimate);
  });

  it("the player's card seconds add up, with the moves, to Today's minutes", async () => {
    await training.proposeFor(MON);
    for (const r of await approvals.pending()) await approvals.approve(r.id, PARENT);
    for (const date of [MON, WED, FRI]) {
      const s = (await training.today(date)).today!;
      const total = [...s.warmUp, ...s.coolDown].reduce((n, m) => n + m.seconds, 0) + s.cards.reduce((n, c) => n + c.seconds, 0);
      expect(wholeMinutes(total)).toBe(s.minutes);
    }
  });
});
