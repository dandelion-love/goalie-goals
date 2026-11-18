import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { ConfigError, loadConfig, type Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent } from '../src/content.js';
import { TrainingService } from '../src/training.js';
import {
  FirestoreScheduleStore,
  MemoryScheduleStore,
  SAVE_FAILED,
  SCHEDULE_COLLECTION,
  SCHEDULE_DOC,
  ScheduleError,
  ScheduleService,
  type ScheduleDb,
  type ScheduleDocRef,
  type ScheduleSnapshot,
  type ScheduleStore,
} from '../src/schedule.js';
import { WeeklyPlan, type ScheduleChange } from '../src/weeklyPlan.js';

// Fixtures: the invented cast and invented days. No real Firestore: a fake client in memory.
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const PARENT = { account: SAM, role: 'parent' as const };
const CONTENT = loadContent();
// 2026-01-05 is a Monday.
const MON = '2026-01-05';
const TUE = '2026-01-06';
const THU = '2026-01-08';

/** A fake of the Firestore client slice: documents by path, transactions applied at once. */
class FakeFirestore implements ScheduleDb {
  readonly docs = new Map<string, Record<string, unknown>>();
  failWrites = false;
  failReads = false;

  collection(path: string) {
    return {
      doc: (id: string): ScheduleDocRef & { path: string } => {
        const key = `${path}/${id}`;
        return { path: key, get: async () => this.read(key) };
      },
    };
  }

  private async read(key: string): Promise<ScheduleSnapshot> {
    if (this.failReads) throw new Error(`read failed: projects/some-project/databases/x/documents/${key}`);
    const data = this.docs.get(key);
    // A copy, as a real snapshot would be.
    const copy = data ? (JSON.parse(JSON.stringify(data)) as Record<string, unknown>) : undefined;
    return { exists: copy !== undefined, get: (f: string) => copy?.[f] };
  }

  async runTransaction<T>(
    update: (tx: { get(ref: ScheduleDocRef): Promise<ScheduleSnapshot>; set(ref: ScheduleDocRef, data: { changes: ScheduleChange[] }): unknown }) => Promise<T>,
  ): Promise<T> {
    const writes: [string, Record<string, unknown>][] = [];
    const result = await update({
      get: (ref) => ref.get(),
      set: (ref, data) => {
        writes.push([(ref as ScheduleDocRef & { path: string }).path, JSON.parse(JSON.stringify(data))]);
      },
    });
    if (this.failWrites) throw new Error('write failed: projects/some-project/databases/x (deadline exceeded)');
    for (const [k, v] of writes) this.docs.set(k, v);
    return result;
  }
}

/** A store whose writes fail, as a store outage would. */
class FailingStore implements ScheduleStore {
  readonly inner = new MemoryScheduleStore();
  async list() {
    return this.inner.list();
  }
  async append(): Promise<void> {
    throw new Error('store down: projects/some-project/databases/x');
  }
}

const stores: [string, () => ScheduleStore][] = [
  ['memory', () => new MemoryScheduleStore()],
  ['firestore', () => new FirestoreScheduleStore(new FakeFirestore())],
];

describe.each(stores)('AC1: the ScheduleStore contract (%s)', (_name, make) => {
  it('starts empty', async () => {
    expect(await make().list()).toEqual([]);
  });

  it('keeps changes in the order they were made, including an earlier date made later', async () => {
    const store = make();
    await store.append({ from: TUE, days: [2, 4, 6] });
    await store.append({ from: MON, days: [0, 3, 5] });
    await store.append({ from: MON, days: [0, 3, 5] });
    expect(await store.list()).toEqual([
      { from: TUE, days: [2, 4, 6] },
      { from: MON, days: [0, 3, 5] },
      { from: MON, days: [0, 3, 5] },
    ]);
  });

  it('returns copies: changing a listed or appended value does not change the store', async () => {
    const store = make();
    const change: ScheduleChange = { from: MON, days: [1, 3, 5] };
    await store.append(change);
    change.days.push(0);
    (await store.list())[0].days.push(6);
    expect(await store.list()).toEqual([{ from: MON, days: [1, 3, 5] }]);
  });
});

