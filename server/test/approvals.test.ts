import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import {
  ApprovalError,
  ApprovalService,
  FirestoreApprovalStore,
  FirestoreAuditLog,
  MemoryApprovalStore,
  MemoryAuditLog,
  REQUEST_TTL_MS,
  itemVersion,
  type ProposeInput,
} from '../src/approvals.js';
import { InAppNotifier, type Notifier } from '../src/notifier.js';

// Fixtures: the invented cast and invented training content only.
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const PARENT = { account: SAM, role: 'parent' as const };
const KEEPER = { account: KAI, role: 'keeper' as const };

const PLAN: ProposeInput = {
  kind: 'plan',
  itemId: 'plan-starter',
  content: { title: 'Starter plan', detail: 'Three short sessions a week.' },
};
const EXERCISE: ProposeInput = {
  kind: 'exercise',
  itemId: 'lateral-shuffle',
  content: { title: 'Lateral shuffle', detail: '2 sets of 3 efforts over 4 m.' },
};
const HARDER: ProposeInput = {
  kind: 'harder_version',
  itemId: 'pogo-hops',
  content: { title: 'Low pogo hops, a step harder', detail: 'Hops forward and back over a line, 3 sets of 6.' },
};

class TestClock {
  now = new Date('2026-01-05T09:00:00Z');
  read = () => new Date(this.now);
  advance(ms: number) {
    this.now = new Date(this.now.getTime() + ms);
  }
}

let clock: TestClock;
let notifier: InAppNotifier;
let service: ApprovalService;

beforeEach(() => {
  clock = new TestClock();
  notifier = new InAppNotifier();
  service = new ApprovalService({
    store: new MemoryApprovalStore(),
    audit: new MemoryAuditLog(),
    notifier,
    clock: clock.read,
  });
});

describe('approval requests (AC1)', () => {
  it('lists plan, exercise and harder-version requests as pending', async () => {
    await service.propose(PLAN);
    await service.propose(EXERCISE);
    await service.propose(HARDER);
    const pending = await service.pending();
    expect(pending.map((r) => r.kind)).toEqual(['plan', 'exercise', 'harder_version']);
    expect(pending.every((r) => r.state === 'pending' && r.decidedAt === null)).toBe(true);
  });

  it('ties an approval to the exact item version', async () => {
    const r = await service.propose(EXERCISE);
    expect(r.itemVersion).toBe(itemVersion(EXERCISE.content));
    const done = await service.approve(r.id, PARENT);
    expect(done.state).toBe('approved');
    expect(done.decidedBy).toBe(SAM);
    expect(done.decidedAt).toEqual(clock.now);
    expect(await service.isApproved(EXERCISE.itemId, r.itemVersion)).toBe(true);
    expect(await service.isApproved(EXERCISE.itemId, 'sha256:other')).toBe(false);
  });

  it('needs a new approval when the item changes, and keeps the last approved version meanwhile', async () => {
    const v1 = await service.propose(EXERCISE);
    await service.approve(v1.id, PARENT);
    const edited = { ...EXERCISE, content: { ...EXERCISE.content, detail: '2 sets of 4 efforts over 4 m.' } };
    const v2 = await service.propose(edited);
    expect(v2.id).not.toBe(v1.id);
    expect(v2.state).toBe('pending');
    expect(v2.itemVersion).not.toBe(v1.itemVersion);
    expect(await service.isApproved(EXERCISE.itemId, v2.itemVersion)).toBe(false);
    let items = await service.approvedItems();
    expect(items).toHaveLength(1);
    expect(items[0].itemVersion).toBe(v1.itemVersion);
    expect(items[0].content.detail).toBe(EXERCISE.content.detail);

    clock.advance(1000);
    await service.approve(v2.id, PARENT);
    items = await service.approvedItems();
    expect(items.map((i) => i.itemVersion)).toEqual([v2.itemVersion]);
  });

  it('does not ask again for a version already approved', async () => {
    const r = await service.propose(PLAN);
    await service.approve(r.id, PARENT);
    const again = await service.propose(PLAN);
    expect(again.id).toBe(r.id);
    expect(await service.pending()).toHaveLength(0);
  });

  it('never changes a decided request', async () => {
    const r = await service.propose(PLAN);
    await service.decline(r.id, PARENT, 'Too much this week');
    await expect(service.approve(r.id, PARENT)).rejects.toMatchObject({ code: 'not_pending' });
  });

  it('refuses a keeper who tries to approve or decline, and logs the refusal', async () => {
    const r = await service.propose(PLAN);
    await expect(service.approve(r.id, KEEPER)).rejects.toBeInstanceOf(ApprovalError);
    await expect(service.decline(r.id, KEEPER, null)).rejects.toMatchObject({ code: 'forbidden' });
    expect((await service.store.get(r.id))?.state).toBe('pending');
    const refused = (await service.audit.list()).filter((e) => e.action === 'refused');
    expect(refused).toHaveLength(2);
    expect(refused[0].actorRole).toBe('keeper');
  });
});

