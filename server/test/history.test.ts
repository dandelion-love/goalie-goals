import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent } from '../src/content.js';
import { STARTER_SESSION, SingleSessionPlan, TrainingService, type ClientSession } from '../src/training.js';
import {
  FirestoreHistoryStore,
  HISTORY_COLLECTION,
  HistoryService,
  MemoryHistoryStore,
  readRecord,
  type HistoryRecord,
  type HistoryStore,
} from '../src/history.js';
import { FakeFirestore as TransactionFirestore } from './fakeFirestore.js';

// Story 113: each session's sets and form ratings in a shared history. Invented cast only; no
// real Firestore (a fake client in memory).
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const STRANGER = 'nobody@example.com';
const PARENT = { account: SAM, role: 'parent' as const };
const DATE = '2026-01-05';
const CONTENT = loadContent();
const PLANK = CONTENT.cards.get('plank')!.card;
const BRIDGE = CONTENT.cards.get('glute-bridge')!.card;

const signer = new TestSigner();
const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });

let approvals: ApprovalService;
let training: TrainingService;
let app: FastifyInstance | undefined;
let logLines: string[];
let tick: number;

beforeEach(() => {
  approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
  training = new TrainingService({ approvals, content: CONTENT, plan: new SingleSessionPlan(STARTER_SESSION) });
  logLines = [];
  tick = 0;
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

/** The app with today's session approved, and the session as the keeper's device has it. */
async function ready(store: HistoryStore = new MemoryHistoryStore()) {
  await training.proposeFor(DATE);
  for (const r of await approvals.pending()) await approvals.approve(r.id, PARENT);
  const history = new HistoryService({ store, training, clock: () => new Date(Date.UTC(2026, 0, 5, 9, 0, tick++)) });
  app = await buildApp({
    config: config(),
    verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys),
    approvals,
    training,
    history,
    logStream: { write: (line) => void logLines.push(line) },
  });
  const session = (await training.today(DATE)).today!;
  return { a: app, session, store };
}

const started = (a: FastifyInstance, s: ClientSession) =>
  a.inject({ method: 'POST', url: '/api/training/started', headers: as(KAI), payload: { date: DATE, itemId: s.itemId, itemVersion: s.itemVersion } });

/** A record as the keeper's device sends it: plank fully done with two cues rated, bridge one set. */
function body(s: ClientSession, over: Record<string, unknown> = {}) {
  return {
    id: 'rec-00000001',
    date: DATE,
    itemId: s.itemId,
    itemVersion: s.itemVersion,
    outcome: 'done',
    cards: [
      { cardId: 'plank', itemVersion: s.cards[0].itemVersion, setsDone: PLANK.dose.sets, cues: [0, 1] },
      { cardId: 'glute-bridge', itemVersion: s.cards[1].itemVersion, setsDone: 1, cues: [2] },
    ],
    ...over,
  };
}

const send = (a: FastifyInstance, payload: unknown, account = KAI) =>
  a.inject({ method: 'POST', url: '/api/history/sessions', headers: as(account), payload: payload as Record<string, unknown> });

const read = async (a: FastifyInstance, account: string) =>
  (await a.inject({ method: 'GET', url: '/api/history/sessions', headers: as(account) })).json().sessions;

describe('AC1: a finished or stopped session leaves a record', () => {
  it.each([
    ['done', 'done'],
    ['stopped', 'stopped'],
    ['hurt', 'stopped for safety'],
  ] as const)('keeps a %s session (%s) with each card, its sets, dose and cue ids', async (outcome, _ending) => {
    const { a, session, store } = await ready();
    expect((await started(a, session)).statusCode).toBe(200);
    const res = await send(a, body(session, { outcome }));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    const [record] = await store.list();
    expect(record).toMatchObject({
      id: 'rec-00000001',
      date: DATE,
      itemId: session.itemId,
      itemVersion: session.itemVersion,
      title: STARTER_SESSION.title,
      outcome,
    });
    expect(record.cards).toEqual([
      {
        cardId: 'plank',
        itemVersion: session.cards[0].itemVersion,
        name: PLANK.name,
        setsDone: PLANK.dose.sets,
        setsPlanned: PLANK.dose.sets,
        dose: { kind: 'hold', seconds: PLANK.dose.seconds, perSide: PLANK.dose.per_side },
        cueIds: [0, 1],
      },
      {
        cardId: 'glute-bridge',
        itemVersion: session.cards[1].itemVersion,
        name: BRIDGE.name,
        setsDone: 1,
        setsPlanned: BRIDGE.dose.sets,
        dose: { kind: BRIDGE.dose.kind, reps: BRIDGE.dose.reps, perSide: BRIDGE.dose.per_side },
        cueIds: [2],
      },
    ]);
    // Cue ids only: no cue text, and no field beyond the allowlist.
    expect(JSON.stringify(record)).not.toContain(PLANK.cues[0]);
    expect(Object.keys(record).sort()).toEqual(['at', 'cards', 'date', 'id', 'itemId', 'itemVersion', 'outcome', 'title']);
  });

  it('keeps a session stopped during the warm-up: every card at zero sets', async () => {
    const { a, session, store } = await ready();
    await started(a, session);
    const cards = session.cards.map((c) => ({ cardId: c.id, itemVersion: c.itemVersion, setsDone: 0, cues: [] }));
    expect((await send(a, body(session, { outcome: 'stopped', cards }))).statusCode).toBe(200);
    expect((await store.list())[0].cards.map((c) => c.setsDone)).toEqual([0, 0]);
  });
});

describe('AC2: both homes read the recent sessions, newest first, with the cue text', () => {
  it('shows the day, session, ending, sets and good-form cues to the keeper and the parent', async () => {
    const { a, session } = await ready();
    await started(a, session);
    await send(a, body(session, { id: 'rec-older-01', date: '2026-01-04', outcome: 'stopped' }));
    await send(a, body(session, { id: 'rec-newer-01' }));

    for (const who of [KAI, SAM]) {
      const sessions = await read(a, who);
      expect(sessions.map((s: { id: string }) => s.id)).toEqual(['rec-newer-01', 'rec-older-01']);
      expect(sessions[0]).toMatchObject({
        date: DATE,
        title: STARTER_SESSION.title,
        outcome: 'done',
        setsDone: PLANK.dose.sets + 1,
        setsPlanned: PLANK.dose.sets + BRIDGE.dose.sets,
        goodCount: 3,
      });
      expect(sessions[0].cards[0]).toMatchObject({
        name: PLANK.name,
        setsDone: PLANK.dose.sets,
        setsPlanned: PLANK.dose.sets,
        work: `${PLANK.dose.seconds} s hold`,
        goodCount: 2,
        goodCues: [PLANK.cues[0], PLANK.cues[1]],
      });
      expect(sessions[0].cards[1].goodCues).toEqual([BRIDGE.cues[2]]);
    }
  });

  it('a card version this server does not know shows its count without cue text', async () => {
    const store = new MemoryHistoryStore();
    const record: HistoryRecord = {
      id: 'rec-unknown1',
      date: DATE,
      itemId: 'session-starter',
      itemVersion: 'sha256:gone',
      title: 'Strong middle',
      outcome: 'done',
      cards: [{ cardId: 'plank', itemVersion: 'sha256:gone-card', name: 'Front plank', setsDone: 2, setsPlanned: 2, dose: { kind: 'hold', seconds: 20, perSide: false }, cueIds: [1, 1] }],
      at: new Date(),
    };
    await store.add(record);
    const [view] = await new HistoryService({ store, training }).recent();
    expect(view.cards[0]).toMatchObject({ goodCount: 2, goodCues: [] });
  });

  it('refuses the read to an account with no role', async () => {
    const { a } = await ready();
    const res = await a.inject({ method: 'GET', url: '/api/history/sessions', headers: as(STRANGER) });
    expect(res.statusCode).toBe(403);
  });
});

describe('AC6: only the keeper, a started session, once per id, allowlisted fields', () => {
  /** Each refusal leaves the store empty and logs the role and reason, nothing of the record. */
  async function refused(res: Awaited<ReturnType<typeof send>>, status: number, reason: string, role: string, store: HistoryStore, kept = 0) {
    expect(res.statusCode).toBe(status);
    expect(res.json()).toEqual({ error: reason });
    expect(await store.list()).toHaveLength(kept);
    const line = logLines.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.msg === 'session record refused');
    expect(line).toMatchObject({ role, reason });
    const all = logLines.join('\n');
    for (const secret of ['rec-0000000', 'cueIds', '"cues"', 'glute-bridge', DATE, PLANK.cues[0]]) expect(all).not.toContain(secret);
  }

  it('refuses a record from the parent', async () => {
    const { a, session, store } = await ready();
    await started(a, session);
    await refused(await send(a, body(session), SAM), 403, 'not-keeper', 'parent', store);
  });

  it('refuses a record from an account with no role', async () => {
    const { a, session, store } = await ready();
    await started(a, session);
    await refused(await send(a, body(session), STRANGER), 403, 'not-keeper', 'none', store);
  });

  it('refuses a record for a session that was never started', async () => {
    const { a, session, store } = await ready();
    await refused(await send(a, body(session)), 409, 'not-started', 'keeper', store);
  });

  it('refuses a record for an unknown session version', async () => {
    const { a, session, store } = await ready();
    await started(a, session);
    await refused(await send(a, body(session, { itemVersion: 'sha256:made-up' })), 409, 'not-started', 'keeper', store);
  });

  it('keeps a resend with the same id once, and refuses the second', async () => {
    const { a, session, store } = await ready();
    await started(a, session);
    expect((await send(a, body(session))).statusCode).toBe(200);
    await refused(await send(a, body(session)), 409, 'duplicate', 'keeper', store, 1);
  });

  it.each([
    ['a free-text note', { note: 'felt tired' }],
    ['a body measurement', { heartRate: 150 }],
    ['the cue text', { praised: ['Stay board-straight'] }],
  ])('refuses a record with %s at the top level', async (_what, extra) => {
    const { a, session, store } = await ready();
    await started(a, session);
    await refused(await send(a, { ...body(session), ...extra }), 400, 'unknown-field', 'keeper', store);
  });

  it('refuses a card with a field outside the allowlist', async () => {
    const { a, session, store } = await ready();
    await started(a, session);
    const b = body(session);
    (b.cards as Record<string, unknown>[])[0].cueText = ['Stay board-straight'];
    await refused(await send(a, b), 400, 'unknown-field', 'keeper', store);
  });

  it.each([
    ['no id', { id: undefined }],
    ['a short id', { id: 'x' }],
    ['a bad date', { date: 'yesterday' }],
    ['an unknown ending', { outcome: 'skipped' }],
    ['cue text in place of ids', { cards: [{ cardId: 'plank', itemVersion: 'v', setsDone: 1, cues: ['Stay board-straight'] }] }],
    ['a negative set count', { cards: [{ cardId: 'plank', itemVersion: 'v', setsDone: -1, cues: [] }] }],
  ])('refuses %s as invalid', async (_what, over) => {
    const { a, session, store } = await ready();
    await started(a, session);
    await refused(await send(a, body(session, over)), 400, 'invalid', 'keeper', store);
  });

  it.each([
    ['more sets than the card plans', (b: ReturnType<typeof body>) => ((b.cards[1] as { setsDone: number }).setsDone = BRIDGE.dose.sets + 1)],
    ['a cue id past the card cues', (b: ReturnType<typeof body>) => ((b.cards[0] as { cues: number[] }).cues = [PLANK.cues.length])],
    ['more rated sets than sets done', (b: ReturnType<typeof body>) => ((b.cards[1] as { cues: number[] }).cues = [0, 1])],
    ['a card the session does not have', (b: ReturnType<typeof body>) => ((b.cards[1] as { cardId: string }).cardId = 'pogo-hops')],
    ['a card left out', (b: ReturnType<typeof body>) => b.cards.pop()],
  ])('refuses %s', async (_what, change) => {
    const { a, session, store } = await ready();
    await started(a, session);
    const b = body(session);
    change(b);
    await refused(await send(a, b), 400, 'cards-mismatch', 'keeper', store);
  });
});

