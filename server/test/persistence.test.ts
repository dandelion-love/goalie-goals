import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import {
  APPROVALS_COLLECTION,
  AUDIT_COLLECTION,
  FirestoreApprovalStore,
  FirestoreAuditLog,
  type ApprovalRequest,
} from '../src/approvals.js';
import { FirestoreProgressStore, PROGRESS_COLLECTION, type SessionRecord } from '../src/progress.js';
import { FirestorePainStore, PAIN_COLLECTION, PAIN_DOC, type PainReport } from '../src/pain.js';
import { FirestoreStartedStore, STARTED_COLLECTION, type ClientSession } from '../src/training.js';
import { HISTORY_COLLECTION } from '../src/history.js';
import { SCHEDULE_COLLECTION } from '../src/schedule.js';
import { COUNTERS_COLLECTION } from '../src/firestoreDb.js';
import { FakeFirestore } from './fakeFirestore.js';

// Story 118: the household's approvals, audit log, progress, pain pauses and started marker
// outlive a restart when the app runs on Firestore. Invented cast only; no real Firestore (a
// fake client in memory, test/fakeFirestore.ts).
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
// 2026-01-05 is a Monday; the default training days are Monday, Wednesday and Friday.
const MON = '2026-01-05';
const WED = '2026-01-07';
/** An invented note: it must never reach a log. */
const NOTE = 'Invented test note: sore after the warm-up';

const signer = new TestSigner();
const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });

function config(store: 'firestore' | 'memory' = 'firestore'): Config {
  return {
    audience: AUDIENCE,
    devMockIdentity: false,
    devMockAccount: KAI,
    roleSeed: `${KAI}=keeper;${SAM}=parent`,
    roleStore: 'memory',
    scheduleStore: store,
    port: 0,
    webRoot: '',
    production: false,
  };
}

const apps: FastifyInstance[] = [];
let logLines: string[] = [];

afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
  logLines = [];
});

/** A new app instance on the same database: what a deploy or a scale-from-zero starts. */
async function boot(db: FakeFirestore, store: 'firestore' | 'memory' = 'firestore'): Promise<FastifyInstance> {
  const a = await buildApp({
    config: config(store),
    verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys),
    firestore: db,
    logStream: { write: (line) => void logLines.push(line) },
  });
  apps.push(a);
  return a;
}

async function restart(a: FastifyInstance, db: FakeFirestore): Promise<FastifyInstance> {
  await a.close();
  apps.splice(apps.indexOf(a), 1);
  return boot(db);
}

const get = (a: FastifyInstance, url: string, account = SAM) => a.inject({ method: 'GET', url, headers: as(account) });
const post = (a: FastifyInstance, url: string, payload: Record<string, unknown>, account = KAI) =>
  a.inject({ method: 'POST', url, headers: as(account), payload });

async function approveAll(a: FastifyInstance): Promise<void> {
  const { requests } = (await get(a, '/api/approvals/pending')).json() as { requests: { id: string }[] };
  for (const r of requests) expect((await post(a, `/api/approvals/${r.id}/approve`, {}, SAM)).statusCode).toBe(200);
}

async function session(a: FastifyInstance, date: string): Promise<ClientSession> {
  const today = (await get(a, `/api/training/today?date=${date}`, KAI)).json() as { today: ClientSession | null };
  expect(today.today).not.toBeNull();
  return today.today!;
}

const start = (a: FastifyInstance, s: ClientSession) =>
  post(a, '/api/training/started', { itemId: s.itemId, itemVersion: s.itemVersion });

const finish = (a: FastifyInstance, s: ClientSession, date: string, id: string) =>
  post(a, '/api/progress/sessions', {
    id,
    date,
    itemId: s.itemId,
    itemVersion: s.itemVersion,
    outcome: 'done',
    warmUpLogged: true,
    praised: [0, 1],
  });