describe('declined and expired requests (AC3)', () => {
  it('never shows a declined item to the keeper', async () => {
    const r = await service.propose(HARDER);
    await service.decline(r.id, PARENT, 'Not yet');
    expect(await service.approvedItems()).toEqual([]);
    expect(await service.isApproved(HARDER.itemId, r.itemVersion)).toBe(false);
  });

  it('expires a request after 7 days of silence, which never counts as approval', async () => {
    const r = await service.propose(PLAN);
    clock.advance(REQUEST_TTL_MS - 1);
    expect(await service.pending()).toHaveLength(1);
    clock.advance(1);
    expect(await service.pending()).toHaveLength(0);
    const stored = await service.store.get(r.id);
    expect(stored?.state).toBe('expired');
    expect(stored?.decidedBy).toBe('system');
    expect(await service.approvedItems()).toEqual([]);
    expect(await service.isApproved(PLAN.itemId, r.itemVersion)).toBe(false);
  });

  it('refuses to approve a request that has expired', async () => {
    const r = await service.propose(PLAN);
    clock.advance(REQUEST_TTL_MS);
    await expect(service.approve(r.id, PARENT)).rejects.toMatchObject({ code: 'not_pending' });
    expect(await service.approvedItems()).toEqual([]);
  });

  it('lets the app ask again after an expiry, as a new request', async () => {
    const first = await service.propose(PLAN);
    clock.advance(REQUEST_TTL_MS);
    const second = await service.propose(PLAN);
    expect(second.id).not.toBe(first.id);
    expect(second.state).toBe('pending');
  });
});

describe('audit log (AC2)', () => {
  it('records every request, approval, decline and expiry in order', async () => {
    const a = await service.propose(PLAN);
    const b = await service.propose(EXERCISE);
    const c = await service.propose(HARDER);
    await service.approve(a.id, PARENT);
    await service.decline(b.id, PARENT, 'Next month');
    clock.advance(REQUEST_TTL_MS);
    await service.expireDue();
    const events = await service.audit.list();
    expect(events.map((e) => `${e.action}:${e.requestId}`)).toEqual([
      `requested:${a.id}`,
      `requested:${b.id}`,
      `requested:${c.id}`,
      `approved:${a.id}`,
      `declined:${b.id}`,
      `expired:${c.id}`,
    ]);
    expect(events[3]).toMatchObject({ actorRole: 'parent', itemVersion: a.itemVersion });
    expect(events[4].reason).toBe('Next month');
    expect(events[5].actorRole).toBe('system');
  });

  it('is append-only: no update or delete, and stored events cannot be changed', async () => {
    const log = new MemoryAuditLog();
    const methods = Object.getOwnPropertyNames(MemoryAuditLog.prototype).filter((m) => m !== 'constructor');
    expect(methods.sort()).toEqual(['append', 'list']);
    const event = await log.append({
      at: new Date(),
      action: 'requested',
      actorRole: 'system',
      actor: 'system',
      requestId: 'r1',
      kind: 'plan',
      itemId: 'plan-starter',
      itemVersion: 'sha256:x',
      title: 'Starter plan',
      reason: null,
    });
    expect(() => {
      (event as { action: string }).action = 'approved';
    }).toThrow();
    const listed = await log.list();
    expect(() => (listed as unknown[]).pop()).toThrow();
    expect((await log.list())[0].action).toBe('requested');
  });
});

