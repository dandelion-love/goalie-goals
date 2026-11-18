import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { APPROVALS_COLLECTION, AUDIT_COLLECTION } from '../src/approvals.js';
import { PROGRESS_COLLECTION } from '../src/progress.js';
import { PAIN_COLLECTION } from '../src/pain.js';
import { STARTED_COLLECTION, type ClientSession } from '../src/training.js';
import { HISTORY_COLLECTION } from '../src/history.js';
import { SCHEDULE_COLLECTION, SCHEDULE_DOC } from '../src/schedule.js';
import { COUNTERS_COLLECTION } from '../src/firestoreDb.js';
import {
  FirestoreGenerationStore,
  GENERATION_COLLECTION,
  GENERATION_DOC,
  GENERATION_HEADER,
  MemoryGenerationStore,
  requestGeneration,
} from '../src/generation.js';
import { FakeFirestore } from './fakeFirestore.js';

// Story 121: the parent starts fresh. Invented cast only; no real Firestore (a fake client in
// memory, test/fakeFirestore.ts).
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const NOBODY = 'nobody@example.com';
// 2026-01-05 is a Monday; the default training days are Monday, Wednesday and Friday.
const MON = '2026-01-05';
const WED = '2026-01-07';
/** An invented note: it must be gone after the reset, and never reach a log. */
const NOTE = 'Invented test note: sore after the warm-up';

const signer = new TestSigner();
const as = (account: string, generation?: number) => ({
  [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }),
  ...(generation === undefined ? {} : { [GENERATION_HEADER]: String(generation) }),
});

type Store = 'firestore' | 'memory';

function config(store: Store): Config {
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

async function boot(db: FakeFirestore, store: Store = 'firestore'): Promise<FastifyInstance> {
  const a = await buildApp({
    config: config(store),
    verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys),
    firestore: db,
    logStream: { write: (line) => void logLines.push(line) },
  });
  apps.push(a);
  return a;
}

/** Every request in a test names the generation it expects, as the web app does. */
let gen = 0;
const get = (a: FastifyInstance, url: string, account = SAM) => a.inject({ method: 'GET', url, headers: as(account, gen) });
const send = (a: FastifyInstance, method: 'POST' | 'PUT', url: string, payload: Record<string, unknown>, account = KAI) =>
  a.inject({ method, url, headers: as(account, gen), payload });
const post = (a: FastifyInstance, url: string, payload: Record<string, unknown>, account = KAI) =>
  send(a, 'POST', url, payload, account);
const reset = (a: FastifyInstance, payload: Record<string, unknown> = { confirm: 'RESET', date: WED }, account = SAM) =>
  post(a, '/api/household/reset', payload, account);

async function pending(a: FastifyInstance): Promise<{ id: string; title: string; kind: string }[]> {
  return ((await get(a, '/api/approvals/pending')).json() as { requests: { id: string; title: string; kind: string }[] }).requests;
}

async function approveAll(a: FastifyInstance): Promise<void> {
  for (const r of await pending(a)) expect((await post(a, `/api/approvals/${r.id}/approve`, {}, SAM)).statusCode).toBe(200);
}

async function session(a: FastifyInstance, date: string): Promise<ClientSession> {
  const today = (await get(a, `/api/training/today?date=${date}`, KAI)).json() as { today: ClientSession | null };
  expect(today.today).not.toBeNull();
  return today.today!;
}

/** Fill every store: approvals, the audit log, a start, a finish, a record, a pause with its note and a mistake note. */
async function fill(a: FastifyInstance): Promise<ClientSession> {
  await approveAll(a);
  const mon = await session(a, MON);
  expect((await post(a, '/api/training/started', { itemId: mon.itemId, itemVersion: mon.itemVersion })).statusCode).toBe(200);
  const finish = { id: 'fin-reset-0001', date: MON, itemId: mon.itemId, itemVersion: mon.itemVersion, outcome: 'done', warmUpLogged: true, praised: [0, 1] };
  expect((await post(a, '/api/progress/sessions', finish)).statusCode).toBe(200);
  const cards = mon.cards.map((c) => ({ cardId: c.id, itemVersion: c.itemVersion, setsDone: 1, cues: [] }));
  const record = { id: 'rec-reset-0001', date: MON, itemId: mon.itemId, itemVersion: mon.itemVersion, outcome: 'done', cards };
  expect((await post(a, '/api/history/sessions', record)).statusCode).toBe(200);
  // The parent's own training days: kept by a fresh start.
  expect((await send(a, 'PUT', '/api/training/days', { days: [2, 4, 6], date: MON }, SAM)).statusCode).toBe(200);
  expect((await post(a, '/api/pain', { id: 'pain-reset-0001', bodyArea: 'knee', note: NOTE, date: WED })).statusCode).toBe(200);
  expect((await post(a, '/api/pain/mistake', { id: 'mist-reset-0001', reportId: 'pain-reset-0001' })).statusCode).toBe(200);
  return mon;
}