const historyBody = (s: ClientSession, date: string) => ({
  id: 'rec-restart-01',
  date,
  itemId: s.itemId,
  itemVersion: s.itemVersion,
  outcome: 'done',
  cards: s.cards.map((c) => ({ cardId: c.id, itemVersion: c.itemVersion, setsDone: 1, cues: [] })),
});

/** What both homes read, with the parts that move with the clock (undo windows) left out. */
async function household(a: FastifyInstance) {
  const audit = (await get(a, '/api/audit')).json() as { events: { id: string; action: string; title: string }[] };
  return {
    approved: (await get(a, '/api/training/approved')).json(),
    pending: (await get(a, '/api/approvals/pending')).json(),
    audit: audit.events.map((e) => ({ id: e.id, action: e.action, title: e.title })),
    summary: (await get(a, `/api/progress/summary?date=${WED}`)).json(),
    parentPause: (await get(a, '/api/pain/status')).json(),
    keeperPause: (await get(a, '/api/pain/status', KAI)).json(),
  };
}

describe('AC1: the Firestore stores keep the store contracts', () => {
  const request = (id: string, at: number): ApprovalRequest => ({
    id,
    kind: 'plan',
    itemId: 'session-x',
    itemVersion: 'sha256:x',
    content: { title: 'Session: x', detail: 'About 5 minutes.' },
    state: 'pending',
    createdAt: new Date(at),
    decidedAt: null,
    decidedBy: null,
    reason: null,
  });

  it('approval requests: created once, answered once in a transaction, reopened only when approved', async () => {
    const db = new FakeFirestore();
    const store = new FirestoreApprovalStore(db);
    await store.create(request('req-1', 1000));
    await store.create(request('req-2', 1000));
    await expect(store.create(request('req-1', 2000))).rejects.toThrow(/already exists/);
    expect((await store.list()).map((r) => r.id)).toEqual(['req-1', 'req-2']);

    const decision = { state: 'approved' as const, decidedAt: new Date(3000), decidedBy: SAM, reason: null };
    // Two answers at once: only one lands.
    const [one, two] = await Promise.all([store.decide('req-1', decision), store.decide('req-1', { ...decision, state: 'declined' })]);
    expect([one?.state, two?.state]).toEqual(['approved', undefined]);
    expect((await store.approvedVersion('session-x', 'sha256:x'))?.id).toBe('req-1');
    expect(await store.list({ state: 'pending' })).toHaveLength(1);

    // A new instance on the same database reads the same thing back.
    const again = new FirestoreApprovalStore(db);
    expect(await again.get('req-1')).toEqual({ ...request('req-1', 1000), state: 'approved', decidedAt: new Date(3000), decidedBy: SAM });
    expect((await again.reopen('req-1'))?.state).toBe('pending');
    expect(await again.reopen('req-1')).toBeNull();
    expect(await again.get('nope')).toBeNull();
  });

  it('the audit log: append-only, in the order written, even within one millisecond and across instances', async () => {
    const db = new FakeFirestore();
    const at = new Date(5000);
    const base = { at, actorRole: 'system' as const, actor: 'system', requestId: 'req-1', kind: 'plan' as const, itemId: 'i', itemVersion: 'v', reason: null };
    const log = new FirestoreAuditLog(db);
    for (const title of ['a', 'b', 'c']) await log.append({ ...base, action: 'requested', title });
    await new FirestoreAuditLog(db).append({ ...base, action: 'approved', title: 'd' });
    const events = await new FirestoreAuditLog(db).list();
    expect(events.map((e) => e.title)).toEqual(['a', 'b', 'c', 'd']);
    expect(Object.isFrozen(events)).toBe(true);
    expect(events[0].at).toEqual(at);
    expect('update' in log || 'delete' in log).toBe(false);
  });

  it('day results: a resent id is kept once, in the order recorded', async () => {
    const db = new FakeFirestore();
    const store = new FirestoreProgressStore(db);
    const record = (id: string): SessionRecord => ({
      id,
      date: MON,
      itemId: 'session-x',
      itemVersion: 'sha256:x',
      outcome: 'done',
      warmUpLogged: true,
      praisedSets: 2,
      plannedSets: 6,
      present: ['keeper', 'parent'],
      recordedBy: 'keeper',
      at: new Date(7000),
      credit: { session: 10, stars: 4, form: 0, total: 14 },
    });
    await Promise.all([store.add(record('fin-00000002')), store.add(record('fin-00000002'))]);
    await store.add(record('fin-00000001'));
    expect(await new FirestoreProgressStore(db).list()).toEqual([record('fin-00000002'), record('fin-00000001')]);
  });

  it('pain reports: kept once, one clear closes every open report, one mistake note per pause', async () => {
    const db = new FakeFirestore();
    const store = new FirestorePainStore(db);
    const report = (id: string, at: number): PainReport => ({
      id,
      bodyArea: 'knee',
      note: NOTE,
      date: MON,
      at: new Date(at),
      reportedBy: 'keeper',
      clearedAt: null,
      clearedOn: null,
      mistakeAt: null,
      mistakeId: null,
    });
    await Promise.all([store.create(report('pain-0000001', 1)), store.create(report('pain-0000001', 2))]);
    await store.create(report('pain-0000002', 3));
    expect((await store.list()).map((r) => [r.id, r.at.getTime()])).toEqual([
      ['pain-0000001', 1],
      ['pain-0000002', 3],
    ]);
    const marks = await Promise.all([
      store.markMistake('pain-0000001', 'mist-0000001', new Date(4)),
      store.markMistake('pain-0000002', 'mist-0000002', new Date(4)),
    ]);
    expect(marks.filter((m) => m !== null)).toHaveLength(1);
    const cleared = await new FirestorePainStore(db).clearOpen(new Date(5), WED);
    expect(cleared.map((r) => r.id)).toEqual(['pain-0000001', 'pain-0000002']);
    expect(await store.clearOpen(new Date(6), WED)).toEqual([]);
    expect((await store.list()).every((r) => r.clearedOn === WED)).toBe(true);
  });

  it('the started marker: keys added once, read back by a new instance', async () => {
    const db = new FakeFirestore();
    await Promise.all([new FirestoreStartedStore(db).add(['a@1', 'b@2']), new FirestoreStartedStore(db).add(['b@2', 'c@3'])]);
    expect((await new FirestoreStartedStore(db).list()).sort()).toEqual(['a@1', 'b@2', 'c@3']);
  });
});

