import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { FsDb } from './firestoreDb.js';
import { bumpEvidenceRevision, evidenceRevisionRef, readEvidenceRevision } from './evidenceRevision.js';
import type { SquatProofService, SquatProofStore } from './squatProof.js';
import type { RoleStore } from './roles.js';
import { ownerApprovedSquatVersions } from './ownerProgression.js';
import type { ExerciseCard } from './content.js';
import { dossierSnapshot, type ClientDossier } from './dossiers.js';
import { cardSnapshot } from './training.js';
import { FirestoreApprovalStore, prepareReviewedApproval, REQUEST_TTL_MS } from './approvals.js';
import { asDate, deleteCollection } from './firestoreDb.js';
import { GENERATION_HEADER, requestGeneration } from './generation.js';
import type { ResetPainGate } from './householdReset.js';

type ReviewCandidate = { itemId: string; version: string; title: string; dose: string; cues: string[]; card: ExerciseCard; approvalContent: { title: string; detail: string }; dossier?: ClientDossier; dossierVersion?: string };

/** Isolated review prototype; never registered until the remaining safety boundaries pass review. */
export class ProgressionReview {
  private constructor(private readonly db: FsDb, private readonly readiness: SquatProofService,
    private readonly proofs: SquatProofStore, private readonly candidate: ReviewCandidate, private readonly seriesComplete: () => Promise<boolean>) {}

  static fromOwnerArchive(db: FsDb, readiness: SquatProofService, proofs: SquatProofStore, contentRoot: string, version: string, seriesComplete: () => Promise<boolean>): ProgressionReview {
    const entry = ownerApprovedSquatVersions(contentRoot).find((item) => item.itemVersion === version);
    if (!entry) throw new Error('Progression version has no owner decision');
    if (entry.rung !== 'squat-to-box-pause' || entry.predecessor !== 'squat-to-box') throw new Error('No readiness rule for progression version');
    const snapshot = cardSnapshot(entry.card);
    return new ProgressionReview(db, readiness, proofs, { itemId: entry.rung, version: entry.itemVersion, title: entry.card.card.name, dose: entry.dose, cues: entry.card.card.cues, card: entry.card.card, approvalContent: { title: snapshot.content.title, detail: snapshot.content.detail }, ...(entry.dossier && entry.dossierVersion ? { dossier: dossierSnapshot(entry.dossier, entry.card.card.name).client, dossierVersion: entry.dossierVersion } : {}) }, seriesComplete);
  }

  async deleteAll(): Promise<void> {
    await deleteCollection(this.db, 'progressionReviewOffers');
    await deleteCollection(this.db, 'progressionReviewDecisions');
  }

  /** A prior guarded parent decision survives restart; an undone approval does not. */
  async hasGuardedApproval(): Promise<boolean> {
    const decisions = await this.db.collection('progressionReviewDecisions').get();
    const approvals = new FirestoreApprovalStore(this.db);
    for (const doc of decisions.docs) {
      const data = doc.data() as { itemId?: unknown; version?: unknown; approvedAt?: unknown; guardToken?: unknown } | undefined;
      if (data?.itemId !== this.candidate.itemId || data.version !== this.candidate.version) continue;
      const offer = (await this.db.collection('progressionReviewOffers').doc(doc.id).get()).data() as { itemId?: unknown; version?: unknown } | undefined;
      const approval = await approvals.get(doc.id);
      const marker = (await this.db.collection('approvalRequests').doc(doc.id).get()).get('guardToken');
      if (typeof data.guardToken === 'string' && marker === data.guardToken && offer?.itemId === this.candidate.itemId && offer.version === this.candidate.version && approval?.state === 'approved' && approval.itemId === `card-${this.candidate.itemId}` && approval.itemVersion === this.candidate.version && approval.decidedAt && approval.decidedAt.getTime() === asDate(data.approvedAt)?.getTime()) return true;
    }
    return false;
  }

