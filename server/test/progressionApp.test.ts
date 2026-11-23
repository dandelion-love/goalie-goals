import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { buildApp } from '../src/app.js';
import { FirestoreApprovalStore } from '../src/approvals.js';
import { FirestoreHistoryStore, type HistoryRecord } from '../src/history.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { FakeFirestore } from './fakeFirestore.js';
import { cardSnapshot } from '../src/training.js';
import { loadContent, defaultContentRoot } from '../src/content.js';
import { ownerApprovedSquatVersions } from '../src/ownerProgression.js';
import { hasCompletedSquatSeries } from '../src/squatSeries.js';

it('uses normal authenticated Firestore routes for a synthetic parent review and reset', async () => {
  const db = new FakeFirestore(), signer = new TestSigner(), audience = '/test/real-review';
  const now = new Date(), date = now.toISOString().slice(0, 10);
  const monday = new Date(`${date}T00:00:00Z`); monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) - 14 - (monday.getUTCDay() === 1 ? 7 : 0));
  const dates = [0, 2, 4, 7, 9, 11, 14, 16].map((offset) => new Date(monday.getTime() + offset * 86400000).toISOString().slice(0, 10));
  const store = new FirestoreApprovalStore(db);
  const archive = ownerApprovedSquatVersions(defaultContentRoot());
  const versions = [cardSnapshot(loadContent().cards.get('squat-to-box')!).itemVersion, ...[12, 14, 15].map((reps) => archive.find((entry) => entry.rung === 'squat-to-box' && entry.dose === `2 x ${reps}`)!.itemVersion)];
  for (let n = 0; n < versions.length; n++) await store.create({ id: `synthetic-dose-approved-${n}`, kind: 'exercise', itemId: 'card-squat-to-box', itemVersion: versions[n], content: { title: 'Example', detail: 'Example' }, state: 'approved', createdAt: now, decidedAt: now, decidedBy: 'parent@example.com', reason: null });
  for (let n = 0; n < 3; n++) {
    const from = versions[n], to = versions[n + 1], afterSequence = (n + 1) * 2;
    const key = createHash('sha256').update(`${from}\0${to}`).digest('hex');
    await db.collection('squatDoseTransitions').doc(key).create({ from, to, afterSequence, decisionSequence: afterSequence, approvalId: `synthetic-dose-approved-${n + 1}` });
    await db.collection('squatDoseOffers').doc(`synthetic-dose-approved-${n + 1}`).create({ from, to, afterSequence, expiresAt: now.getTime() + 86400000, proof: { target: { version: from, reps: [10, 12, 14][n] } } });
  }
  const history = new FirestoreHistoryStore(db), ids: string[] = [];
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const id = `normal-record-${n}`, instanceId = `normal-instance-${n}`;
    const step = Math.floor((n - 1) / 2), reps = [10, 12, 14, 15][step], version = versions[step];
    const row: HistoryRecord = { id, instanceId, date: dates[n - 1], itemId: 'session', itemVersion: 'session-v1', title: 'Example', outcome: 'done', at: now, cards: [{ cardId: 'squat-to-box', itemVersion: version, name: 'Squat', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps, perSide: false }, cueIds: [] }] };
    expect(await history.startInstance({ id: instanceId, itemId: row.itemId, itemVersion: row.itemVersion, recordId: null, plannedDate: row.date, startedAt: `${row.date}T12:00:00Z`, cards: [{ cardId: 'squat-to-box', itemVersion: version }] })).toBe(true);
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
    for (let n = 0; n < ids.length; n++) for (const set of [0, 1]) {
      const step = Math.floor(n / 2);
      const answer = await app.inject({ method: 'PUT', url: '/api/history/squat-set', headers: headers('parent@example.com'), payload: { id: ids[n], version: versions[step], set, actualReps: [10, 12, 14, 15][step], clean: true, previous: null } });
      expect(answer.statusCode).toBe(200);
    }
    const steps = versions.map((version, index) => ({ version, reps: [10, 12, 14, 15][index] }));
    expect(await hasCompletedSquatSeries(history, steps, async () => true, async () => true)).toBe(true);
    expect(await hasCompletedSquatSeries(history, steps, async (version) => version !== versions[1], async () => true)).toBe(false);
    expect((await get('/api/history/squat-review-window')).json().sessions.map((s: { id: string }) => s.id)).toEqual(ids.slice(-2));
    const attestation = { orderedRecordIds: ids.slice(-2), allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true };
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
    expect(db.paths().some((path) => path.startsWith('progressionReviewOffers/') || path.startsWith('progressionReviewDecisions/') || path.startsWith('squatReadiness/') || path.startsWith('squatDoseTransitions/') || path.startsWith('squatDoseOffers/'))).toBe(false);
  } finally { await app.close(); }
});
