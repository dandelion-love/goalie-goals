// HTTP routes for "something hurts". Report content is never logged: no handler here writes to
// the request logger, and errors answer with a code only, never an echo of the body.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Role, RoleStore } from './roles.js';
import { DATE_RE, utcDate } from './training.js';
import { PainError, type PainReport, type PainService } from './pain.js';

const STATUS: Record<PainError['code'], number> = { forbidden: 403, invalid: 400, not_paused: 409 };

/** The parent reads the report to look after the keeper; the keeper's device needs ids only. */
function reportFor(role: Role, r: PainReport) {
  return role === 'parent'
    ? { id: r.id, bodyArea: r.bodyArea, note: r.note, date: r.date, at: r.at.toISOString() }
    : { id: r.id, date: r.date };
}

export function registerPainRoutes(
  app: FastifyInstance,
  { pain, roles, clock = () => new Date() }: { pain: PainService; roles: RoleStore; clock?: () => Date },
): void {
  const dateOf = (value: unknown) => (typeof value === 'string' && DATE_RE.test(value) ? value : utcDate(clock()));

  async function roleOf(req: FastifyRequest, reply: FastifyReply): Promise<Role | null> {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'keeper' && role !== 'parent') {
      await reply.code(403).send({ error: 'forbidden' });
      return null;
    }
    return role;
  }

  function fail(reply: FastifyReply, e: unknown) {
    if (e instanceof PainError) return reply.code(STATUS[e.code]).send({ error: e.code });
    // Never pass the error on to the logger with the request: answer without detail.
    return reply.code(500).send({ error: 'failed' });
  }

  app.post<{ Body: { id?: unknown; bodyArea?: unknown; note?: unknown; date?: unknown } | undefined }>(
    '/api/pain',
    async (req, reply) => {
      const role = await roleOf(req, reply);
      if (!role) return reply;
      const b = req.body ?? {};
      try {
        const report = await pain.report(
          { account: req.identity!.account, role },
          {
            id: typeof b.id === 'string' ? b.id : '',
            bodyArea: b.bodyArea as never,
            note: typeof b.note === 'string' ? b.note : null,
            date: dateOf(b.date),
          },
        );
        return { paused: true, report: reportFor(role, report) };
      } catch (e) {
        return fail(reply, e);
      }
    },
  );

  app.get('/api/pain/status', async (req, reply) => {
    const role = await roleOf(req, reply);
    if (!role) return reply;
    const s = await pain.status();
    return { paused: s.paused, since: s.since, reports: s.open.map((r) => reportFor(role, r)) };
  });

  // Both roles reach the service, so a keeper's attempt is refused there and logged.
  app.post<{ Body: { date?: unknown } | undefined }>('/api/pain/clear', async (req, reply) => {
    const role = await roleOf(req, reply);
    if (!role) return reply;
    try {
      const cleared = await pain.clear({ account: req.identity!.account, role }, dateOf(req.body?.date));
      return { paused: false, cleared: cleared.length };
    } catch (e) {
      return fail(reply, e);
    }
  });
}
