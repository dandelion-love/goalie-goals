import { expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { FirestoreApprovalStore } from '../src/approvals.js';
import { resolveSquatDoseStage } from '../src/squatDoseStage.js';
import { defaultContentRoot } from '../src/content.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { FakeFirestore } from './fakeFirestore.js';

it('uses normal routes and separately approved sessions through each invented dose', async () => {
  const db = new FakeFirestore(), signer = new TestSigner(), audience = '/test/dose-routes';
  let testDay = new Date('2026-01-07T12:00:00Z');
  const approvals = new FirestoreApprovalStore(db), root = defaultContentRoot();
  const boot = () => buildApp({ config: { audience, devMockIdentity: false, devMockAccount: '', roleSeed: 'parent@example.com=parent;keeper@example.com=keeper', roleStore: 'memory', scheduleStore: 'firestore', port: 0, webRoot: '', production: false }, verifier: new ProxyJwtVerifier(audience, signer.keys), firestore: db, progressionClock: () => new Date(testDay) });
  let app = await boot();
  const headers = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience }) });
  const post = (url: string, payload: object = {}, account = 'parent@example.com') => app.inject({ method: 'POST', url, headers: headers(account), payload });
  const get = (url: string, account = 'parent@example.com') => app.inject({ method: 'GET', url, headers: headers(account) });
  const approvePending = async () => {
    const requests = (await get('/api/approvals/pending')).json().requests as { id: string }[];
    for (const request of requests) expect((await post(`/api/approvals/${request.id}/approve`)).statusCode).toBe(200);
  };
  let sequence = 0;
  const complete = async (when: Date) => {
    testDay = new Date(when);
    const date = testDay.toISOString().slice(0, 10), id = `app-dose-record-${++sequence}`, instanceId = `app-dose-instance-${sequence}`;
    const today = (await get(`/api/training/today?date=${date}`, 'keeper@example.com')).json();
    const session = today.today ?? today.lastApproved;
    expect(session).not.toBeNull();
    expect((await post('/api/training/started', { itemId: session.itemId, itemVersion: session.itemVersion, instanceId, date }, 'keeper@example.com')).statusCode).toBe(200);
    const cards = session.cards.map((card: { id: string; itemVersion: string; dose: { sets: number } }) => ({ cardId: card.id, itemVersion: card.itemVersion, setsDone: card.dose.sets, cues: [] }));
    const completed = { id, instanceId, date, itemId: session.itemId, itemVersion: session.itemVersion, outcome: 'done', cards };
    expect((await post('/api/history/sessions', completed, 'keeper@example.com')).statusCode).toBe(200);
    if (sequence === 1) {
      expect((await post('/api/training/started', { itemId: session.itemId, itemVersion: session.itemVersion, instanceId, date }, 'keeper@example.com')).statusCode).toBe(200);
      expect((await post('/api/history/sessions', completed, 'keeper@example.com')).statusCode).toBe(200);
    }
    return { id, session, date };
  };
  try {
    await approvePending();
    expect((await app.inject({ method: 'PUT', url: '/api/equipment', headers: headers('parent@example.com'), payload: { gloves: 'available' } })).statusCode).toBe(200);
    let previousWednesday: Date | null = null;
    for (let stage = 0; stage < 4; stage++) {
      const current = (await resolveSquatDoseStage(db, approvals, root))!;
      expect(current.index).toBe(stage);
      const version = current.snapshots[stage].itemVersion, reps = [10, 12, 14, 15][stage], ids: string[] = [];
      for (const n of [1, 2]) {
        if (previousWednesday) {
          await complete(new Date(previousWednesday.getTime() + 2 * 86400000));
          await complete(new Date(previousWednesday.getTime() + 5 * 86400000));
          testDay = new Date(previousWednesday.getTime() + 7 * 86400000);
        }
        const { id, session } = await complete(testDay);
        previousWednesday = new Date(testDay);
        expect(session.cards.find((card: { id: string }) => card.id === 'squat-to-box').itemVersion).toBe(version);
        for (const set of [0, 1]) expect((await app.inject({ method: 'PUT', url: '/api/history/squat-set', headers: headers('parent@example.com'), payload: { id, version, set, actualReps: reps, clean: true, previous: null } })).statusCode).toBe(200);
        ids.push(id);
        if (n === 1) {
          const windowIds = (await get('/api/history/squat-review-window')).json().sessions.map((row: { id: string }) => row.id);
          const one = await post('/api/history/squat-attestation', { orderedRecordIds: windowIds, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true });
          expect(one.json().status).toBe('one-qualifying');
          expect((await post('/api/progression/review-offer')).statusCode).toBe(409);
        }
      }
      const ordered = (await get('/api/history/squat-review-window')).json().sessions.map((row: { id: string }) => row.id);
      expect(ordered.filter((id: string) => ids.includes(id))).toEqual(ids);
      const evidence = await post('/api/history/squat-attestation', { orderedRecordIds: ordered, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true });
      expect(evidence.json().status).toBe('ready-for-parent');
      const offer = await post('/api/progression/review-offer');
      expect(offer.statusCode, offer.body).toBe(200);
      expect(offer.json().dose).toBe(stage === 3 ? '2 x 10' : `2 x ${[12, 14, 15][stage]}`);
      expect((await post(`/api/progression/review-offer/${offer.json().id}/approve`, {}, 'keeper@example.com')).statusCode).toBe(403);
      expect((await post(`/api/progression/review-offer/${offer.json().id}/approve`)).statusCode).toBe(200);
      if (stage < 3) {
        const pending = (await get('/api/approvals/pending')).json().requests as { kind: string; detail: string }[];
        expect(pending.some((request) => request.kind === 'plan' && request.detail.includes(`${[12, 14, 15][stage]} reps`))).toBe(true);
        const waiting = (await get(`/api/training/today?date=${testDay.toISOString().slice(0, 10)}`, 'keeper@example.com')).json();
        expect(waiting.today?.cards.find((card: { id: string }) => card.id === 'squat-to-box')?.itemVersion).not.toBe(current.snapshots[stage + 1].itemVersion);
        await approvePending();
        await app.close(); app = await boot();
      }
    }
    expect(await approvals.approvedVersion('card-squat-to-box-pause', 'sha256:836073df2f6a8c3c94e99bf990df658d')).not.toBeNull();
  } finally { await app.close(); }
}, 30000);