describe('in-app notifier, the mock for push (AC4)', () => {
  it('counts one unread notification per pending request for the badge', async () => {
    const a = await service.propose(PLAN);
    const b = await service.propose(EXERCISE);
    await service.propose(HARDER);
    expect(await notifier.unreadCount('parent')).toBe(3);
    expect(await notifier.unreadCount('keeper')).toBe(0);
    await service.approve(a.id, PARENT);
    expect(await notifier.unreadCount('parent')).toBe(2);
    await service.decline(b.id, PARENT, null);
    expect(await notifier.unreadCount('parent')).toBe(1);
    clock.advance(REQUEST_TTL_MS);
    await service.expireDue();
    expect(await notifier.unreadCount('parent')).toBe(0);
  });

  it('works with any Notifier, so real push can replace it', async () => {
    const sent: string[] = [];
    const push: Notifier = {
      notify: async (n) => void sent.push(`${n.to}:${n.ref}`),
      withdraw: async () => undefined,
    };
    const s = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: push });
    const r = await s.propose(PLAN);
    expect(sent).toEqual([`parent:${r.id}`]);
  });
});

describe('Firestore adapters', () => {
  it('are stubs that refuse to run until wired', async () => {
    await expect(new FirestoreApprovalStore().list()).rejects.toThrow(/not wired/);
    await expect(new FirestoreAuditLog().list()).rejects.toThrow(/not wired/);
  });
});

// ---- HTTP ----

const signer = new TestSigner();
let app: FastifyInstance | undefined;

function config(): Config {
  return {
    audience: AUDIENCE,
    devMockIdentity: false,
    devMockAccount: KAI,
    roleSeed: `${KAI}=keeper; ${SAM}=parent`,
    roleStore: 'memory',
    port: 0,
    webRoot: '',
    production: false,
  };
}

async function httpApp(): Promise<FastifyInstance> {
  app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals: service });
  return app;
}