describe('AC1: the training days survive a restart on Firestore', () => {
  it('a new service on the same database loads the days the parent set', async () => {
    const db = new FakeFirestore();
    const first = new ScheduleService({ store: new FirestoreScheduleStore(db), plan: new WeeklyPlan(), audit: new MemoryAuditLog(), content: () => CONTENT });
    await first.set(PARENT, [2, 4, 6], TUE);

    // The restart: a new plan and service, nothing shared but the database.
    const restarted = new ScheduleService({ store: new FirestoreScheduleStore(db), plan: new WeeklyPlan(), audit: new MemoryAuditLog(), content: () => CONTENT });
    expect(restarted.days(THU)).toEqual([1, 3, 5]);
    await restarted.load();
    expect(restarted.days(THU)).toEqual([2, 4, 6]);
    expect(restarted.days(MON)).toEqual([1, 3, 5]);
  });

  it('a server built on a Firestore store reads the days at startup', async () => {
    const db = new FakeFirestore();
    await new FirestoreScheduleStore(db).append({ from: MON, days: [2, 4, 6] });
    const approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
    const training = new TrainingService({ approvals, content: CONTENT, plan: new WeeklyPlan() });
    const app = await buildApp({ config: testConfig(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training, scheduleStore: new FirestoreScheduleStore(db) });
    try {
      const res = await app.inject({ method: 'GET', url: `/api/training/days?date=${TUE}`, headers: as(SAM) });
      expect(res.json().days).toEqual([2, 4, 6]);
    } finally {
      await app.close();
    }
  });
});

describe('AC2: only the weekdays and their date are stored', () => {
  it('the household document holds the changes and nothing else', async () => {
    const db = new FakeFirestore();
    const service = new ScheduleService({ store: new FirestoreScheduleStore(db), plan: new WeeklyPlan(), audit: new MemoryAuditLog(), content: () => CONTENT });
    await service.set(PARENT, [6, 2, 4], TUE);
    expect([...db.docs.keys()]).toEqual([`${SCHEDULE_COLLECTION}/${SCHEDULE_DOC}`]);
    expect(db.docs.get(`${SCHEDULE_COLLECTION}/${SCHEDULE_DOC}`)).toEqual({ changes: [{ from: TUE, days: [2, 4, 6] }] });
  });

  it('skips a malformed stored entry rather than load it', async () => {
    const db = new FakeFirestore();
    db.docs.set(`${SCHEDULE_COLLECTION}/${SCHEDULE_DOC}`, {
      changes: [{ from: 'soon', days: [1, 3, 5] }, { from: MON, days: [1, 2, 4] }, { from: TUE, days: [2, 4, 6], note: 'x' }, 'junk'],
    });
    expect(await new FirestoreScheduleStore(db).list()).toEqual([{ from: TUE, days: [2, 4, 6] }]);
  });
});

describe('AC3: a failed write is refused and the old days stay', () => {
  let audit: MemoryAuditLog;

  beforeEach(() => {
    audit = new MemoryAuditLog();
  });

  it.each([
    ['a failing store', () => new FailingStore() as ScheduleStore],
    [
      'Firestore failing to commit',
      () => {
        const db = new FakeFirestore();
        db.failWrites = true;
        return new FirestoreScheduleStore(db);
      },
    ],
  ])('%s: plain message, audited without the error, plan unchanged', async (_name, make) => {
    const plan = new WeeklyPlan();
    const service = new ScheduleService({ store: make(), plan, audit, content: () => CONTENT });
    await service.load();

    const err = await service.set(PARENT, [2, 4, 6], MON).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ScheduleError);
    expect(err).toMatchObject({ code: 'unavailable', message: SAVE_FAILED });
    expect(SAVE_FAILED).toBe("Couldn't save the training days. Try again.");

    // The old days stay in effect: the plan never ran ahead of the store.
    expect(service.days(MON)).toEqual([1, 3, 5]);
    expect(plan.changeLog()).toEqual([]);

    const events = await audit.list();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: 'refused', actorRole: 'parent', kind: 'schedule', title: 'the training days' });
    const text = `${events[0].title} ${events[0].reason}`;
    expect(text).not.toMatch(/projects|databases|Error|at |store down|deadline/);
  });

  it('keeps the change in the plan when the store took it but cannot be read back', async () => {
    const db = new FakeFirestore();
    const plan = new WeeklyPlan();
    const store = new FirestoreScheduleStore(db);
    // The write commits, then reading the document back fails.
    store.list = async () => {
      throw new Error('read failed');
    };
    const service = new ScheduleService({ store, plan, audit, content: () => CONTENT });
    expect(await service.set(PARENT, [2, 4, 6], MON)).toEqual([2, 4, 6]);
    expect(service.days(MON)).toEqual([2, 4, 6]);
    expect(await new FirestoreScheduleStore(db).list()).toEqual([{ from: MON, days: [2, 4, 6] }]);
    expect((await audit.list())[0]).toMatchObject({ action: 'changed', title: 'the training days (Tue, Thu, Sat)' });
  });

  it('the route answers 503 with the plain message, and the days stay', async () => {
    const approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
    const training = new TrainingService({ approvals, content: CONTENT, plan: new WeeklyPlan() });
    const app = await buildApp({ config: testConfig(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training, scheduleStore: new FailingStore() });
    try {
      const put = await app.inject({ method: 'PUT', url: '/api/training/days', headers: as(SAM), payload: { days: [2, 4, 6], date: MON } });
      expect(put.statusCode).toBe(503);
      expect(put.json()).toEqual({ error: 'unavailable', message: SAVE_FAILED });
      const days = await app.inject({ method: 'GET', url: `/api/training/days?date=${MON}`, headers: as(SAM) });
      expect(days.json().days).toEqual([1, 3, 5]);
      const history = await app.inject({ method: 'GET', url: '/api/audit', headers: as(SAM) });
      expect(history.json().events.at(-1)).toMatchObject({ action: 'refused', kind: 'schedule', title: 'the training days' });
    } finally {
      await app.close();
    }
  });
});

