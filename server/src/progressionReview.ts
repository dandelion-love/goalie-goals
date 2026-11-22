import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { FsDb } from './firestoreDb.js';
import { bumpEvidenceRevision, evidenceRevisionRef, readEvidenceRevision } from './evidenceRevision.js';
import type { SquatProofService, SquatProofStore } from './squatProof.js';
import type { RoleStore } from './roles.js';

/** Isolated review prototype: this records no training approval or active progression. */
export class ProgressionReview {
  constructor(private readonly db: FsDb, private readonly readiness: SquatProofService,
    private readonly proofs: SquatProofStore, private readonly candidate: { itemId: string; version: string }) {}

  async offer(): Promise<{ id: string; itemId: string; version: string } | null> {
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
