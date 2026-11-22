import { createHash } from 'node:crypto';
import type { FsDb } from './firestoreDb.js';
import type { ApprovalStore } from './approvals.js';
import { loadContent } from './content.js';
import { ownerApprovedSquatVersions } from './ownerProgression.js';
import { cardSnapshot, type CardSnapshot } from './training.js';

/** Resolve only a contiguous chain of matching, still-approved guarded decisions. */
export async function resolveSquatDoseStage(db: FsDb, approvals: ApprovalStore, contentRoot: string): Promise<{ index: number; snapshots: CardSnapshot[] } | null> {
  const base = loadContent(contentRoot).cards.get('squat-to-box');
  if (!base) return null;
  const archive = ownerApprovedSquatVersions(contentRoot);
  const sources = [base, ...[12, 14, 15].map((reps) => archive.find((entry) => entry.rung === 'squat-to-box' && entry.dose === `2 x ${reps}`)?.card)];
  if (sources.some((source) => !source)) return null;
  const snapshots = sources.map((source) => cardSnapshot(source!));
  let index = 0, missing = false;
  for (let n = 0; n < 3; n++) {
    const from = snapshots[n].itemVersion, to = snapshots[n + 1].itemVersion;
    const key = createHash('sha256').update(`${from}\0${to}`).digest('hex');
    const transition = (await db.collection('squatDoseTransitions').doc(key).get()).data() as { from?: unknown; to?: unknown; afterSequence?: unknown; decisionSequence?: unknown; approvalId?: unknown } | undefined;
    if (!transition) { missing = true; continue; }
    if (missing || transition.from !== from || transition.to !== to || typeof transition.approvalId !== 'string' || !Number.isSafeInteger(transition.afterSequence) || !Number.isSafeInteger(transition.decisionSequence) || (transition.decisionSequence as number) < (transition.afterSequence as number)) return null;
    const approval = await approvals.get(transition.approvalId);
    const offer = (await db.collection('squatDoseOffers').doc(transition.approvalId).get()).data() as { from?: unknown; to?: unknown; afterSequence?: unknown; proof?: { target?: { version?: unknown; reps?: unknown } }; expiresAt?: unknown } | undefined;
    if (!approval || approval.state !== 'approved' || approval.itemId !== snapshots[n + 1].itemId || approval.itemVersion !== to || !approval.decidedAt ||
        !offer || offer.from !== from || offer.to !== to || offer.afterSequence !== transition.afterSequence || offer.proof?.target?.version !== from || offer.proof.target.reps !== [10, 12, 14][n] || typeof offer.expiresAt !== 'number' || approval.decidedAt.getTime() >= offer.expiresAt) return null;
    index = n + 1;
  }
  return { index, snapshots };
}
