// HTTP route for this week at a glance (story 114). Both roles read the same week: the keeper's
// home and the parent's home show the same strip. The role check runs on the server.

import type { FastifyInstance } from 'fastify';
import type { RoleStore } from './roles.js';
import type { ProgressService } from './progress.js';
import { DATE_RE, utcDate, type TrainingPlan } from './training.js';
import { weekView } from './week.js';

export function registerWeekRoutes(
  app: FastifyInstance,
  {
    progress,
    plan,
    roles,
    clock = () => new Date(),
  }: { progress: ProgressService; plan: TrainingPlan; roles: RoleStore; clock?: () => Date },
): void {
  app.get<{ Querystring: { date?: string } }>('/api/progress/week', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (role !== 'keeper' && role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const date = typeof req.query.date === 'string' && DATE_RE.test(req.query.date) ? req.query.date : utcDate(clock());
    const [days, pauses] = await Promise.all([progress.days(date), progress.pauses.spans()]);
    return weekView({ today: date, plan, days, pauses });
  });
}