describe('the store: memory and Firestore behave the same', () => {
  const record = (id: string): HistoryRecord => ({
    id,
    date: DATE,
    itemId: 'session-starter',
    itemVersion: 'sha256:s',
    title: 'Strong middle',
    outcome: 'stopped',
    cards: [{ cardId: 'plank', itemVersion: 'sha256:p', name: 'Front plank', setsDone: 1, setsPlanned: 2, dose: { kind: 'hold', seconds: 20, perSide: false }, cueIds: [0] }],
    at: new Date('2026-01-05T09:00:00Z'),
  });

  it.each([
    ['memory', () => new MemoryHistoryStore()],
    ['firestore', () => new FirestoreHistoryStore(new TransactionFirestore())],
  ] as const)('%s: keeps an id once, reads it back, and deletes every record with the household', async (_name, make) => {
    const store = make();
    expect(await store.add(record('rec-aaaaaaa1'))).toBe(true);
    expect(await store.add(record('rec-aaaaaaa1'))).toBe(false);
    expect(await store.add(record('rec-bbbbbbb2'))).toBe(true);
    const listed = (await store.list()).sort((x, y) => x.id.localeCompare(y.id));
    expect(listed).toEqual([record('rec-aaaaaaa1'), record('rec-bbbbbbb2')]);
    await new HistoryService({ store, training }).deleteHousehold();
    expect(await store.list()).toEqual([]);
  });

  it('firestore: one document per record in its own collection, holding no cue text', async () => {
    const db = new TransactionFirestore();
    await new FirestoreHistoryStore(db).add(record('rec-ccccccc3'));
    expect(db.paths()).toEqual(['progressionEvidence/revision', `${HISTORY_COLLECTION}/rec-ccccccc3`]);
    expect(JSON.stringify([...db.docs.values()])).not.toMatch(/Stay|breath/i);
  });

  it('reads back only well-formed records', () => {
    const { id: _id, ...data } = record('rec-ddddddd4');
    expect(readRecord('rec-ddddddd4', data)).toEqual(record('rec-ddddddd4'));
    expect(readRecord('rec-ddddddd4', { ...data, outcome: 'maybe' })).toBeNull();
    expect(readRecord('rec-ddddddd4', { ...data, cards: [{ ...data.cards[0], cueIds: ['text'] }] })).toBeNull();
    expect(readRecord('x', data)).toBeNull();
  });

  it('a server built on a Firestore store keeps the record there', async () => {
    const db = new TransactionFirestore();
    const { a, session } = await ready(new FirestoreHistoryStore(db));
    await started(a, session);
    expect((await send(a, body(session))).statusCode).toBe(200);
    expect(db.paths()).toContain(`${HISTORY_COLLECTION}/rec-00000001`);
    expect((await read(a, SAM))[0].id).toBe('rec-00000001');
  });
});