afterEach(() => {
  gen = 0;
});

describe('AC3: only a parent can start fresh, and only with the typed word', () => {
  it('refuses the keeper and an account with no role (403), logged by role and reason only', async () => {
    const db = new FakeFirestore();
    const a = await boot(db);
    await fill(a);
    const before = db.paths();

    const keeper = await reset(a, { confirm: 'RESET', date: WED }, KAI);
    expect(keeper.statusCode).toBe(403);
    expect((await reset(a, { confirm: 'RESET', date: WED }, NOBODY)).statusCode).toBe(403);
    expect(db.paths()).toEqual(before);

    const refusals = logLines.filter((l) => l.includes('household reset refused')).map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(refusals.map((l) => [l.role, l.reason])).toEqual([
      ['keeper', 'not-parent'],
      ['none', 'not-parent'],
    ]);
    const logs = logLines.join('\n');
    expect(logs).not.toContain(KAI);
    expect(logs).not.toContain(NOBODY);
    expect(logs).not.toContain(NOTE);
  });

  it('needs RESET typed exactly in the body: nothing is cleared without it', async () => {
    const db = new FakeFirestore();
    const a = await boot(db);
    await fill(a);
    const before = db.paths();
    for (const body of [{}, { confirm: 'reset' }, { confirm: ' RESET' }, { confirm: true }, { date: WED }]) {
      const res = await reset(a, body);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'confirm' });
    }
    expect(db.paths()).toEqual(before);
    expect((await get(a, '/api/pain/status')).json().paused).toBe(true);
  });
});

