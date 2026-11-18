// HTTP routes for the session history (story 113). The keeper's device sends a record through
// its outbox; both homes read the recent sessions. The role check runs on the server for every
// route. A refusal is logged by role and reason only, never with the record's content.

import type { FastifyInstance } from 'fastify';
import type { RoleStore } from './roles.js';
import type { HistoryService } from './history.js';

export function registerHistoryRoutes(
  app: FastifyInstance,
  { history, roles }: { history: HistoryService; roles: RoleStore },
): void {
  app.post<{ Body: unknown }>('/api/history/sessions', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    const result = await history.submit(role, req.body);
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
}