describe('the demo reset deletes the household with its history', () => {
  it('clears the records on POST /api/dev/demo/reset', async () => {
    const dev = await buildApp({
      config: { ...config(), audience: '', devMockIdentity: true, roleSeed: '', demoSeed: true },
    });
    app = dev;
    const asDev = (account: string) => ({ cookie: `dev_as=${account}` });
    let today = (await dev.inject({ method: 'GET', url: '/api/training/today', headers: asDev(KAI) })).json();
    for (let offset = 1; !today.today && !today.lastApproved && offset <= 7; offset++) {
      const date = new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
      today = (await dev.inject({ method: 'GET', url: `/api/training/today?date=${date}`, headers: asDev(KAI) })).json();
    }
    const s = (today.today ?? today.lastApproved) as ClientSession | null;
    expect(s).not.toBeNull();
    await dev.inject({ method: 'POST', url: '/api/training/started', headers: asDev(KAI), payload: { itemId: s!.itemId, itemVersion: s!.itemVersion } });
    const cards = s!.cards.map((c) => ({ cardId: c.id, itemVersion: c.itemVersion, setsDone: 0, cues: [] }));
    const res = await dev.inject({
      method: 'POST',
      url: '/api/history/sessions',
      headers: asDev(KAI),
      payload: { id: 'rec-demo-0001', date: today.date, itemId: s!.itemId, itemVersion: s!.itemVersion, outcome: 'stopped', cards },
    });
    expect(res.statusCode).toBe(200);
    expect((await dev.inject({ method: 'GET', url: '/api/history/sessions', headers: asDev(SAM) })).json().sessions).toHaveLength(1);
    expect((await dev.inject({ method: 'POST', url: '/api/dev/demo/reset', headers: asDev(SAM) })).statusCode).toBe(200);
    expect((await dev.inject({ method: 'GET', url: '/api/history/sessions', headers: asDev(SAM) })).json().sessions).toEqual([]);
  });
});

