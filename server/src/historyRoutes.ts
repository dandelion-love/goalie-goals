// HTTP routes for the session history (story 113). The keeper's device sends a record through
// its outbox; both homes read the recent sessions. The role check runs on the server for every
// route. A refusal is logged by role and reason only, never with the record's content.

import type { FastifyInstance } from 'fastify';
import type { RoleStore } from './roles.js';
import type { HistoryService } from './history.js';
import type { ResetPainGate } from './householdReset.js';
import { GENERATION_HEADER, requestGeneration } from './generation.js';
import { evaluateSquatReadiness, type ReadinessFacts } from './squatReadiness.js';
import type { SquatProofService } from './squatProof.js';

/** Test fixture only: a live authority for complete occurrence order does not yet exist. */
export type SyntheticSquatProof = { orderedRecordIds: string[]; safety: ReadinessFacts['safety'] };

export function registerHistoryRoutes(
  app: FastifyInstance,
  { history, roles, gate, isPaused, currentGeneration, syntheticSquatProof, cardApproved, readiness }: { history: HistoryService; roles: RoleStore; gate: ResetPainGate; isPaused: () => Promise<boolean>; currentGeneration: () => number; syntheticSquatProof?: () => Promise<SyntheticSquatProof | null>; cardApproved: (version: string) => Promise<boolean>; readiness?: () => Promise<SquatProofService | null> },
): void {
  app.post<{ Body: unknown }>('/api/history/sessions', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (!gate.beginWrite()) return reply.code(409).send({ error: 'reset-in-progress' });
    let result;
    try {
      if (requestGeneration(req.headers[GENERATION_HEADER]) !== currentGeneration()) return reply.code(409).send({ error: 'stale_generation' });
      result = await history.submit(role, req.body);
    }
    finally { gate.endWrite(); }
    if (result.ok) return { ok: true };
    req.log.info({ role: role ?? 'none', reason: result.reason }, 'session record refused');
    return reply.code(result.status).send({ error: result.reason });
  });

  app.get('/api/history/sessions', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'keeper' && role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return { sessions: await history.recent() };
  });

  app.get('/api/history/squat-evidence', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'keeper' && role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    // Only the isolated test fixture can supply a proven order today. Production has no
    // such authority and remains unknown; receipt order and client claims are not proof.
    try {
      if (await isPaused()) return { status: 'held' };
      if (readiness) {
        const status = await (await readiness())?.status() ?? 'unknown';
        return status === 'unknown' ? { status, detail: await history.squatEvidenceDetail() } : { status };
      }
      const proof = await syntheticSquatProof?.();
      if (proof) {
        if (Object.values(proof.safety).includes('held')) return { status: 'held' };
        const records = await history.store.list();
        const byId = new Map(records.map((record) => [record.id, record]));
        const ids = proof.orderedRecordIds;
        if (byId.size !== records.length || ids.length !== records.length || new Set(ids).size !== ids.length || ids.some((id) => !byId.has(id))) return { status: 'unknown' };
        const ordered = ids.map((id) => byId.get(id)!);
        const squat = ordered.filter((record) => record.cards.some((card) => card.cardId === 'squat-to-box'));
        if (!(await Promise.all(squat.map((record) => history.store.isBound(record)))).every(Boolean)) return { status: 'unknown' };
        const versions = [...new Set(squat.flatMap((record) => record.cards.filter((card) => card.cardId === 'squat-to-box').map((card) => card.itemVersion)))];
        const approved = await Promise.all(versions.map((version) => cardApproved(version)));
        const status = evaluateSquatReadiness(ordered, { orderedHistoryComplete: true, safety: proof.safety, approvedCardVersions: new Set(versions.filter((_, i) => approved[i])) });
        return status === 'unknown' ? { status, detail: await history.squatEvidenceDetail() } : { status };
      }
      return { status: 'unknown', detail: await history.squatEvidenceDetail() };
    } catch {
      return { status: 'unknown' };
    }
  });

  app.put<{ Body: unknown }>('/api/history/squat-set', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const b = req.body;
    if (!b || typeof b !== 'object' || Array.isArray(b)) return reply.code(400).send({ error: 'invalid' });
    const v = b as Record<string, unknown>;
    const previous = v.previous;
    if (Object.keys(v).sort().join(',') !== 'actualReps,clean,id,previous,set,version' ||
        typeof v.version !== 'string' || typeof v.id !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(v.id) ||
        !Number.isInteger(v.set) || (v.set as number) < 0 || !Number.isInteger(v.actualReps) ||
        (v.actualReps as number) < 1 || typeof v.clean !== 'boolean' ||
        (previous !== null && (!previous || typeof previous !== 'object' || Array.isArray(previous) ||
          Object.keys(previous).sort().join(',') !== 'actualReps,clean,revision' ||
          !Number.isInteger((previous as Record<string, unknown>).actualReps) ||
          !Number.isInteger((previous as Record<string, unknown>).revision) ||
          ((previous as Record<string, unknown>).revision as number) < 1 ||
          typeof (previous as Record<string, unknown>).clean !== 'boolean'))) {
      return reply.code(400).send({ error: 'invalid' });
    }
    if (!gate.beginWrite()) return reply.code(409).send({ error: 'reset-in-progress' });
    try {
      if (requestGeneration(req.headers[GENERATION_HEADER]) !== currentGeneration()) return reply.code(409).send({ error: 'stale_generation' });
      const ok = await history.store.confirmSquatSet(v.id, v.version, v.set as number,
        { actualReps: v.actualReps as number, clean: v.clean }, previous as { actualReps: number; clean: boolean; revision: number } | null);
      return ok ? { ok: true } : reply.code(400).send({ error: 'invalid-set' });
    } catch {
      return reply.code(500).send({ error: 'failed' });
    } finally {
      gate.endWrite();
    }
  });
}
