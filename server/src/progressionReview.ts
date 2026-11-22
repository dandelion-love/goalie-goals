import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { FsDb } from './firestoreDb.js';
import { bumpEvidenceRevision, evidenceRevisionRef, readEvidenceRevision } from './evidenceRevision.js';
import type { SquatProofService, SquatProofStore } from './squatProof.js';
import type { RoleStore } from './roles.js';
import { ownerApprovedSquatVersions } from './ownerProgression.js';
import type { Dossier, ExerciseCard } from './content.js';

type ReviewCandidate = { itemId: string; version: string; title: string; dose: string; cues: string[]; card: ExerciseCard; dossier?: Dossier; dossierVersion?: string };

/** Isolated review prototype: this records no training approval or active progression. */
export class ProgressionReview {
  private constructor(private readonly db: FsDb, private readonly readiness: SquatProofService,
    private readonly proofs: SquatProofStore, private readonly candidate: ReviewCandidate) {}

  static fromOwnerArchive(db: FsDb, readiness: SquatProofService, proofs: SquatProofStore, contentRoot: string, version: string): ProgressionReview {
    const entry = ownerApprovedSquatVersions(contentRoot).find((item) => item.itemVersion === version);
    if (!entry) throw new Error('Progression version has no owner decision');
    if (entry.rung !== 'squat-to-box-pause' || entry.predecessor !== 'squat-to-box') throw new Error('No readiness rule for progression version');
    return new ProgressionReview(db, readiness, proofs, { itemId: entry.rung, version: entry.itemVersion, title: entry.card.card.name, dose: entry.dose, cues: entry.card.card.cues, card: entry.card.card, ...(entry.dossier && entry.dossierVersion ? { dossier: entry.dossier.dossier, dossierVersion: entry.dossierVersion } : {}) });
  }

  async offer(): Promise<({ id: string } & ReviewCandidate) | null> {
    const before = await this.proofs.read();
    if (!before || await this.readiness.status() !== 'ready-for-parent') return null;
    const after = await this.proofs.read();
    if (!after || JSON.stringify(before) !== JSON.stringify(after) || !after.revision) return null;
    const id = randomUUID();
    const ref = this.db.collection('progressionReviewOffers').doc(id);
    const proofRef = this.db.collection('squatReadiness').doc('parent-proof');
    return this.db.runTransaction(async (tx) => {
      const revision = await readEvidenceRevision(tx, evidenceRevisionRef(this.db));
      const proof = (await tx.get(proofRef)).get('proof');
      if (revision !== after.revision || JSON.stringify(proof) !== JSON.stringify(after)) return null;
      tx.create(ref, { ...this.candidate, revision, proof: after });
      return { id, ...this.candidate };
    });
  }

  async decide(id: string): Promise<boolean> {
    if (!/^[0-9a-f-]{36}$/.test(id)) return false;
    const offerRef = this.db.collection('progressionReviewOffers').doc(id);
    const previous = (await offerRef.get()).data() as { revision?: unknown; proof?: unknown; itemId?: unknown; version?: unknown } | undefined;
    if (!previous || typeof previous.revision !== 'string' || previous.itemId !== this.candidate.itemId || previous.version !== this.candidate.version) return false;
    if (await this.readiness.status() !== 'ready-for-parent') return false;
    const proofRef = this.db.collection('squatReadiness').doc('parent-proof');
    const decisionRef = this.db.collection('progressionReviewDecisions').doc(id);
    return this.db.runTransaction(async (tx) => {
      const revisionRef = evidenceRevisionRef(this.db);
      const revision = await readEvidenceRevision(tx, revisionRef);
      const offer = (await tx.get(offerRef)).data();
      const proof = (await tx.get(proofRef)).get('proof');
      const decision = await tx.get(decisionRef);
      if (revision !== previous.revision || JSON.stringify(offer) !== JSON.stringify(previous) || JSON.stringify(proof) !== JSON.stringify(previous.proof) || decision.exists) return false;
      tx.create(decisionRef, { itemId: this.candidate.itemId, version: this.candidate.version, revision });
      bumpEvidenceRevision(tx, revisionRef);
      return true;
    });
  }
}

/** Not registered in the production app. Role and evidence stay server-side. */
export function registerProgressionReviewRoutes(app: FastifyInstance, review: ProgressionReview, roles: RoleStore): void {
  app.post('/api/progression/review-offer', async (req, reply) => {
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const offer = await review.offer();
    return offer ?? reply.code(409).send({ error: 'unavailable' });
  });
  app.post<{ Params: { id: string } }>('/api/progression/review-offer/:id/approve', async (req, reply) => {
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return await review.decide(req.params.id) ? { ok: true } : reply.code(409).send({ error: 'unavailable' });
  });
}