describe('parent-confirmed squat evidence', () => {
  const squat: HistoryRecord = {
    id: 'rec-squat-001', date: '2026-01-05', itemId: 'session-example', itemVersion: 'session-version',
    title: 'Example', outcome: 'done', at: new Date('2026-01-05T12:00:00Z'),
    cards: [{ cardId: 'squat-to-box', itemVersion: 'card-version', name: 'Squat to box',
      setsDone: 1, setsPlanned: 2, dose: { kind: 'reps', reps: 10, perSide: false }, cueIds: [] }],
  };
  const url = '/api/history/squat-set';
  const payload = { id: squat.id, version: 'card-version', set: 0, actualReps: 10, clean: true, previous: null };
  it('authorizes only the parent, limits evidence to a completed set and shares it with both roles', async () => {
    const { a, store } = await ready();
    await store.add(squat);
    const put = (who: string, data: Record<string, unknown>) => a.inject({ method: 'PUT', url, headers: as(who), payload: data });
    expect((await put(KAI, payload)).statusCode).toBe(403);
    expect((await put(STRANGER, payload)).statusCode).toBe(403);
    for (const invalid of [{ ...payload, set: 1 }, { ...payload, actualReps: 15 }, { ...payload, version: 'wrong' }, { ...payload, extra: 'no' }]) {
      expect((await put(SAM, invalid)).statusCode).toBe(400);
    }
    expect((await put(SAM, payload)).statusCode).toBe(200);
    expect((await put(SAM, payload)).statusCode).toBe(200);
    for (const who of [SAM, KAI]) {
      const sessions = await read(a, who);
      expect(sessions[0].cards[0].squatSets).toEqual([{ actualReps: 10, clean: true, revision: 1 }]);
      const status = await a.inject({ method: 'GET', url: '/api/history/squat-evidence', headers: as(who) });
      expect(status.json()).toEqual({ status: 'unknown', detail: 'incomplete' });
    }
    const changed = { ...payload, actualReps: 8, clean: false, previous: { actualReps: 10, clean: true, revision: 1 } };
    expect((await put(SAM, changed)).statusCode).toBe(200);
    expect((await put(SAM, payload)).statusCode).toBe(400);
    expect((await store.list())[0].cards[0].squatSets).toEqual([{ actualReps: 8, clean: false, revision: 2 }]);
    const pause = await a.inject({ method: 'POST', url: '/api/pain', headers: as(KAI), payload: { id: 'pain-synthetic-1', bodyArea: 'knee', date: DATE } });
    expect(pause.statusCode).toBe(200);
    for (const who of [SAM, KAI]) {
      expect((await a.inject({ method: 'GET', url: '/api/history/squat-evidence', headers: as(who) })).json()).toEqual({ status: 'held' });
    }
    await a.inject({ method: 'POST', url: '/api/pain/clear', headers: as(SAM), payload: {} });
    expect((await a.inject({ method: 'GET', url: '/api/history/squat-evidence', headers: as(SAM) })).json()).toEqual({ status: 'unknown', detail: 'incomplete' });
    expect((await a.inject({ method: 'PUT', url, headers: { ...as(SAM), 'x-household-generation': '99' }, payload })).statusCode).toBe(409);
    expect((await a.inject({ method: 'GET', url: '/api/history/squat-evidence', headers: as(STRANGER) })).statusCode).toBe(403);
    expect(logLines.join('')).not.toContain('rec-squat-001');
    await store.deleteAll();
    expect(await store.list()).toEqual([]);
    expect((await put(SAM, payload)).statusCode).toBe(400);
  });
  it('persists confirmations in the history document and removes them with history', async () => {
    const db = new TransactionFirestore();
    const store = new FirestoreHistoryStore(db);
    await store.add(squat);
    expect(await store.confirmSquatSet(squat.id, 'card-version', 0, { actualReps: 8, clean: false }, null)).toBe(true);
    expect((await new FirestoreHistoryStore(db).list())[0].cards[0].squatSets).toEqual([{ actualReps: 8, clean: false, revision: 1 }]);
    await store.deleteAll();
    expect(await store.list()).toEqual([]);
  });
  it('describes recorded evidence without declaring readiness', async () => {
    const store = new MemoryHistoryStore();
    const history = new HistoryService({ store, training });
    expect(await history.squatEvidenceDetail()).toBe('no-record');
    await store.add(squat);
    expect(await history.squatEvidenceDetail()).toBe('incomplete');
    await store.deleteAll();
    const completed = structuredClone(squat);
    completed.cards[0].setsDone = 2;
    await store.add(completed);
    expect(await history.squatEvidenceDetail()).toBe('missing-confirmation');
    await store.deleteAll();
    completed.cards[0].squatSets = [{ actualReps: 10, clean: true, revision: 1 }, null];
    await store.add(completed);
    expect(await history.squatEvidenceDetail()).toBe('missing-confirmation');
    await store.deleteAll();
    completed.cards[0].squatSets = [{ actualReps: 10, clean: true, revision: 1 }, { actualReps: 10, clean: true, revision: 1 }];
    await store.add(completed);
    expect(await history.squatEvidenceDetail()).toBe('below-target');
    await store.deleteAll();
    completed.cards[0].squatSets![1]!.clean = false;
    await store.add(completed);
    expect(await history.squatEvidenceDetail()).toBe('not-clean');
    const other = structuredClone(completed);
    other.id = 'rec-squat-002';
    await store.add(other);
    expect(await history.squatEvidenceDetail()).toBe('ambiguous');
  });
});

