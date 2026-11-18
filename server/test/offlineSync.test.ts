import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, LATE_START_REASON, MemoryApprovalStore, MemoryAuditLog, onLocalDate } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent } from '../src/content.js';
import { STARTER_SESSION, SingleSessionPlan, TrainingService } from '../src/training.js';

// Story #94: start and finish events queued on the keeper's device while offline, and the two
// races with the parent's undo. Invented cast only.
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const PARENT = { account: SAM, role: 'parent' as const };
const DATE = '2026-01-05';

class TestClock {
  now = new Date('2026-01-05T09:00:00Z');
  read = () => new Date(this.now);
  advance(ms: number) {
    this.now = new Date(this.now.getTime() + ms);
  }
}

const signer = new TestSigner();
const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });

let clock: TestClock;
let approvals: ApprovalService;
let training: TrainingService;
let app: FastifyInstance | undefined;

beforeEach(() => {
  clock = new TestClock();
  approvals = new ApprovalService({
    store: new MemoryApprovalStore(),
    audit: new MemoryAuditLog(),
    notifier: new InAppNotifier(),
    clock: clock.read,
  });
  training = new TrainingService({ approvals, content: loadContent(), plan: new SingleSessionPlan(STARTER_SESSION) });
});

afterEach(async () => {
  await app?.close();
  app = undefined;
});

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

/** The app with today's session approved, and the session as the keeper's device loaded it. */
async function ready() {
  await training.proposeFor(DATE);
  for (const r of await approvals.pending()) await approvals.approve(r.id, PARENT);
  app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });
  const session = (await training.today(DATE)).today!;
  const plan = (await approvals.store.list()).find((r) => r.kind === 'plan')!;
  return { a: app, session, plan };
}

const start = (a: FastifyInstance, session: { itemId: string; itemVersion: string }, late: boolean, date = DATE) =>
  a.inject({
    method: 'POST',
    url: '/api/training/started',
    headers: as(KAI),
    payload: { date, itemId: session.itemId, itemVersion: session.itemVersion, late },
  });

const finish = (a: FastifyInstance, session: { itemId: string; itemVersion: string }, id: string) =>
  a.inject({
    method: 'POST',
    url: '/api/progress/sessions',
    headers: as(KAI),
    payload: {
      id,
      date: DATE,
      itemId: session.itemId,
      itemVersion: session.itemVersion,
      outcome: 'done',
      warmUpLogged: true,
      praised: ['Straight like a board', 'Push through the heels'],
    },
  });

describe('a queued start lands first (AC1)', () => {
  it('refuses an undo once the queued start has reached the server', async () => {
    const { a, session, plan } = await ready();
    expect((await start(a, session, true)).json()).toEqual({ ok: true });
    const undo = await a.inject({ method: 'POST', url: `/api/approvals/${plan.id}/undo`, headers: as(SAM) });
    expect(undo.statusCode).toBe(409);
    expect(undo.json()).toEqual({ error: 'started' });
    // An ordinary start is not audited: only the late one below is.
    expect((await approvals.audit.list()).some((e) => e.action === 'started')).toBe(false);
  });
});

