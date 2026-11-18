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
  type HistoryDb,
  type HistoryDocRef,
  type HistoryRecord,
  type HistoryStore,
} from '../src/history.js';

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

/** A fake of the Firestore client slice: documents by id, `create` refusing an id that is there. */
class FakeFirestore implements HistoryDb {
  readonly docs = new Map<string, Record<string, unknown>>();
  collection(path: string) {
    const ref = (id: string): HistoryDocRef => ({
      create: async (data) => {
        const key = `${path}/${id}`;
        if (this.docs.has(key)) throw Object.assign(new Error('already exists'), { code: 6 });
        // Stored as Firestore would: a Date comes back as a Timestamp-like value.
        const at = data.at as Date;
        this.docs.set(key, { ...JSON.parse(JSON.stringify(data)), at: { toDate: () => new Date(at) } });
      },
      delete: async () => {
        this.docs.delete(`${path}/${id}`);
      },
    });
    return {
      doc: ref,
      get: async () => ({
        docs: [...this.docs.entries()]
          .filter(([k]) => k.startsWith(`${path}/`))
          .map(([k, v]) => {
            const id = k.slice(path.length + 1);
            return { id, ref: ref(id), data: () => v };
          }),
      }),
    };
  }
}

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
    ['firestore', () => new FirestoreHistoryStore(new FakeFirestore())],
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
    const db = new FakeFirestore();
    await new FirestoreHistoryStore(db).add(record('rec-ccccccc3'));
    expect([...db.docs.keys()]).toEqual([`${HISTORY_COLLECTION}/rec-ccccccc3`]);
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
    const db = new FakeFirestore();
    const { a, session } = await ready(new FirestoreHistoryStore(db));
    await started(a, session);
    expect((await send(a, body(session))).statusCode).toBe(200);
    expect(db.docs.size).toBe(1);
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
    const today = (await dev.inject({ method: 'GET', url: '/api/training/today', headers: asDev(KAI) })).json();
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
