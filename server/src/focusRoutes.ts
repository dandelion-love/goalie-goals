import type { FastifyInstance } from 'fastify';
import type { RoleStore } from './roles.js';
import type { ResetPainGate } from './householdReset.js';
import { GENERATION_HEADER, requestGeneration } from './generation.js';
import type { FocusCandidate } from './focusCandidate.js';
import type { FocusReviews } from './focusReviews.js';

/** The only live candidate is a server-owned, exact version of the Bronze dossier focus. */
export function registerFocusRoutes(app: FastifyInstance, candidate: FocusCandidate, reviews: FocusReviews, roles: RoleStore, gate: ResetPainGate, generation: () => number, cardApproved: () => Promise<boolean>): void {
  app.get('/api/focus/squat-to-box', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'keeper' && role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    if (!await cardApproved()) return { focus: null };
    return { focus: await reviews.approved(candidate) };
  });
  app.get('/api/focus/squat-to-box/review', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return { itemVersion: candidate.itemVersion, focus: candidate.preview };
  });
  app.post<{ Body: unknown }>('/api/focus/squat-to-box/approve', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).join(',') !== 'itemVersion' || (body as { itemVersion?: unknown }).itemVersion !== candidate.itemVersion) return reply.code(400).send({ error: 'invalid' });
    if (!gate.beginWrite()) return reply.code(409).send({ error: 'reset-in-progress' });
    try {
      if (requestGeneration(req.headers[GENERATION_HEADER]) !== generation()) return reply.code(409).send({ error: 'stale_generation' });
      const request = await reviews.approve(candidate, { account: req.identity!.account, role: 'parent' });
      return request ? { ok: true } : reply.code(409).send({ error: 'unavailable' });
    } finally { gate.endWrite(); }
  });
}