describe('session occurrence binding', () => {
  it.each([
    ['memory', () => new MemoryHistoryStore()],
    ['firestore', () => new FirestoreHistoryStore(new TransactionFirestore())],
  ])('%s binds one matching history record and rejects conflicts', async (_name, makeStore) => {
    const { a, session, store } = await ready(makeStore());
    const instanceId = 'instance-0001';
    const startPayload = { date: DATE, itemId: session.itemId, itemVersion: session.itemVersion, instanceId };
    const start = () => a.inject({ method: 'POST', url: '/api/training/started', headers: as(KAI), payload: startPayload });
    expect((await start()).statusCode).toBe(200);
    expect((await start()).statusCode).toBe(200);
    const entry = body(session, { instanceId });
    expect((await send(a, entry)).statusCode).toBe(200);
    expect((await send(a, entry)).statusCode).toBe(200);
    expect((await send(a, { ...entry, id: 'rec-another-01' })).statusCode).toBe(409);
    expect((await send(a, { ...entry, outcome: 'hurt' })).statusCode).toBe(409);
    expect((await send(a, { ...entry, instanceId: 'instance-bogus' })).statusCode).toBe(409);
    const badCards = structuredClone(entry.cards);
    badCards[0].itemVersion = 'other-version';
    expect((await send(a, { ...entry, cards: badCards })).statusCode).toBe(400);
    expect((await store.list())).toHaveLength(1);
    expect((await store.list())[0].instanceId).toBe(instanceId);
    await store.deleteAll();
    expect((await send(a, entry)).statusCode).toBe(409);
    const stale = { ...as(KAI), 'x-household-generation': '99' };
    expect((await a.inject({ method: 'POST', url: '/api/training/started', headers: stale, payload: startPayload })).statusCode).toBe(409);
    expect((await a.inject({ method: 'POST', url: '/api/history/sessions', headers: stale, payload: entry })).statusCode).toBe(409);
  });
  it.each([
    ['memory', () => new MemoryHistoryStore()],
    ['firestore', () => new FirestoreHistoryStore(new TransactionFirestore())],
  ])('%s keeps parent evidence on the bound set and rejects mismatches or stale replay', async (_name, makeStore) => {
    const store = makeStore();
    const id = 'instance-0002';
    const record: HistoryRecord = { id: 'record-000002', date: DATE, itemId: 'session-test', itemVersion: 'session-version', title: 'Example', outcome: 'done', at: new Date(),
      cards: [{ cardId: 'squat-to-box', itemVersion: 'card-version', name: 'Squat to box', setsDone: 1, setsPlanned: 2, dose: { kind: 'reps', reps: 10, perSide: false }, cueIds: [] }] };
    expect(await store.startInstance({ id, itemId: record.itemId, itemVersion: record.itemVersion, cards: [{ cardId: 'squat-to-box', itemVersion: 'card-version' }], recordId: null })).toBe(true);
    expect(await store.startInstance({ id, itemId: 'session-other', itemVersion: record.itemVersion, cards: [{ cardId: 'squat-to-box', itemVersion: 'card-version' }], recordId: null })).toBe(false);
    expect(await store.addBound(record, id)).toBe(true);
    const bound = (await store.list())[0];
    expect(await store.isBound(bound)).toBe(true);
    expect(await store.isBound({ ...bound, instanceId: 'instance-missing' })).toBe(false);
    expect(await store.isBound({ ...bound, itemVersion: 'wrong-session' })).toBe(false);
    expect(await store.confirmSquatSet(record.id, 'wrong-version', 0, { actualReps: 10, clean: true }, null)).toBe(false);
    expect(await store.confirmSquatSet(record.id, 'card-version', 1, { actualReps: 10, clean: true }, null)).toBe(false);
    expect(await store.confirmSquatSet(record.id, 'card-version', 0, { actualReps: 10, clean: true }, null)).toBe(true);
    expect(await store.confirmSquatSet(record.id, 'card-version', 0, { actualReps: 10, clean: true }, null)).toBe(true);
    expect(await store.confirmSquatSet(record.id, 'card-version', 0, { actualReps: 8, clean: false }, { actualReps: 10, clean: true, revision: 1 })).toBe(true);
    expect(await store.confirmSquatSet(record.id, 'card-version', 0, { actualReps: 10, clean: true }, null)).toBe(false);
    expect((await store.list())[0]).toMatchObject({ instanceId: id, cards: [{ squatSets: [{ actualReps: 8, clean: false, revision: 2 }] }] });
  });
});
