import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalError, ApprovalService, MemoryApprovalStore, MemoryAuditLog, UNDO_WINDOW_MS } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent } from '../src/content.js';
import { STARTER_SESSION, SingleSessionPlan, TrainingService } from '../src/training.js';

// Story #80 AC4: a parent may undo an approval for a short time; the undo is its own audit
// event, and it is refused once the keeper has started the session. Invented cast only.
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const PARENT = { account: SAM, role: 'parent' as const };
const KEEPER = { account: KAI, role: 'keeper' as const };
const DATE = '2026-01-05';

class TestClock {
  now = new Date('2026-01-05T09:00:00Z');
  read = () => new Date(this.now);
  advance(ms: number) {
    this.now = new Date(this.now.getTime() + ms);
  }
}

let clock: TestClock;
let notifier: InAppNotifier;
let approvals: ApprovalService;
let training: TrainingService;

beforeEach(() => {
  clock = new TestClock();
  notifier = new InAppNotifier();
  approvals = new ApprovalService({
    store: new MemoryApprovalStore(),
    audit: new MemoryAuditLog(),
    notifier,
    clock: clock.read,
  });
  training = new TrainingService({ approvals, content: loadContent(), plan: new SingleSessionPlan(STARTER_SESSION) });
});

async function approveAll() {
  for (const r of await approvals.pending()) await approvals.approve(r.id, PARENT);
}

async function sessionRequest() {
  return (await approvals.store.list()).find((r) => r.kind === 'plan')!;
}

