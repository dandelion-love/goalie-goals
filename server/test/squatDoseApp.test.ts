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
  const day = new Date(); day.setUTCHours(0, 0, 0, 0);
  let offset = (3 - day.getUTCDay() + 7) % 7; if (offset > 1) offset -= 7;
  day.setUTCDate(day.getUTCDate() + offset);
  const date = day.toISOString().slice(0, 10), approvals = new FirestoreApprovalStore(db), root = defaultContentRoot();
  const app = await buildApp({ config: { audience, devMockIdentity: false, devMockAccount: '', roleSeed: 'parent@example.com=parent;keeper@example.com=keeper', roleStore: 'memory', scheduleStore: 'firestore', port: 0, webRoot: '', production: false }, verifier: new ProxyJwtVerifier(audience, signer.keys), firestore: db });
  const headers = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience }) });
  const post = (url: string, payload: object = {}, account = 'parent@example.com') => app.inject({ method: 'POST', url, headers: headers(account), payload });
  const get = (url: string, account = 'parent@example.com') => app.inject({ method: 'GET', url, headers: headers(account) });
  const approvePending = async () => {
    const requests = (await get('/api/approvals/pending')).json().requests as { id: string }[];
    for (const request of requests) expect((await post(`/api/approvals/${request.id}/approve`)).statusCode).toBe(200);
  };
  try {
    await approvePending();
    for (let stage = 0; stage < 4; stage++) {
      const current = (await resolveSquatDoseStage(db, approvals, root))!;
      expect(current.index).toBe(stage);
      const version = current.snapshots[stage].itemVersion, reps = [10, 12, 14, 15][stage], ids: string[] = [];
      const today = (await get(`/api/training/today?date=${date}`, 'keeper@example.com')).json();
      const session = today.today ?? today.lastApproved;
      expect(session).not.toBeNull();
      expect(session.cards.find((card: { id: string }) => card.id === 'squat-to-box').itemVersion).toBe(version);
      for (const n of [1, 2]) {
        const id = `app-dose-record-${stage}-${n}`, instanceId = `app-dose-instance-${stage}-${n}`;
        expect((await post('/api/training/started', { itemId: session.itemId, itemVersion: session.itemVersion, instanceId, date }, 'keeper@example.com')).statusCode).toBe(200);
        const cards = session.cards.map((card: { id: string; itemVersion: string; dose: { sets: number } }) => ({ cardId: card.id, itemVersion: card.itemVersion, setsDone: card.dose.sets, cues: [] }));
        expect((await post('/api/history/sessions', { id, instanceId, date, itemId: session.itemId, itemVersion: session.itemVersion, outcome: 'done', cards }, 'keeper@example.com')).statusCode).toBe(200);
        for (const set of [0, 1]) expect((await app.inject({ method: 'PUT', url: '/api/history/squat-set', headers: headers('parent@example.com'), payload: { id, version, set, actualReps: reps, clean: true, previous: null } })).statusCode).toBe(200);
        ids.push(id);
        if (n === 1) {
          const windowIds = (await get('/api/history/squat-review-window')).json().sessions.map((row: { id: string }) => row.id);
          const one = await post('/api/history/squat-attestation', { orderedRecordIds: windowIds, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true });
          expect(one.json().status).toBe('one-qualifying');
          expect((await post('/api/progression/review-offer')).statusCode).toBe(409);
        }
      }
      expect((await get('/api/history/squat-review-window')).json().sessions.map((row: { id: string }) => row.id)).toEqual(ids);
      const evidence = await post('/api/history/squat-attestation', { orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true });
      expect(evidence.json().status).toBe('ready-for-parent');
      const offer = await post('/api/progression/review-offer');
      expect(offer.statusCode, offer.body).toBe(200);
      expect(offer.json().dose).toBe(stage === 3 ? '2 x 10' : `2 x ${[12, 14, 15][stage]}`);
      expect((await post(`/api/progression/review-offer/${offer.json().id}/approve`, {}, 'keeper@example.com')).statusCode).toBe(403);
      expect((await post(`/api/progression/review-offer/${offer.json().id}/approve`)).statusCode).toBe(200);
      if (stage < 3) {
        const pending = (await get('/api/approvals/pending')).json().requests as { kind: string; detail: string }[];
        expect(pending.some((request) => request.kind === 'plan' && request.detail.includes(`${[12, 14, 15][stage]} reps`))).toBe(true);
        const waiting = (await get(`/api/training/today?date=${date}`, 'keeper@example.com')).json();
        expect(waiting.today?.cards.find((card: { id: string }) => card.id === 'squat-to-box')?.itemVersion).not.toBe(current.snapshots[stage + 1].itemVersion);
        await approvePending();
      }
    }
    expect(await approvals.approvedVersion('card-squat-to-box-pause', 'sha256:836073df2f6a8c3c94e99bf990df658d')).not.toBeNull();
  } finally { await app.close(); }
}, 30000);