describe('AC2 and AC5: the training data goes; roles and the training days stay; the plan is asked for again', () => {
  it.each(['firestore', 'memory'] as const)('%s: empties every training store and keeps the days', async (store) => {
    // What a first start asks the parent for, on an empty household.
    const fresh = await boot(new FakeFirestore(), store);
    const firstAsk = (await pending(fresh)).map((r) => r.title).sort();
    expect(firstAsk.length).toBeGreaterThan(0);

    const db = new FakeFirestore();
    const a = await boot(db, store);
    const mon = await fill(a);
    const days = (await get(a, `/api/training/days?date=${WED}`)).json();
    expect(days.days).toEqual([2, 4, 6]);
    const schedule = store === 'firestore' ? db.docs.get(`${SCHEDULE_COLLECTION}/${SCHEDULE_DOC}`) : undefined;
    expect((await get(a, `/api/progress/summary?date=${WED}`)).json().xp.total).toBeGreaterThan(0);

    const res = await reset(a);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, generation: 1 });
    gen = 1;

    // Approvals and requests: only the plan asked again, as on first start.
    expect((await pending(a)).map((r) => r.title).sort()).toEqual(firstAsk);
    expect((await get(a, '/api/training/approved')).json()).toMatchObject({ items: [] });
    expect((await get(a, `/api/training/today?date=${MON}`, KAI)).json().today).toBeNull();
    // Day results, streaks and XP.
    const summary = (await get(a, `/api/progress/summary?date=${WED}`)).json();
    expect(summary.xp.total).toBe(0);
    expect(summary.team.current).toBe(0);
    expect(summary.runs).toEqual([]);
    // Session history.
    expect((await get(a, '/api/history/sessions')).json().sessions).toEqual([]);
    // Pain reports and the pause, the typed note and the mistake note with them.
    expect((await get(a, '/api/pain/status')).json()).toEqual({ paused: false, since: null, reports: [] });
    expect((await get(a, '/api/pain/status', KAI)).json()).toEqual({ paused: false, since: null, reports: [] });
    // The audit history: the reset is its first event, by role, with the date; then the asks.
    const events = (await get(a, '/api/audit')).json().events as Record<string, unknown>[];
    expect(events[0]).toMatchObject({ action: 'reset', actorRole: 'parent', kind: 'household', title: "the household's data" });
    expect(Date.parse(events[0].at as string)).not.toBeNaN();
    expect(events.slice(1).every((e) => e.action === 'requested')).toBe(true);
    expect(JSON.stringify(events)).not.toContain(SAM);
    // Roles stay.
    expect((await get(a, '/api/me', KAI)).json()).toEqual({ role: 'keeper' });
    expect((await get(a, '/api/me', SAM)).json()).toEqual({ role: 'parent' });
    // The training days stay.
    expect((await get(a, `/api/training/days?date=${WED}`)).json()).toEqual(days);

    if (store === 'firestore') {
      expect(db.docs.get(`${SCHEDULE_COLLECTION}/${SCHEDULE_DOC}`)).toEqual(schedule);
      for (const gone of [PAIN_COLLECTION, STARTED_COLLECTION, HISTORY_COLLECTION, PROGRESS_COLLECTION]) {
        expect(db.paths().filter((p) => p.startsWith(`${gone}/`)), gone).toEqual([]);
      }
      expect(JSON.stringify([...db.docs.values()])).not.toContain(NOTE);
      expect(db.docs.get(`${GENERATION_COLLECTION}/${GENERATION_DOC}`)).toEqual({ value: 1 });
    } else {
      expect(db.paths()).toEqual([]);
    }

    // The started marker: once approved again, the session started before the reset is not
    // started now, so its approval can still be undone. (Tuesday carries the first theme now.)
    const asked = await pending(a);
    await approveAll(a);
    const again = await session(a, '2026-01-06');
    expect(again.itemVersion).toBe(mon.itemVersion);
    const plan = asked.find((r) => r.kind === 'plan' && r.title === `Session: ${again.title}`)!;
    expect((await post(a, `/api/approvals/${plan.id}/undo`, {}, SAM)).statusCode).toBe(200);
  });

  it('firestore: right after the reset, only the new history, the asks, the days and the generation are stored', async () => {
    const db = new FakeFirestore();
    const a = await boot(db);
    await fill(a);
    const oldRequests = db.paths().filter((p) => p.startsWith(`${APPROVALS_COLLECTION}/`));
    expect((await reset(a)).statusCode).toBe(200);
    const collections = new Set(db.paths().map((p) => p.split('/')[0]));
    expect([...collections].sort()).toEqual(
      [APPROVALS_COLLECTION, AUDIT_COLLECTION, COUNTERS_COLLECTION, GENERATION_COLLECTION, SCHEDULE_COLLECTION].sort(),
    );
    expect(db.paths().filter((p) => oldRequests.includes(p))).toEqual([]);
    expect(db.paths().some((p) => p.startsWith(`${PROGRESS_COLLECTION}/`))).toBe(false);
    expect(logLines.join('\n')).not.toContain(NOTE);
  });

  it('memory: deleting the whole household still deletes the training days too', async () => {
    const a = await boot(new FakeFirestore(), 'memory');
    await fill(a);
    await a.household.deleteAll();
    const summary = (await get(a, `/api/progress/summary?date=${WED}`)).json();
    expect(summary.xp.total).toBe(0);
    expect((await get(a, '/api/audit')).json().events).toEqual([]);
  });
});