describe('AC2: a restart keeps approvals, day results, streaks and pauses', () => {
  it('reads everything back unchanged on a new app instance, the open pause in the urgent inbox', async () => {
    const db = new FakeFirestore();
    let a = await boot(db);
    await approveAll(a);
    const requests = (await new FirestoreApprovalStore(db).list()).length;
    expect(requests).toBeGreaterThan(0);

    const mon = await session(a, MON);
    expect((await start(a, mon)).statusCode).toBe(200);
    expect((await finish(a, mon, MON, 'fin-mon-0001')).statusCode).toBe(200);
    const wed = await session(a, WED);
    expect((await start(a, wed)).statusCode).toBe(200);
    expect((await finish(a, wed, WED, 'fin-wed-0001')).statusCode).toBe(200);
    expect((await post(a, '/api/pain', { id: 'pain-restart-1', bodyArea: 'knee', note: NOTE, date: WED })).statusCode).toBe(200);

    const before = await household(a);
    expect(before.pending).toEqual({ requests: [] });
    expect(before.summary).toMatchObject({ team: { current: 2 }, xp: { total: expect.any(Number) } });
    expect(before.summary.xp.total).toBeGreaterThan(0);
    expect(before.parentPause).toMatchObject({ paused: true, reports: [{ id: 'pain-restart-1', bodyArea: 'knee', note: NOTE }] });

    a = await restart(a, db);
    expect(await household(a)).toEqual(before);
    // No approval is asked again: the startup proposal finds every version already approved.
    expect((await new FirestoreApprovalStore(db).list()).length).toBe(requests);
    // The open pause still holds training and reaches the parent's badge.
    expect((await get(a, `/api/training/today?date=${WED}`, KAI)).json()).toMatchObject({ paused: true, today: null });
    expect((await get(a, '/api/notifications/badge')).json()).toEqual({ unread: 1 });
    // A finish resent from the outbox after the restart is still recorded once.
    expect((await finish(a, wed, WED, 'fin-wed-0001')).statusCode).toBe(200);
    expect((await get(a, `/api/progress/summary?date=${WED}`)).json()).toEqual(before.summary);
  });

  it('keeps a mistake note (story 104) and a cleared pause across restarts', async () => {
    const db = new FakeFirestore();
    let a = await boot(db);
    await approveAll(a);
    expect((await post(a, '/api/pain', { id: 'pain-restart-2', bodyArea: 'ankle_foot', date: MON })).statusCode).toBe(200);
    expect((await post(a, '/api/pain/mistake', { id: 'mist-restart-2', reportId: 'pain-restart-2' })).statusCode).toBe(200);

    a = await restart(a, db);
    expect((await get(a, '/api/pain/status')).json()).toMatchObject({
      paused: true,
      reports: [{ id: 'pain-restart-2', mistakeAt: expect.any(String) }],
    });
    expect((await get(a, '/api/pain/status', KAI)).json()).toMatchObject({ paused: true, reports: [{ mistake: true }] });
    expect((await get(a, '/api/notifications/badge')).json()).toEqual({ unread: 1 });
    // A second note for the same pause is still refused after the restart.
    expect((await post(a, '/api/pain/mistake', { id: 'mist-restart-3', reportId: 'pain-restart-2' })).statusCode).toBe(409);

    expect((await post(a, '/api/pain/clear', { date: WED }, SAM)).statusCode).toBe(200);
    a = await restart(a, db);
    expect((await get(a, '/api/pain/status')).json()).toEqual({ paused: false, since: null, reports: [] });
    expect((await get(a, `/api/training/today?date=${WED}`, KAI)).json()).toMatchObject({ paused: false });
    expect((await get(a, '/api/notifications/badge')).json()).toEqual({ unread: 0 });
    const actions = ((await get(a, '/api/audit')).json() as { events: { action: string }[] }).events.map((e) => e.action);
    expect(actions.filter((x) => ['paused', 'marked', 'cleared'].includes(x))).toEqual(['paused', 'marked', 'cleared']);
  });

  it('accepts the history record (story 113) of a session started before the restart, once', async () => {
    const db = new FakeFirestore();
    let a = await boot(db);
    await approveAll(a);
    const mon = await session(a, MON);
    expect((await start(a, mon)).statusCode).toBe(200);
    const planId = ((await get(a, '/api/training/approved')).json() as { items: { itemId: string }[] }).items.find(
      (i) => i.itemId === mon.itemId,
    );
    expect(planId).toBeDefined();

    a = await restart(a, db);
    expect((await post(a, '/api/history/sessions', historyBody(mon, MON))).statusCode).toBe(200);
    expect((await post(a, '/api/history/sessions', historyBody(mon, MON))).json()).toEqual({ error: 'duplicate' });
    // The approval a started session uses still cannot be undone after the restart.
    const plan = (await new FirestoreApprovalStore(db).list({ state: 'approved' })).find((r) => r.itemId === mon.itemId)!;
    const undo = await post(a, `/api/approvals/${plan.id}/undo`, {}, SAM);
    expect(undo.json()).toEqual({ error: 'started' });
  });

  it('still refuses a record for a session that was never started', async () => {
    const db = new FakeFirestore();
    let a = await boot(db);
    await approveAll(a);
    const wed = await session(a, WED);
    a = await restart(a, db);
    expect((await post(a, '/api/history/sessions', historyBody(wed, WED))).json()).toEqual({ error: 'not-started' });
  });
});