function as(account: string) {
  return { [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) };
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('approval API', () => {
  it('lists pending requests for the parent; the keeper gets 403', async () => {
    const a = await httpApp();
    const r = await service.propose(PLAN);
    const parent = await a.inject({ method: 'GET', url: '/api/approvals/pending', headers: as(SAM) });
    expect(parent.statusCode).toBe(200);
    expect(parent.headers['cache-control']).toBe('no-store');
    const body = parent.json();
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0]).toMatchObject({ id: r.id, kind: 'plan', itemVersion: r.itemVersion, state: 'pending' });
    expect(new Date(body.requests[0].expiresAt).getTime() - new Date(body.requests[0].createdAt).getTime()).toBe(
      REQUEST_TTL_MS,
    );
    const keeper = await a.inject({ method: 'GET', url: '/api/approvals/pending', headers: as(KAI) });
    expect(keeper.statusCode).toBe(403);
  });

  it('gives a keeper calling approve or decline 403 and leaves the request pending', async () => {
    const a = await httpApp();
    const r = await service.propose(EXERCISE);
    const approve = await a.inject({ method: 'POST', url: `/api/approvals/${r.id}/approve`, headers: as(KAI) });
    expect(approve.statusCode).toBe(403);
    const decline = await a.inject({ method: 'POST', url: `/api/approvals/${r.id}/decline`, headers: as(KAI) });
    expect(decline.statusCode).toBe(403);
    const unknown = await a.inject({ method: 'POST', url: '/api/approvals/nope/approve', headers: as(KAI) });
    expect(unknown.statusCode).toBe(403);
    expect((await service.store.get(r.id))?.state).toBe('pending');
    const items = await a.inject({ method: 'GET', url: '/api/training/approved', headers: as(KAI) });
    expect(items.json().items).toEqual([]);
  });

  it('refuses an account with no role on every approval route', async () => {
    const a = await httpApp();
    const r = await service.propose(PLAN);
    const stranger = as('new@example.com');
    for (const [method, url] of [
      ['GET', '/api/approvals/pending'],
      ['POST', `/api/approvals/${r.id}/approve`],
      ['POST', `/api/approvals/${r.id}/decline`],
      ['GET', '/api/training/approved'],
      ['GET', '/api/audit'],
      ['GET', '/api/notifications/badge'],
    ] as const) {
      const res = await a.inject({ method, url, headers: stranger });
      expect(res.statusCode, `${method} ${url}`).toBe(403);
    }
    const anon = await a.inject({ method: 'GET', url: '/api/audit' });
    expect(anon.statusCode).toBe(401);
  });

  it('shows the keeper only approved items, at the approved version', async () => {
    const a = await httpApp();
    const plan = await service.propose(PLAN);
    const ex = await service.propose(EXERCISE);
    const harder = await service.propose(HARDER);
    expect(
      (await a.inject({ method: 'POST', url: `/api/approvals/${plan.id}/approve`, headers: as(SAM) })).statusCode,
    ).toBe(200);
    const declined = await a.inject({
      method: 'POST',
      url: `/api/approvals/${ex.id}/decline`,
      headers: as(SAM),
      payload: { reason: 'Not this week' },
    });
    expect(declined.json().request.state).toBe('declined');

    const keeper = await a.inject({ method: 'GET', url: '/api/training/approved', headers: as(KAI) });
    expect(keeper.statusCode).toBe(200);
    const body = keeper.json();
    expect(body.items).toEqual([
      expect.objectContaining({ itemId: PLAN.itemId, itemVersion: plan.itemVersion, title: PLAN.content.title }),
    ]);
    expect(body.waiting).toBe(1);
    expect(JSON.stringify(body)).not.toContain(HARDER.content.title);
    expect(JSON.stringify(body)).not.toContain(harder.id);

    // A second answer to the same request is refused.
    const again = await a.inject({ method: 'POST', url: `/api/approvals/${plan.id}/decline`, headers: as(SAM) });
    expect(again.statusCode).toBe(409);
    const missing = await a.inject({ method: 'POST', url: '/api/approvals/nope/approve', headers: as(SAM) });
    expect(missing.statusCode).toBe(404);
  });

  it('never shows an expired request to the keeper', async () => {
    const a = await httpApp();
    const r = await service.propose(PLAN);
    clock.advance(REQUEST_TTL_MS);
    const late = await a.inject({ method: 'POST', url: `/api/approvals/${r.id}/approve`, headers: as(SAM) });
    expect(late.statusCode).toBe(409);
    const keeper = await a.inject({ method: 'GET', url: '/api/training/approved', headers: as(KAI) });
    expect(keeper.json()).toEqual({ items: [], waiting: 0 });
  });

  it('lets both roles read the audit log, without account references, and offers no way to change it', async () => {
    const a = await httpApp();
    const r = await service.propose(PLAN);
    await a.inject({ method: 'POST', url: `/api/approvals/${r.id}/approve`, headers: as(SAM) });
    for (const who of [SAM, KAI]) {
      const res = await a.inject({ method: 'GET', url: '/api/audit', headers: as(who) });
      expect(res.statusCode).toBe(200);
      expect(res.json().events.map((e: { action: string }) => e.action)).toEqual(['requested', 'approved']);
      expect(res.body).not.toContain(SAM);
    }
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      const res = await a.inject({ method, url: '/api/audit', headers: as(SAM) });
      expect(res.statusCode, method).toBe(404);
    }
    expect((await service.audit.list()).map((e) => e.action)).toEqual(['requested', 'approved']);
  });

  it('serves the badge count from the in-app notifier', async () => {
    const a = await httpApp();
    const r = await service.propose(PLAN);
    await service.propose(EXERCISE);
    const badge = async (who: string) =>
      (await a.inject({ method: 'GET', url: '/api/notifications/badge', headers: as(who) })).json().unread;
    expect(await badge(SAM)).toBe(2);
    expect(await badge(KAI)).toBe(0);
    await a.inject({ method: 'POST', url: `/api/approvals/${r.id}/approve`, headers: as(SAM) });
    expect(await badge(SAM)).toBe(1);
    clock.advance(REQUEST_TTL_MS);
    expect(await badge(SAM)).toBe(0);
  });
});

describe('dev mock seed', () => {
  it('gives the parent demo requests to answer', async () => {
    app = await buildApp({ config: { ...config(), audience: '', devMockIdentity: true } });
    const res = await app.inject({ method: 'GET', url: '/api/approvals/pending', headers: { cookie: 'dev_as=sam%40example.com' } });
    expect(res.json().requests.map((r: { kind: string }) => r.kind)).toEqual(['plan', 'exercise', 'exercise', 'harder_version']);
  });
});