describe('AC4: the reset generation', () => {
  it('rides on every API response, goes up by one on a reset, and outlives a restart', async () => {
    const db = new FakeFirestore();
    let a = await boot(db);
    expect((await get(a, '/api/me')).headers[GENERATION_HEADER]).toBe('0');
    // Even an unauthenticated answer names it.
    expect((await a.inject({ method: 'GET', url: '/api/me' })).headers[GENERATION_HEADER]).toBe('0');
    expect((await reset(a)).headers[GENERATION_HEADER]).toBe('1');
    gen = 1;
    expect((await get(a, '/api/pain/status', KAI)).headers[GENERATION_HEADER]).toBe('1');
    expect((await reset(a)).json()).toEqual({ ok: true, generation: 2 });
    gen = 2;

    await a.close();
    apps.splice(apps.indexOf(a), 1);
    a = await boot(db);
    expect((await get(a, '/api/me')).headers[GENERATION_HEADER]).toBe('2');
  });

  it('refuses a write from an older generation (or none) after a reset, and takes the new one', async () => {
    const db = new FakeFirestore();
    const a = await boot(db);
    await approveAll(a);
    const mon = await session(a, MON);
    expect((await reset(a)).statusCode).toBe(200);

    // Events queued on a device before it saw the reset: generation 0, or no header at all.
    const old = [
      { url: '/api/training/started', payload: { itemId: mon.itemId, itemVersion: mon.itemVersion } },
      { url: '/api/progress/sessions', payload: { id: 'fin-stale-0001', date: MON, itemId: mon.itemId, itemVersion: mon.itemVersion, outcome: 'done', warmUpLogged: true, praised: [] } },
      { url: '/api/history/sessions', payload: { id: 'rec-stale-0001', date: MON, itemId: mon.itemId, itemVersion: mon.itemVersion, outcome: 'done', cards: [] } },
      { url: '/api/pain', payload: { id: 'pain-stale-0001', bodyArea: 'knee', note: NOTE, date: MON } },
      { url: '/api/pain/mistake', payload: { id: 'mist-stale-0001', reportId: 'pain-stale-0001' } },
    ];
    for (const e of old) {
      for (const headers of [as(KAI, 0), as(KAI)]) {
        const res = await a.inject({ method: 'POST', url: e.url, headers, payload: e.payload });
        expect(res.statusCode, e.url).toBe(409);
        expect(res.json()).toEqual({ error: 'stale_generation' });
        expect(res.headers[GENERATION_HEADER]).toBe('1');
      }
    }
    // A parent's write from before is refused too, the reset itself included.
    expect((await a.inject({ method: 'POST', url: '/api/household/reset', headers: as(SAM, 0), payload: { confirm: 'RESET' } })).statusCode).toBe(409);
    expect((await a.inject({ method: 'GET', url: '/api/pain/status', headers: as(SAM, 0) })).statusCode).toBe(200);
    expect((await a.inject({ method: 'POST', url: '/api/pain', headers: as(KAI, 7), payload: old[3].payload })).statusCode).toBe(409);
    expect((await a.inject({ method: 'POST', url: '/api/pain', headers: as(KAI, 'x' as never), payload: old[3].payload })).statusCode).toBe(409);

    // Nothing from before landed.
    gen = 1;
    expect((await get(a, '/api/pain/status')).json().paused).toBe(false);
    expect((await get(a, '/api/history/sessions')).json().sessions).toEqual([]);
    expect(db.paths().some((p) => p.startsWith(`${PROGRESS_COLLECTION}/`))).toBe(false);
    expect(logLines.filter((l) => l.includes('stale-generation')).length).toBeGreaterThan(0);
    expect(logLines.join('\n')).not.toContain(NOTE);

    // The same report sent with the new generation lands.
    expect((await post(a, '/api/pain', { id: 'pain-fresh-0001', bodyArea: 'knee', date: WED })).statusCode).toBe(200);
    expect((await get(a, '/api/pain/status')).json().paused).toBe(true);
  });

  it('the stores: a bump is kept, in memory and in Firestore', async () => {
    const memory = new MemoryGenerationStore();
    expect(await memory.read()).toBe(0);
    expect(await memory.bump()).toBe(1);
    expect(await memory.read()).toBe(1);

    const db = new FakeFirestore();
    expect(await new FirestoreGenerationStore(db).read()).toBe(0);
    const bumps = await Promise.all([new FirestoreGenerationStore(db).bump(), new FirestoreGenerationStore(db).bump()]);
    expect(bumps.sort()).toEqual([1, 2]);
    expect(await new FirestoreGenerationStore(db).read()).toBe(2);
  });

  it('reads the header: none is 0, a bad one is refused', () => {
    expect(requestGeneration(undefined)).toBe(0);
    expect(requestGeneration('3')).toBe(3);
    expect(requestGeneration(['4', '5'])).toBe(4);
    expect(requestGeneration('-1')).toBeNull();
    expect(requestGeneration('one')).toBeNull();
  });
});