  async offer(): Promise<({ id: string } & ReviewCandidate) | null> {
    const before = await this.proofs.read();
    if (!before || await this.readiness.status() !== 'ready-for-parent' || !await this.seriesComplete()) return null;
    const after = await this.proofs.read();
    if (!after || JSON.stringify(before) !== JSON.stringify(after) || !after.revision) return null;
    const id = randomUUID(), expiresAt = Date.now() + REQUEST_TTL_MS;
    const ref = this.db.collection('progressionReviewOffers').doc(id);
    const proofRef = this.db.collection('squatReadiness').doc('parent-proof');
    return this.db.runTransaction(async (tx) => {
      const revision = await readEvidenceRevision(tx, evidenceRevisionRef(this.db));
      const proof = (await tx.get(proofRef)).get('proof');
      if (revision !== after.revision || JSON.stringify(proof) !== JSON.stringify(after)) return null;
      tx.create(ref, { itemId: this.candidate.itemId, version: this.candidate.version, revision, proof: after, expiresAt });
      return { id, ...this.candidate };
    });
  }

  async decide(id: string, actor: string): Promise<boolean> {
    if (!/^[0-9a-f-]{36}$/.test(id)) return false;
    const offerRef = this.db.collection('progressionReviewOffers').doc(id);
    const previous = (await offerRef.get()).data() as { revision?: unknown; proof?: unknown; itemId?: unknown; version?: unknown; expiresAt?: unknown } | undefined;
    if (!previous || typeof previous.revision !== 'string' || typeof previous.expiresAt !== 'number' || previous.itemId !== this.candidate.itemId || previous.version !== this.candidate.version) return false;
    if (await this.readiness.status() !== 'ready-for-parent' || !await this.seriesComplete()) return false;
    const proofRef = this.db.collection('squatReadiness').doc('parent-proof');
    const decisionRef = this.db.collection('progressionReviewDecisions').doc(id);
    return this.db.runTransaction(async (tx) => {
      const revisionRef = evidenceRevisionRef(this.db);
      const revision = await readEvidenceRevision(tx, revisionRef);
      const offer = (await tx.get(offerRef)).data();
      const proof = (await tx.get(proofRef)).get('proof');
      const decision = await tx.get(decisionRef);
      if (Date.now() >= (previous.expiresAt as number) || revision !== previous.revision || JSON.stringify(offer) !== JSON.stringify(previous) || JSON.stringify(proof) !== JSON.stringify(previous.proof) || decision.exists) return false;
      const at = new Date(), itemId = `card-${this.candidate.itemId}`, guardToken = randomUUID();
      const writeApproval = await prepareReviewedApproval(tx, this.db,
        { id, kind: 'exercise', itemId, itemVersion: this.candidate.version, content: this.candidate.approvalContent, state: 'approved', createdAt: at, decidedAt: at, decidedBy: actor, reason: null },
        { at, action: 'approved', actorRole: 'parent', actor, requestId: id, kind: 'exercise', itemId, itemVersion: this.candidate.version, title: this.candidate.title, reason: null }, guardToken);
      if (!writeApproval) return false;
      writeApproval();
      tx.create(decisionRef, { itemId: this.candidate.itemId, version: this.candidate.version, revision, approvedAt: at, guardToken });
      bumpEvidenceRevision(tx, revisionRef);
      return true;
    });
  }
}

/** Not registered in the production app. Role and evidence stay server-side. */
export function registerProgressionReviewRoutes(app: FastifyInstance, review: { offer(): Promise<unknown>; decide(id: string, actor: string): Promise<boolean> }, roles: RoleStore, gate: ResetPainGate, currentGeneration: () => number): void {
  app.post('/api/progression/review-offer', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    if (!gate.beginWrite()) return reply.code(409).send({ error: 'reset-in-progress' });
    try {
      if (requestGeneration(req.headers[GENERATION_HEADER]) !== currentGeneration()) return reply.code(409).send({ error: 'stale_generation' });
      const offer = await review.offer();
      return offer ?? reply.code(409).send({ error: 'unavailable' });
    } finally { gate.endWrite(); }
  });
  app.post<{ Params: { id: string } }>('/api/progression/review-offer/:id/approve', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    if (!gate.beginWrite()) return reply.code(409).send({ error: 'reset-in-progress' });
    try {
      if (requestGeneration(req.headers[GENERATION_HEADER]) !== currentGeneration()) return reply.code(409).send({ error: 'stale_generation' });
      return await review.decide(req.params.id, req.identity!.account) ? { ok: true } : reply.code(409).send({ error: 'unavailable' });
    } finally { gate.endWrite(); }
  });
}
