import { expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { FirestoreHistoryStore, type HistoryRecord } from '../src/history.js';
import { FirestoreSquatProofStore, SquatProofService } from '../src/squatProof.js';
import { ProgressionReview, registerProgressionReviewRoutes } from '../src/progressionReview.js';
import { MemoryRoleStore } from '../src/roles.js';
import { FakeFirestore } from './fakeFirestore.js';
import { defaultContentRoot } from '../src/content.js';
import { FirestoreApprovalStore, FirestoreAuditLog } from '../src/approvals.js';

it('offers and records a parent review only for current synthetic evidence', async () => {
  const db = new FakeFirestore(), history = new FirestoreHistoryStore(db), proofs = new FirestoreSquatProofStore(db);
  const readiness = new SquatProofService(history, proofs, async () => ({ revision: 'clear', anyPain: false }), async () => true, () => new Date('2026-01-05T12:00:00Z'));
  const ids: string[] = [];
  for (const n of [1, 2]) {
    const id = `review-record-${n}`, instanceId = `review-instance-${n}`;
    const row: HistoryRecord = { id, instanceId, date: '2026-01-05', itemId: 'session', itemVersion: 'session-v1', title: 'Example', outcome: 'done', at: new Date('2026-01-05T12:00:00Z'), cards: [{ cardId: 'squat-to-box', itemVersion: 'card-v1', name: 'Squat', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps: 15, perSide: false }, cueIds: [] }] };
    expect(await history.startInstance({ id: instanceId, itemId: row.itemId, itemVersion: row.itemVersion, recordId: null, cards: [{ cardId: 'squat-to-box', itemVersion: 'card-v1' }] })).toBe(true);
    expect(await history.addBound(row, instanceId)).toBe(true);
    for (const set of [0, 1]) expect(await history.confirmSquatSet(id, 'card-v1', set, { actualReps: 15, clean: true }, null)).toBe(true);
    ids.push(id);
  }
  expect(await readiness.attest({ orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true })).toBe(true);
  const signer = new TestSigner(), audience = '/test/review';
  const app = await buildApp({ config: { audience, devMockIdentity: false, devMockAccount: '', roleSeed: 'parent@example.com=parent;keeper@example.com=keeper', roleStore: 'memory', port: 0, webRoot: '', production: false }, verifier: new ProxyJwtVerifier(audience, signer.keys) });
  const review = ProgressionReview.fromOwnerArchive(db, readiness, proofs, defaultContentRoot(), 'sha256:836073df2f6a8c3c94e99bf990df658d');
  expect(() => ProgressionReview.fromOwnerArchive(db, readiness, proofs, defaultContentRoot(), 'unknown')).toThrow('no owner decision');
  expect(() => ProgressionReview.fromOwnerArchive(db, readiness, proofs, defaultContentRoot(), 'sha256:ebe9725306de0c55f06f059ca1952118')).toThrow('No readiness rule');
  registerProgressionReviewRoutes(app, review, MemoryRoleStore.fromSeed('parent@example.com=parent;keeper@example.com=keeper'));
  const headers = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience }) });
  const post = (url: string, account = 'parent@example.com') => app.inject({ method: 'POST', url, headers: headers(account) });
  try {
    expect((await post('/api/progression/review-offer', 'keeper@example.com')).statusCode).toBe(403);
    const expired = (await post('/api/progression/review-offer')).json().id;
    const expiredRef = db.collection('progressionReviewOffers').doc(expired);
    await db.runTransaction(async (tx) => { const snap = await tx.get(expiredRef); tx.set(expiredRef, { ...(snap.data() as object), expiresAt: Date.now() - 1 }); });
    expect((await post(`/api/progression/review-offer/${expired}/approve`)).statusCode).toBe(409);
    const first = await post('/api/progression/review-offer');
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ itemId: 'squat-to-box-pause', dose: '2 x 10' });
    expect(first.json().card.id).toBe('squat-to-box-pause');
    expect(first.json().dossier.id).toBe('squat-to-box-pause');
    expect(first.json().dossierVersion).toBe('sha256:8365e00c6b872dd5c864c9e672869701');
    const stale = first.json().id;
    const originalStatus = readiness.status.bind(readiness);
    vi.spyOn(readiness, 'status').mockImplementationOnce(async () => {
      const result = await originalStatus();
      expect(await history.confirmSquatSet(ids[1], 'card-v1', 0, { actualReps: 14, clean: false }, { actualReps: 15, clean: true, revision: 1 })).toBe(true);
      return result;
    });
    expect((await post(`/api/progression/review-offer/${stale}/approve`)).statusCode).toBe(409);
    expect(db.paths().filter((p) => p.startsWith('progressionReviewDecisions/'))).toEqual([]);
    expect(await new FirestoreApprovalStore(db).approvedVersion('card-squat-to-box-pause', 'sha256:836073df2f6a8c3c94e99bf990df658d')).toBeNull();
    expect(await history.confirmSquatSet(ids[1], 'card-v1', 0, { actualReps: 15, clean: true }, { actualReps: 14, clean: false, revision: 2 })).toBe(true);
    expect(await readiness.attest({ orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true })).toBe(true);
    const current = (await post('/api/progression/review-offer')).json().id;
    const competing = (await post('/api/progression/review-offer')).json().id;
    expect((await post(`/api/progression/review-offer/${current}/approve`, 'keeper@example.com')).statusCode).toBe(403);
    db.failWrites = true;
    expect((await post(`/api/progression/review-offer/${current}/approve`)).statusCode).toBe(500);
    db.failWrites = false;
    expect(await new FirestoreApprovalStore(db).approvedVersion('card-squat-to-box-pause', 'sha256:836073df2f6a8c3c94e99bf990df658d')).toBeNull();
    expect(await new FirestoreAuditLog(db).list()).toEqual([]);
    const results = await Promise.all([current, competing].map((id) => post(`/api/progression/review-offer/${id}/approve`)));
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    expect(db.paths().filter((p) => p.startsWith('progressionReviewDecisions/'))).toHaveLength(1);
    const approved = await new FirestoreApprovalStore(db).approvedVersion('card-squat-to-box-pause', 'sha256:836073df2f6a8c3c94e99bf990df658d');
    expect(approved?.decidedBy).toBe('parent@example.com');
    expect(await new FirestoreApprovalStore(db).approvedVersion('dossier-squat-to-box-pause', 'sha256:8365e00c6b872dd5c864c9e672869701')).toBeNull();
    const audit = await new FirestoreAuditLog(db).list();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: 'approved', actorRole: 'parent', itemId: 'card-squat-to-box-pause' });
    expect((await post(`/api/progression/review-offer/${current}/approve`)).statusCode).toBe(409);
  } finally { await app.close(); }
});
