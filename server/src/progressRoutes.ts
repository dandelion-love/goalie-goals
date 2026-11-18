// HTTP routes for XP and streaks. Both roles record a finished session (the iPad is shared) and
// both read the same summary; the role check runs on the server for every route.

import type { FastifyInstance } from 'fastify';
import type { RoleStore } from './roles.js';
import { DATE_RE, utcDate } from './training.js';
import type { ProgressService } from './progress.js';
import type { Outcome } from './progression.js';

const OUTCOMES: readonly Outcome[] = ['done', 'stopped', 'hurt'];

/** The device's id for a queued finish (story #94), so a resend is recorded once. */
const EVENT_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

interface RecordBody {
  id?: unknown;
  date?: unknown;
  itemId?: unknown;
  itemVersion?: unknown;
  outcome?: unknown;
  warmUpLogged?: unknown;
  praised?: unknown;
}

export function registerProgressRoutes(
  app: FastifyInstance,
  { progress, roles, clock = () => new Date() }: { progress: ProgressService; roles: RoleStore; clock?: () => Date },
): void {
  const dateOf = (value: unknown) => (typeof value === 'string' && DATE_RE.test(value) ? value : utcDate(clock()));

  app.post<{ Body: RecordBody | undefined }>('/api/progress/sessions', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'keeper' && role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const b = req.body ?? {};
    const outcome = OUTCOMES.find((o) => o === b.outcome);
    if (typeof b.itemId !== 'string' || typeof b.itemVersion !== 'string' || !outcome) {
      return reply.code(400).send({ error: 'invalid' });
    }
    const date = dateOf(b.date);
    const record = await progress.record(
      {
        id: typeof b.id === 'string' && EVENT_ID_RE.test(b.id) ? b.id : undefined,
        date,
        itemId: b.itemId.slice(0, 200),
        itemVersion: b.itemVersion.slice(0, 200),
        outcome,
        warmUpLogged: b.warmUpLogged === true,
        praisedSets: Array.isArray(b.praised) ? b.praised.length : 0,
      },
      role,
    );
    return { credit: record.credit, summary: await progress.summary(date) };
  });

  app.get<{ Querystring: { date?: string } }>('/api/progress/summary', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'keeper' && role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return progress.summary(dateOf(req.query.date));
  });
}