describe('AC3: an open pause is never lost when the store is unreachable', () => {
  it('answers with an error and never as unpaused', async () => {
    const db = new FakeFirestore();
    const a = await boot(db);
    await approveAll(a);
    const wed = await session(a, WED);
    expect((await post(a, '/api/pain', { id: 'pain-outage-1', bodyArea: 'back', note: NOTE, date: WED })).statusCode).toBe(200);

    db.failReads = true;
    for (const [url, account] of [
      ['/api/pain/status', SAM],
      ['/api/pain/status', KAI],
      [`/api/training/today?date=${WED}`, KAI],
      [`/api/progress/summary?date=${WED}`, SAM],
    ] as const) {
      const res = await get(a, url, account);
      expect(res.statusCode, url).toBeGreaterThanOrEqual(500);
      expect(res.body, url).not.toMatch(/"paused":false/);
    }
    expect((await start(a, wed)).statusCode).toBeGreaterThanOrEqual(500);
    // A new instance does not start on a store it cannot read.
    await expect(boot(db)).rejects.toThrow(/UNAVAILABLE/);
    expect(logLines.join('\n')).not.toContain(NOTE);
  });

  it('treats a stored report it cannot read as an error, not as no pause', async () => {
    const db = new FakeFirestore();
    const a = await boot(db);
    expect((await post(a, '/api/pain', { id: 'pain-broken-1', bodyArea: 'hip', date: WED })).statusCode).toBe(200);
    const doc = db.docs.get(`${PAIN_COLLECTION}/${PAIN_DOC}`)!;
    db.docs.set(`${PAIN_COLLECTION}/${PAIN_DOC}`, { reports: [...(doc.reports as unknown[]), { id: 'pain-broken-2' }] });
    expect((await get(a, '/api/pain/status')).statusCode).toBeGreaterThanOrEqual(500);
    expect((await get(a, `/api/training/today?date=${WED}`, KAI)).statusCode).toBeGreaterThanOrEqual(500);
  });
});

