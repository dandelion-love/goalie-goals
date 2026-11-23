import type { FastifyInstance } from 'fastify';
import type { SquatAttestation, SquatProofService } from './squatProof.js';
import type { RoleStore } from './roles.js';
import type { ResetPainGate } from './householdReset.js';
import { GENERATION_HEADER, requestGeneration } from './generation.js';

export function registerSquatProofRoutes(app: FastifyInstance, getProof: () => Promise<SquatProofService | null>, roles: RoleStore, gate: ResetPainGate, currentGeneration: () => number): void {
  app.get('/api/history/squat-review-window', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const proof = await getProof();
    return { sessions: proof ? await proof.reviewWindow() : null };
  });
  app.post<{ Body: unknown }>('/api/history/squat-attestation', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'allDevicesSynced,breakRestartClear,growthClear,orderedRecordIds,stepDownClear') return reply.code(400).send({ error: 'invalid' });
    const input = body as SquatAttestation;
    if (!Array.isArray(input.orderedRecordIds) || !input.orderedRecordIds.every((id) => typeof id === 'string') ||
        [input.allDevicesSynced, input.growthClear, input.breakRestartClear, input.stepDownClear].some((value) => typeof value !== 'boolean')) return reply.code(400).send({ error: 'invalid' });
    if (!gate.beginWrite()) return reply.code(409).send({ error: 'reset-in-progress' });
    try {
      if (requestGeneration(req.headers[GENERATION_HEADER]) !== currentGeneration()) return reply.code(409).send({ error: 'stale_generation' });
      const proof = await getProof();
      if (!proof) return reply.code(409).send({ error: 'unavailable', status: 'unknown' });
      return await proof.attest(input) ? { ok: true, status: await proof.status() } : reply.code(409).send({ error: 'unavailable', status: await proof.status() });
    } finally { gate.endWrite(); }
  });
}