describe('undo an approval (service)', () => {
  it('sets the window to 30 seconds', () => {
    expect(UNDO_WINDOW_MS).toBe(30_000);
  });

  it('puts the request back in the inbox, hides it from the keeper and logs its own event', async () => {
    await training.proposeFor(DATE);
    await approveAll();
    expect((await training.today(DATE)).today).not.toBeNull();
    const r = await sessionRequest();
    const before = (await approvals.audit.list()).length;

    clock.advance(10_000);
    const undone = await approvals.undoApproval(r.id, PARENT);
    expect(undone.state).toBe('pending');
    expect((await approvals.pending()).map((p) => p.id)).toContain(r.id);
    expect((await training.today(DATE)).today).toBeNull();
    expect(await notifier.unreadCount('parent')).toBe(1);

    const log = await approvals.audit.list();
    expect(log).toHaveLength(before + 1);
    expect(log.at(-1)).toMatchObject({ action: 'undone', actorRole: 'parent', requestId: r.id });
    // The approval itself stays in the log: a correction is a new event.
    expect(log.filter((e) => e.action === 'approved' && e.requestId === r.id)).toHaveLength(1);
  });

  it('refuses after the window', async () => {
    await training.proposeFor(DATE);
    await approveAll();
    const r = await sessionRequest();
    expect(approvals.undoForMs(r)).toBe(UNDO_WINDOW_MS);
    clock.advance(UNDO_WINDOW_MS);
    expect(approvals.undoForMs((await approvals.store.get(r.id))!)).toBe(0);
    await expect(approvals.undoApproval(r.id, PARENT)).rejects.toMatchObject({ code: 'too_late' });
    expect((await approvals.store.get(r.id))!.state).toBe('approved');
  });

  it('refuses once the keeper has started a session that uses the approved version', async () => {
    await training.proposeFor(DATE);
    await approveAll();
    const session = (await training.today(DATE)).today!;
    expect(await training.markStarted(session.itemId, session.itemVersion)).toBe(true);

    const plan = await sessionRequest();
    await expect(approvals.undoApproval(plan.id, PARENT, async (r) => training.hasStarted(r))).rejects.toMatchObject({
      code: 'started',
    });
    // A card in that session counts too.
    const card = (await approvals.store.list()).find((r) => r.kind === 'exercise')!;
    await expect(approvals.undoApproval(card.id, PARENT, async (r) => training.hasStarted(r))).rejects.toBeInstanceOf(
      ApprovalError,
    );
    expect((await approvals.audit.list()).some((e) => e.action === 'undone')).toBe(false);
  });

  it('does not start a session whose approval was just undone', async () => {
    await training.proposeFor(DATE);
    await approveAll();
    const session = (await training.today(DATE)).today!;
    await approvals.undoApproval((await sessionRequest()).id, PARENT);
    expect(await training.markStarted(session.itemId, session.itemVersion)).toBe(false);
  });

  it('refuses the keeper and logs the attempt', async () => {
    await training.proposeFor(DATE);
    await approveAll();
    const r = await sessionRequest();
    await expect(approvals.undoApproval(r.id, KEEPER)).rejects.toMatchObject({ code: 'forbidden' });
    expect((await approvals.audit.list()).at(-1)).toMatchObject({ action: 'refused', actorRole: 'keeper' });
    expect((await approvals.store.get(r.id))!.state).toBe('approved');
  });

  it('refuses a request that is not approved', async () => {
    await training.proposeFor(DATE);
    const r = await sessionRequest();
    await expect(approvals.undoApproval(r.id, PARENT)).rejects.toMatchObject({ code: 'not_pending' });
    await expect(approvals.undoApproval('nope', PARENT)).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('undo API', () => {
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

  async function testApp() {
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });
    return app;
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('approve returns the undo window; the History entry offers it to the parent only', async () => {
    await training.proposeFor(DATE);
    const a = await testApp();
    const r = await sessionRequest();
    const res = await a.inject({ method: 'POST', url: `/api/approvals/${r.id}/approve`, headers: as(SAM), payload: {} });
    expect(res.json()).toMatchObject({ request: { state: 'approved' }, undoForMs: UNDO_WINDOW_MS });

    clock.advance(5_000);
    const parent = (await a.inject({ method: 'GET', url: '/api/audit', headers: as(SAM) })).json().events;
    const entry = parent.find((e: { action: string; requestId: string }) => e.action === 'approved' && e.requestId === r.id);
    expect(entry.undoForMs).toBe(UNDO_WINDOW_MS - 5_000);
    const keeper = (await a.inject({ method: 'GET', url: '/api/audit', headers: as(KAI) })).json().events;
    expect(keeper.every((e: { undoForMs: number }) => e.undoForMs === 0)).toBe(true);

    clock.advance(UNDO_WINDOW_MS);
    const later = (await a.inject({ method: 'GET', url: '/api/audit', headers: as(SAM) })).json().events;
    expect(later.every((e: { undoForMs: number }) => e.undoForMs === 0)).toBe(true);
  });

  it('undoes within the window, and the History shows the undo', async () => {
    await training.proposeFor(DATE);
    await approveAll();
    const a = await testApp();
    const r = await sessionRequest();
    const res = await a.inject({ method: 'POST', url: `/api/approvals/${r.id}/undo`, headers: as(SAM) });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.json()).toMatchObject({ request: { id: r.id, state: 'pending' } });
    const events = (await a.inject({ method: 'GET', url: '/api/audit', headers: as(KAI) })).json().events;
    expect(events.at(-1)).toMatchObject({ action: 'undone', actorRole: 'parent', requestId: r.id });
    const today = (await a.inject({ method: 'GET', url: `/api/training/today?date=${DATE}`, headers: as(KAI) })).json();
    expect(today.today).toBeNull();
  });

  it('refuses with 409 after the window or once the session started, and 403 for the keeper', async () => {
    await training.proposeFor(DATE);
    await approveAll();
    const a = await testApp();
    const r = await sessionRequest();
    const session = (await training.today(DATE)).today!;

    const keeper = await a.inject({ method: 'POST', url: `/api/approvals/${r.id}/undo`, headers: as(KAI) });
    expect(keeper.statusCode).toBe(403);

    const started = await a.inject({
      method: 'POST',
      url: '/api/training/started',
      headers: as(KAI),
      payload: { itemId: session.itemId, itemVersion: session.itemVersion },
    });
    expect(started.statusCode).toBe(200);
    const refused = await a.inject({ method: 'POST', url: `/api/approvals/${r.id}/undo`, headers: as(SAM) });
    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toEqual({ error: 'started' });

    const card = (await approvals.store.list()).find((x) => x.kind === 'exercise')!;
    clock.advance(UNDO_WINDOW_MS + 1);
    const late = await a.inject({ method: 'POST', url: `/api/approvals/${card.id}/undo`, headers: as(SAM) });
    expect(late.json()).toEqual({ error: 'too_late' });
  });

  it('refuses to mark a start for a version that is not approved', async () => {
    await training.proposeFor(DATE);
    const a = await testApp();
    const r = await sessionRequest();
    const res = await a.inject({
      method: 'POST',
      url: '/api/training/started',
      headers: as(KAI),
      payload: { itemId: r.itemId, itemVersion: r.itemVersion },
    });
    expect(res.statusCode).toBe(409);
    const bad = await a.inject({ method: 'POST', url: '/api/training/started', headers: as(KAI), payload: {} });
    expect(bad.statusCode).toBe(400);
  });
});