describe("AC4: the household's own collections, deleted with the household", () => {
  it('deletes household records and retains only the opaque evidence revision', async () => {
    const db = new FakeFirestore();
    const a = await boot(db);
    await approveAll(a);
    const mon = await session(a, MON);
    expect((await start(a, mon)).statusCode).toBe(200);
    expect((await finish(a, mon, MON, 'fin-del-00001')).statusCode).toBe(200);
    expect((await post(a, '/api/history/sessions', historyBody(mon, MON))).statusCode).toBe(200);
    expect((await a.inject({ method: 'PUT', url: '/api/training/days', headers: as(SAM), payload: { days: [1, 3, 5], date: MON } })).statusCode).toBe(200);
    expect((await post(a, '/api/pain', { id: 'pain-delete-1', bodyArea: 'neck', note: NOTE, date: MON })).statusCode).toBe(200);

    const collections = new Set(db.paths().map((p) => p.split('/')[0]));
    expect([...collections].sort()).toEqual(
      [
        APPROVALS_COLLECTION,
        AUDIT_COLLECTION,
        COUNTERS_COLLECTION,
        HISTORY_COLLECTION,
        PAIN_COLLECTION,
        PROGRESS_COLLECTION,
        'progressionEvidence',
        SCHEDULE_COLLECTION,
        STARTED_COLLECTION,
      ].sort(),
    );
    expect(logLines.join('\n')).not.toContain(NOTE);

    await a.household.deleteAll();
    expect(db.paths()).toEqual(['progressionEvidence/revision']);
    expect(Object.keys(db.docs.get('progressionEvidence/revision') ?? {})).toEqual(['value']);
  });
});

describe('AC5: the memory stores stay for tests and the demo', () => {
  it('never touches the database with SCHEDULE_STORE=memory', async () => {
    const db = new FakeFirestore();
    const a = await boot(db, 'memory');
    await approveAll(a);
    expect((await post(a, '/api/pain', { id: 'pain-memory-1', bodyArea: 'knee', date: MON })).statusCode).toBe(200);
    expect(db.paths()).toEqual([]);
  });
});
