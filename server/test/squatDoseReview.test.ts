import { expect, it } from 'vitest';
import { FirestoreHistoryStore, type HistoryRecord } from '../src/history.js';
import { FirestoreSquatProofStore, SquatProofService } from '../src/squatProof.js';
import { SquatDoseReview } from '../src/squatDoseReview.js';
import { FirestoreApprovalStore, FirestoreAuditLog } from '../src/approvals.js';
import { defaultContentRoot, loadContent } from '../src/content.js';
import { cardSnapshot } from '../src/training.js';
import { FakeFirestore } from './fakeFirestore.js';
import { resolveSquatDoseStage } from '../src/squatDoseStage.js';

it('guards the exact 10 to 12 dose decision with parent-confirmed source evidence', async () => {
  const db = new FakeFirestore(), history = new FirestoreHistoryStore(db), proofs = new FirestoreSquatProofStore(db);
  const root = defaultContentRoot(), from = cardSnapshot(loadContent(root).cards.get('squat-to-box')!).itemVersion;
  const proof = new SquatProofService(history, proofs, async () => ({ revision: 'clear', anyPain: false }), async (version) => version === from, () => new Date('2026-01-05T12:00:00Z'), { reps: 10, version: from });
  const ids: string[] = [];
  for (const n of [1, 2]) {
    const id = `dose-record-${n}`, instanceId = `dose-instance-${n}`;
    const record: HistoryRecord = { id, instanceId, date: '2026-01-05', itemId: 'session', itemVersion: 'session-v1', title: 'Example', outcome: 'done', at: new Date('2026-01-05T12:00:00Z'), cards: [{ cardId: 'squat-to-box', itemVersion: from, name: 'Squat', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps: 10, perSide: false }, cueIds: [] }] };
    await history.startInstance({ id: instanceId, itemId: record.itemId, itemVersion: record.itemVersion, recordId: null, cards: [{ cardId: 'squat-to-box', itemVersion: from }] });
    await history.addBound(record, instanceId);
    for (const set of [0, 1]) await history.confirmSquatSet(id, from, set, { actualReps: 10, clean: true }, null);
    ids.push(id);
  }
  const input = { orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true };
  expect(await proof.attest(input)).toBe(true);
  expect(() => SquatDoseReview.fromOwnerArchive(db, history, proof, proofs, root, 'wrong', 12, async () => true)).toThrow('predecessor');
  const review = SquatDoseReview.fromOwnerArchive(db, history, proof, proofs, root, from, 12, async () => true);
  expect((await resolveSquatDoseStage(db, new FirestoreApprovalStore(db), root))?.index).toBe(0);
  const stale = await review.offer();
  expect(stale?.dose).toBe(12);
  await history.confirmSquatSet(ids[1], from, 0, { actualReps: 9, clean: false }, { actualReps: 10, clean: true, revision: 1 });
  expect(await review.approve(stale!.id, 'parent@example.com')).toBe(false);
  await history.confirmSquatSet(ids[1], from, 0, { actualReps: 10, clean: true }, { actualReps: 9, clean: false, revision: 2 });
  expect(await proof.attest(input)).toBe(true);
  const offer = await review.offer();
  expect(await review.approve(offer!.id, 'parent@example.com')).toBe(true);
  expect(await review.approve(offer!.id, 'parent@example.com')).toBe(false);
  expect(await new FirestoreApprovalStore(db).approvedVersion('card-squat-to-box', 'sha256:ebe9725306de0c55f06f059ca1952118')).not.toBeNull();
  expect((await new FirestoreAuditLog(db).list()).map((event) => event.action)).toEqual(['approved']);
  expect(db.paths().filter((path) => path.startsWith('squatDoseTransitions/'))).toHaveLength(1);
  expect((await resolveSquatDoseStage(db, new FirestoreApprovalStore(db), root))?.index).toBe(1);
  await new FirestoreApprovalStore(db).reopen(offer!.id);
  expect(await resolveSquatDoseStage(db, new FirestoreApprovalStore(db), root)).toBeNull();
});