describe('config: where the training days live', () => {
  it('is Firestore in production, memory otherwise, and SCHEDULE_STORE picks it', () => {
    expect(loadConfig({ NODE_ENV: 'production', IAP_AUDIENCE: AUDIENCE }).scheduleStore).toBe('firestore');
    expect(loadConfig({ IAP_AUDIENCE: AUDIENCE }).scheduleStore).toBe('memory');
    expect(loadConfig({ IAP_AUDIENCE: AUDIENCE, SCHEDULE_STORE: 'firestore' }).scheduleStore).toBe('firestore');
  });

  it('refuses memory in production and an unknown store', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', IAP_AUDIENCE: AUDIENCE, SCHEDULE_STORE: 'memory' })).toThrow(ConfigError);
    expect(() => loadConfig({ IAP_AUDIENCE: AUDIENCE, SCHEDULE_STORE: 'sql' })).toThrow(/memory or firestore/);
  });

  it('has no database id in the repo: empty unless FIRESTORE_DATABASE is set', () => {
    expect(loadConfig({ IAP_AUDIENCE: AUDIENCE }).firestoreDatabase).toBe('');
    expect(loadConfig({ IAP_AUDIENCE: AUDIENCE, FIRESTORE_DATABASE: ' some-db ' }).firestoreDatabase).toBe('some-db');
  });
});

const signer = new TestSigner();
const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });

function testConfig(): Config {
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
