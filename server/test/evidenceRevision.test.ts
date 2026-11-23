import { expect, it } from 'vitest';
import { bumpEvidenceRevision, evidenceRevisionRef, guardedEvidenceMutation, readEvidenceRevision } from '../src/evidenceRevision.js';
import { FakeFirestore } from './fakeFirestore.js';
import { FirestoreGenerationStore } from '../src/generation.js';
import { FirestorePainStore } from '../src/pain.js';
import { ApprovalService, FirestoreApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';

it('rejects a stale decision and makes concurrent decisions compete on the same revision', async () => {
  const db = new FakeFirestore();
  const ref = evidenceRevisionRef(db);
  const observed = await db.runTransaction((tx) => readEvidenceRevision(tx, ref));
  await db.runTransaction(async (tx) => {
    await readEvidenceRevision(tx, ref);
    bumpEvidenceRevision(tx, ref); // A history or safety write won the race.
  });
  const decision = db.collection('decisions').doc('one');
  expect(await guardedEvidenceMutation(db, observed, async (tx) => { tx.set(decision, { approved: true }); })).toEqual({ applied: false });
  expect((await decision.get()).exists).toBe(false);
  const current = await db.runTransaction((tx) => readEvidenceRevision(tx, ref));
  const attempts = await Promise.all([1, 2].map((n) => guardedEvidenceMutation(db, current, async (tx) => {
    const target = db.collection('decisions').doc(String(n));
    tx.set(target, { approved: true });
    return n;
  })));
  expect(attempts.filter((a) => a.applied)).toHaveLength(1);
});

it('fails closed for malformed revisions and leaves decision documents unchanged', async () => {
  const db = new FakeFirestore();
  const ref = evidenceRevisionRef(db);
  await ref.create({ value: 'invalid' });
  await expect(guardedEvidenceMutation(db, null, async (tx) => {
    tx.set(db.collection('decisions').doc('one'), { approved: true });
  })).rejects.toThrow('Invalid evidence revision');
  expect((await db.collection('decisions').doc('one').get()).exists).toBe(false);
});

it('invalidates an observed revision when household reset begins', async () => {
  const db = new FakeFirestore();
  const ref = evidenceRevisionRef(db);
  const observed = await db.runTransaction((tx) => readEvidenceRevision(tx, ref));
  expect(await new FirestoreGenerationStore(db).bump()).toBe(1);
  expect(await guardedEvidenceMutation(db, observed, async () => 'approved')).toEqual({ applied: false });
});

it('invalidates an observed revision for a pain report and an approval change', async () => {
  const db = new FakeFirestore();
  const revision = () => db.runTransaction((tx) => readEvidenceRevision(tx, evidenceRevisionRef(db)));
  const priorPain = await revision();
  await new FirestorePainStore(db).create({ id: 'pain-example-1', bodyArea: 'knee', note: null, date: '2026-01-05', at: new Date(), reportedBy: 'keeper', clearedAt: null, clearedOn: null, mistakeAt: null, mistakeId: null });
  expect(await guardedEvidenceMutation(db, priorPain, async () => 'approved')).toEqual({ applied: false });
  const service = new ApprovalService({ store: new FirestoreApprovalStore(db), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
  const request = await service.propose({ kind: 'exercise', itemId: 'example', content: { title: 'Example', detail: 'Example' } });
  const priorApproval = await revision();
  await service.approve(request.id, { account: 'parent', role: 'parent' });
  expect(await guardedEvidenceMutation(db, priorApproval, async () => 'approved')).toEqual({ applied: false });
});
