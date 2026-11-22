import { createHash, randomUUID } from 'node:crypto';
import type { FsDb } from './firestoreDb.js';
import type { HistoryStore } from './history.js';
import type { SquatProofService, SquatProofStore } from './squatProof.js';
import { evidenceRevisionRef, readEvidenceRevision, bumpEvidenceRevision } from './evidenceRevision.js';
import { prepareReviewedApproval, REQUEST_TTL_MS } from './approvals.js';
import { ownerApprovedSquatVersions } from './ownerProgression.js';
import { cardSnapshot, type CardSnapshot } from './training.js';
import { loadContent } from './content.js';

/** Unregistered dose-step prototype; callers must validate the earlier transition chain. */
export class SquatDoseReview {
  private constructor(private readonly db: FsDb, private readonly history: HistoryStore, private readonly proof: SquatProofService,
    private readonly proofs: SquatProofStore, private readonly from: string, private readonly target: CardSnapshot,
    private readonly priorTransitions: () => Promise<boolean>) {}

  static fromOwnerArchive(db: FsDb, history: HistoryStore, proof: SquatProofService, proofs: SquatProofStore,
    root: string, from: string, targetReps: number, priorTransitions: () => Promise<boolean>): SquatDoseReview {
    if (![12, 14, 15].includes(targetReps)) throw new Error('Invalid squat dose step');
    const archive = ownerApprovedSquatVersions(root);
    const entry = archive.find((item) => item.rung === 'squat-to-box' && item.dose === `2 x ${targetReps}`);
    if (!entry) throw new Error('No owner-authorized squat dose');
    const sourceReps = targetReps === 12 ? 10 : targetReps === 14 ? 12 : 14;
    const base = loadContent(root).cards.get('squat-to-box');
    const expectedFrom = sourceReps === 10 ? (base ? cardSnapshot(base).itemVersion : '') : archive.find((item) => item.rung === 'squat-to-box' && item.dose === `2 x ${sourceReps}`)?.itemVersion;
    if (!expectedFrom || from !== expectedFrom) throw new Error('Invalid squat dose predecessor');
    return new SquatDoseReview(db, history, proof, proofs, from, cardSnapshot(entry.card), priorTransitions);
  }

  async offer(): Promise<{ id: string; title: string; dose: number } | null> {
    const before = await this.proofs.read();
    const expectedReps = this.target.source.card.dose.reps === 12 ? 10 : this.target.source.card.dose.reps === 14 ? 12 : 14;
    if (!before || before.target.version !== this.from || before.target.reps !== expectedReps || await this.proof.status() !== 'ready-for-parent' || !await this.priorTransitions()) return null;
    const window = await this.proof.reviewWindow(), snapshot = await this.history.readinessSnapshot();
    if (!window || !snapshot || window.length < 2) return null;
    const squatIds = new Set(snapshot.records.filter((record) => record.cards.some((card) => card.cardId === 'squat-to-box')).map((record) => record.id));
    const lastId = window.filter((record) => squatIds.has(record.id)).at(-1)?.id;
    if (!lastId) return null;
    const instance = snapshot.instances.find((item) => item.recordId === lastId);
    if (!instance?.sequence) return null;
    const id = randomUUID(), ref = this.db.collection('squatDoseOffers').doc(id), proofRef = this.db.collection('squatReadiness').doc('parent-proof');
    const expected = before.revision;
    if (!expected) return null;
    return this.db.runTransaction(async (tx) => {
      const revision = await readEvidenceRevision(tx, evidenceRevisionRef(this.db));
      const saved = (await tx.get(proofRef)).get('proof');
      if (revision !== expected || JSON.stringify(saved) !== JSON.stringify(before)) return null;
      tx.create(ref, { from: this.from, to: this.target.itemVersion, afterSequence: instance.sequence, revision, proof: before, expiresAt: Date.now() + REQUEST_TTL_MS });
      return { id, title: this.target.content.title, dose: this.target.source.card.dose.reps! };
    });
  }

  async approve(id: string, actor: string): Promise<boolean> {
    if (!/^[0-9a-f-]{36}$/.test(id) || await this.proof.status() !== 'ready-for-parent' || !await this.priorTransitions()) return false;
    const ref = this.db.collection('squatDoseOffers').doc(id), before = (await ref.get()).data() as { from?: unknown; to?: unknown; afterSequence?: unknown; revision?: unknown; proof?: unknown; expiresAt?: unknown } | undefined;
    if (!before || before.from !== this.from || before.to !== this.target.itemVersion || typeof before.afterSequence !== 'number' || typeof before.revision !== 'string' || typeof before.expiresAt !== 'number') return false;
    const proofRef = this.db.collection('squatReadiness').doc('parent-proof');
    const key = createHash('sha256').update(`${this.from}\0${this.target.itemVersion}`).digest('hex');
    const transition = this.db.collection('squatDoseTransitions').doc(key), counter = this.db.collection('sessionSequence').doc('counter');
    return this.db.runTransaction(async (tx) => {
      const revisionRef = evidenceRevisionRef(this.db), revision = await readEvidenceRevision(tx, revisionRef);
      const offer = (await tx.get(ref)).data(), saved = (await tx.get(proofRef)).get('proof');
      const existing = await tx.get(transition), sequence = (await tx.get(counter)).get('value');
      if (Date.now() >= (before.expiresAt as number) || revision !== before.revision || JSON.stringify(offer) !== JSON.stringify(before) || JSON.stringify(saved) !== JSON.stringify(before.proof) || existing.exists || typeof sequence !== 'number' || !Number.isSafeInteger(sequence) || sequence < (before.afterSequence as number)) return false;
      const at = new Date(), itemId = this.target.itemId;
      const writeApproval = await prepareReviewedApproval(tx, this.db,
        { id, kind: 'exercise', itemId, itemVersion: this.target.itemVersion, content: this.target.content, state: 'approved', createdAt: at, decidedAt: at, decidedBy: actor, reason: null },
        { at, action: 'approved', actorRole: 'parent', actor, requestId: id, kind: 'exercise', itemId, itemVersion: this.target.itemVersion, title: this.target.content.title, reason: null });
      if (!writeApproval) return false;
      writeApproval();
      tx.create(transition, { from: this.from, to: this.target.itemVersion, afterSequence: before.afterSequence, decisionSequence: sequence, approvalId: id });
      bumpEvidenceRevision(tx, revisionRef);
      return true;
    });
  }
}
