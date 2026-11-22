// HTTP routes for exercise dossiers (story 115). The keeper reads approved versions only; the
// parent can also read the version a request asks them to approve, so "Approve" is never blind.

import type { FastifyInstance } from 'fastify';
import type { ApprovalService } from './approvals.js';
import type { DossierService } from './dossiers.js';
import type { RoleStore } from './roles.js';
import type { TrainingService } from './training.js';

export function registerDossierRoutes(
  app: FastifyInstance,
  { dossiers, approvals, roles, training }: { dossiers: DossierService; approvals: ApprovalService; roles: RoleStore; training: TrainingService },
): void {
  // The approved dossiers, one per card: "Your training" opens them from each exercise.
  app.get('/api/training/dossiers', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'keeper' && role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return { dossiers: [...(await dossiers.approved()).values()] };
  });

  // The dossier a request asks the parent to approve. Parent only: an unapproved dossier never
  // reaches the keeper.
  app.get<{ Params: { id: string } }>('/api/approvals/:id/dossier', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const dossier = await dossiers.forRequest(await approvals.store.get(req.params.id));
    if (!dossier) return reply.code(404).send({ error: 'not found' });
    return { dossier };
  });

  app.get<{ Params: { id: string } }>('/api/approvals/:id/decision-evidence', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    await approvals.expireDue();
    const request = await approvals.store.get(req.params.id);
    if (!request || request.state !== 'pending') return reply.code(404).send({ error: 'not found' });
    if (request.kind === 'dossier') return { itemVersion: request.itemVersion, dossier: await dossiers.forRequest(request), cards: null };
    return { itemVersion: request.itemVersion, dossier: null, cards: training.decisionEvidence(request) };
  });
}
