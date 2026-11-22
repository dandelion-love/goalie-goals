import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { FirestoreHistoryStore, type HistoryRecord } from '../src/history.js';
import { FirestoreSquatProofStore, SquatProofService } from '../src/squatProof.js';
import { FirestoreApprovalStore } from '../src/approvals.js';
import { SquatDoseReview } from '../src/squatDoseReview.js';
import { resolveSquatDoseStage } from '../src/squatDoseStage.js';
import { hasCompletedSquatSeries } from '../src/squatSeries.js';
import { ProgressionReview } from '../src/progressionReview.js';
import { defaultContentRoot } from '../src/content.js';
import { FakeFirestore } from './fakeFirestore.js';

it('advances each invented dose through its own guarded parent decision', async () => {
  const db = new FakeFirestore(), history = new FirestoreHistoryStore(db), proofs = new FirestoreSquatProofStore(db), approvals = new FirestoreApprovalStore(db), root = defaultContentRoot();
  const initial = (await resolveSquatDoseStage(db, approvals, root))!;
  const steps = initial.snapshots.map((snap, index) => ({ version: snap.itemVersion, reps: [10, 12, 14, 15][index] }));
  let now = new Date('2026-01-05T12:00:00Z');
  const dates = ['2026-01-05', '2026-01-07', '2026-01-09', '2026-01-12', '2026-01-14', '2026-01-16', '2026-01-19', '2026-01-21'];
  await approvals.create({ id: 'dose-initial-approval', kind: 'exercise', itemId: initial.snapshots[0].itemId, itemVersion: steps[0].version, content: initial.snapshots[0].content, state: 'approved', createdAt: now, decidedAt: now, decidedBy: 'parent@example.com', reason: null });
  const approved = async (version: string) => !!await approvals.approvedVersion('card-squat-to-box', version);
  const services: SquatProofService[] = [];
  for (let stage = 0; stage < steps.length; stage++) {
    const step = steps[stage], ids: string[] = [];
    for (let rep = 1; rep <= 2; rep++) {
      const id = `chain-record-${stage}-${rep}`, instanceId = `chain-instance-${stage}-${rep}`;
      const date = dates[stage * 2 + rep - 1]; now = new Date(`${date}T12:00:00Z`);
      const row: HistoryRecord = { id, instanceId, date, itemId: 'session', itemVersion: `session-${stage}`, title: 'Example', outcome: 'done', at: now, cards: [{ cardId: 'squat-to-box', itemVersion: step.version, name: 'Squat', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps: step.reps, perSide: false }, cueIds: [] }] };
      expect(await history.startInstance({ id: instanceId, itemId: row.itemId, itemVersion: row.itemVersion, recordId: null, cards: [{ cardId: 'squat-to-box', itemVersion: step.version }] })).toBe(true);
      expect(await history.addBound(row, instanceId)).toBe(true);
      for (const set of [0, 1]) expect(await history.confirmSquatSet(id, step.version, set, { actualReps: step.reps, clean: true }, null)).toBe(true);
      ids.push(id);
    }
    const proof = new SquatProofService(history, proofs, async () => ({ revision: 'clear', anyPain: false }), approved, () => now, { reps: step.reps, version: step.version });
    expect(await proof.attest({ orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true })).toBe(true);
    services.push(proof);
    if (stage < 3) {
      const review = SquatDoseReview.fromOwnerArchive(db, history, proof, proofs, root, step.version, steps[stage + 1].reps, async () => (await resolveSquatDoseStage(db, approvals, root))?.index === stage);
      const offer = await review.offer();
      expect(offer?.dose).toBe(`2 x ${steps[stage + 1].reps}`);
      expect(await approved(steps[stage + 1].version)).toBe(false);
      expect(await review.approve(offer!.id, 'parent@example.com')).toBe(true);
      expect((await resolveSquatDoseStage(db, approvals, root))?.index).toBe(stage + 1);
    }
  }
  const transition = async (from: string, to: string, after: number, before: number) => {
    const key = createHash('sha256').update(`${from}\0${to}`).digest('hex');
    const data = (await db.collection('squatDoseTransitions').doc(key).get()).data() as { afterSequence: number; decisionSequence: number; approvalId: string } | undefined;
    return !!data && data.afterSequence === after && data.decisionSequence >= after && data.decisionSequence < before && !!(await approvals.get(data.approvalId));
  };
  expect(await hasCompletedSquatSeries(history, steps, approved, transition)).toBe(true);
  const next = ProgressionReview.fromOwnerArchive(db, services[3], proofs, root, 'sha256:836073df2f6a8c3c94e99bf990df658d', () => hasCompletedSquatSeries(history, steps, approved, transition));
  const offer = await next.offer();
  expect(offer?.itemId).toBe('squat-to-box-pause');
  expect(await next.decide(offer!.id, 'parent@example.com')).toBe(true);
  expect(await approvals.approvedVersion('card-squat-to-box-pause', 'sha256:836073df2f6a8c3c94e99bf990df658d')).not.toBeNull();
});