describe('the undo lands first (AC2)', () => {
  it('still records a late start, audits it, keeps it in History and keeps the XP', async () => {
    const { a, session, plan } = await ready();
    clock.advance(5_000);
    const undo = await a.inject({ method: 'POST', url: `/api/approvals/${plan.id}/undo`, headers: as(SAM) });
    expect(undo.statusCode).toBe(200);

    // The keeper's device had loaded the session before the undo reached it, and queued the start.
    const res = await start(a, session, true);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, late: true });

    const history = (await a.inject({ method: 'GET', url: '/api/audit', headers: as(SAM) })).json().events;
    expect(history.at(-1)).toMatchObject({
      action: 'started',
      actorRole: 'keeper',
      requestId: plan.id,
      reason: LATE_START_REASON,
    });
    expect(LATE_START_REASON).toBe('Started before the undo reached the device');
    // The keeper sees the same History, with no account in it.
    const keeperHistory = (await a.inject({ method: 'GET', url: '/api/audit', headers: as(KAI) })).json().events;
    expect(keeperHistory.at(-1)).toMatchObject({ action: 'started', reason: LATE_START_REASON });
    expect(JSON.stringify(keeperHistory)).not.toContain(KAI);

    // The queued finish follows: the session counts, with its stars.
    const done = await finish(a, session, 'evt-00000001');
    expect(done.statusCode).toBe(200);
    const { credit, summary } = done.json();
    expect(credit.total).toBeGreaterThan(0);
    expect(credit.stars).toBe(2);
    expect(summary.xp.total).toBe(credit.total);
    expect(summary.today).toBe('together');

    // Nothing new is offered until the parent approves it again.
    const today = (await a.inject({ method: 'GET', url: `/api/training/today?date=${DATE}`, headers: as(KAI) })).json();
    expect(today.today).toBeNull();
  });

  it('records the late start once when the device sends it again', async () => {
    const { a, session, plan } = await ready();
    await approvals.undoApproval(plan.id, PARENT);
    await start(a, session, true);
    await start(a, session, true);
    expect((await approvals.audit.list()).filter((e) => e.action === 'started')).toHaveLength(1);
  });

  it('refuses a start that was not queued, as before (the player closes)', async () => {
    const { a, session, plan } = await ready();
    await approvals.undoApproval(plan.id, PARENT);
    const res = await start(a, session, false);
    expect(res.statusCode).toBe(409);
    expect((await approvals.audit.list()).some((e) => e.action === 'started')).toBe(false);
  });

  it('refuses a late start for a version that was never approved', async () => {
    await training.proposeFor(DATE);
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });
    const plan = (await approvals.store.list()).find((r) => r.kind === 'plan')!;
    const res = await start(app, { itemId: plan.itemId, itemVersion: plan.itemVersion }, true);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'not_approved' });
  });

  it('refuses a late start for a version declined without an undo', async () => {
    await training.proposeFor(DATE);
    const plan = (await approvals.store.list()).find((r) => r.kind === 'plan')!;
    for (const r of await approvals.pending()) {
      if (r.id === plan.id) await approvals.decline(r.id, PARENT, null);
      else await approvals.approve(r.id, PARENT);
    }
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });
    const res = await start(app, { itemId: plan.itemId, itemVersion: plan.itemVersion }, true);
    expect(res.statusCode).toBe(409);
  });
});

describe('a late start is bounded to the day of the undo (AC2)', () => {
  it('accepts a late start dated the same day as the undo', async () => {
    const { a, session, plan } = await ready();
    await approvals.undoApproval(plan.id, PARENT);
    clock.advance(6 * 60 * 60 * 1000);
    expect((await start(a, session, true, DATE)).json()).toEqual({ ok: true, late: true });
  });

  it('refuses a late start dated after the day of the undo, and the session stays unplayable', async () => {
    const { a, session, plan } = await ready();
    await approvals.undoApproval(plan.id, PARENT);
    clock.advance(3 * 24 * 60 * 60 * 1000);
    const res = await start(a, session, true, '2026-01-08');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'not_approved' });
    expect((await approvals.audit.list()).some((e) => e.action === 'started')).toBe(false);
    // Not started, so nothing reopens it: no offer, no star cap, and the undo stays possible
    // once the parent approves it again.
    expect(training.hasStarted(session)).toBe(false);
    expect(await training.plannedSets(session.itemVersion)).toBeNull();
    const today = (await a.inject({ method: 'GET', url: '/api/training/today?date=2026-01-08', headers: as(KAI) })).json();
    expect(today.today).toBeNull();
    expect(today.lastApproved).toBeNull();
  });

  it('refuses a late start with no date', async () => {
    const { a, session, plan } = await ready();
    await approvals.undoApproval(plan.id, PARENT);
    const res = await a.inject({
      method: 'POST',
      url: '/api/training/started',
      headers: as(KAI),
      payload: { itemId: session.itemId, itemVersion: session.itemVersion, late: true },
    });
    expect(res.statusCode).toBe(409);
  });

  it("counts the undo on the device's own date, in any time zone", () => {
    // 01:00 UTC on Jan 6 is still Jan 5 in the Americas, and already Jan 6 elsewhere.
    const at = new Date('2026-01-06T01:00:00Z');
    expect(onLocalDate(at, '2026-01-05')).toBe(true);
    expect(onLocalDate(at, '2026-01-06')).toBe(true);
    expect(onLocalDate(at, '2026-01-04')).toBe(false);
    expect(onLocalDate(at, '2026-01-07')).toBe(false);
  });
});

describe('a resent finish (AC1)', () => {
  it('is recorded once: the same id gives back the same credit', async () => {
    const { a, session } = await ready();
    await start(a, session, false);
    const first = (await finish(a, session, 'evt-00000002')).json();
    const again = (await finish(a, session, 'evt-00000002')).json();
    expect(again.credit).toEqual(first.credit);
    expect(again.summary.xp.total).toBe(first.summary.xp.total);
  });
});
