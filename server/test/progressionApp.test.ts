import { expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { FirestoreApprovalStore } from '../src/approvals.js';
import { FirestoreHistoryStore, type HistoryRecord } from '../src/history.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { FakeFirestore } from './fakeFirestore.js';

it('uses normal authenticated Firestore routes for a synthetic parent review and reset', async () => {
  const db = new FakeFirestore(), signer = new TestSigner(), audience = '/test/real-review';
  const now = new Date(), date = now.toISOString().slice(0, 10);
  const store = new FirestoreApprovalStore(db);
  await store.create({ id: 'synthetic-top-approved', kind: 'exercise', itemId: 'card-squat-to-box', itemVersion: 'synthetic-top-v1', content: { title: 'Example', detail: 'Example' }, state: 'approved', createdAt: now, decidedAt: now, decidedBy: 'parent@example.com', reason: null });
  const history = new FirestoreHistoryStore(db), ids: string[] = [];
  for (const n of [1, 2]) {
    const id = `normal-record-${n}`, instanceId = `normal-instance-${n}`;
    const row: HistoryRecord = { id, instanceId, date, itemId: 'session', itemVersion: 'session-v1', title: 'Example', outcome: 'done', at: now, cards: [{ cardId: 'squat-to-box', itemVersion: 'synthetic-top-v1', name: 'Squat', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps: 15, perSide: false }, cueIds: [] }] };
    expect(await history.startInstance({ id: instanceId, itemId: row.itemId, itemVersion: row.itemVersion, recordId: null, cards: [{ cardId: 'squat-to-box', itemVersion: 'synthetic-top-v1' }] })).toBe(true);
    expect(await history.addBound(row, instanceId)).toBe(true);
    ids.push(id);
  }
  const boot = () => buildApp({ config: { audience, devMockIdentity: false, devMockAccount: '', roleSeed: 'parent@example.com=parent;keeper@example.com=keeper', roleStore: 'memory', scheduleStore: 'firestore', port: 0, webRoot: '', production: false }, verifier: new ProxyJwtVerifier(audience, signer.keys), firestore: db });
  let app = await boot();
  const headers = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience }) });
  const get = (url: string, account = 'parent@example.com') => app.inject({ method: 'GET', url, headers: headers(account) });
  const post = (url: string, payload: object = {}, account = 'parent@example.com') => app.inject({ method: 'POST', url, headers: headers(account), payload });
  try {
    expect((await get('/api/history/squat-evidence', 'keeper@example.com')).json().status).toBe('unknown');
    expect((await get('/api/history/squat-review-window', 'keeper@example.com')).statusCode).toBe(403);
    for (const id of ids) for (const set of [0, 1]) {
      const answer = await app.inject({ method: 'PUT', url: '/api/history/squat-set', headers: headers('parent@example.com'), payload: { id, version: 'synthetic-top-v1', set, actualReps: 15, clean: true, previous: null } });
      expect(answer.statusCode).toBe(200);
    }
    expect((await get('/api/history/squat-review-window')).json().sessions.map((s: { id: string }) => s.id)).toEqual(ids);
    const attestation = { orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true };
    expect((await post('/api/history/squat-attestation', attestation, 'keeper@example.com')).statusCode).toBe(403);
    expect((await post('/api/history/squat-attestation', attestation)).json().status).toBe('ready-for-parent');
    expect((await get('/api/history/squat-evidence', 'keeper@example.com')).json().status).toBe('ready-for-parent');
    const offer = await post('/api/progression/review-offer');
    expect(offer.statusCode, offer.body).toBe(200);
    expect(JSON.stringify((await get('/api/training/collection', 'keeper@example.com')).json())).not.toContain('squat-to-box-pause');
    expect((await post(`/api/progression/review-offer/${offer.json().id}/approve`)).statusCode).toBe(200);
    expect(await store.approvedVersion('card-squat-to-box-pause', 'sha256:836073df2f6a8c3c94e99bf990df658d')).not.toBeNull();
    expect(JSON.stringify((await get('/api/training/collection', 'keeper@example.com')).json())).toContain('squat-to-box-pause');
    await app.close();
    app = await boot();
    expect(JSON.stringify((await get('/api/training/collection', 'keeper@example.com')).json())).toContain('squat-to-box-pause');
    expect((await post('/api/pain', { id: 'synthetic-pain-01', bodyArea: 'knee', date }, 'keeper@example.com')).statusCode).toBe(200);
    expect((await get('/api/history/squat-evidence', 'keeper@example.com')).json().status).toBe('held');
    expect(JSON.stringify((await get('/api/training/collection', 'keeper@example.com')).json())).not.toContain('squat-to-box-pause');
    expect((await post('/api/household/reset', { confirm: 'RESET', date })).statusCode).toBe(200);
    expect(db.paths().some((path) => path.startsWith('progressionReviewOffers/') || path.startsWith('progressionReviewDecisions/') || path.startsWith('squatReadiness/'))).toBe(false);
  } finally { await app.close(); }
});
