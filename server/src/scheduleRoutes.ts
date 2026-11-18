// HTTP routes for the training days: the parent reads and sets them. The role check runs on
// the server; the keeper's app never shows the control, and a keeper's write is refused and
// logged by the service.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Role, RoleStore } from './roles.js';
import { DATE_RE, utcDate } from './training.js';
import { ScheduleError, type ScheduleService } from './schedule.js';
import { WEEKDAY_NAMES, type Weekday } from './weeklyPlan.js';

export interface TrainingDaysResponse {
  /** 0 is Sunday ... 6 Saturday, Monday first. */
  days: Weekday[];
  /** Each training day with the theme it carries, in week order. */
  themes: { day: Weekday; name: string; title: string }[];
}

function response(schedule: ScheduleService, date: string): TrainingDaysResponse {
  const week = schedule.plan.weekOn(date);
  const days = schedule.days(date);
  return {
    days,
    themes: days.map((d) => ({ day: d, name: WEEKDAY_NAMES[d], title: week[d]?.title ?? '' })),
  };
}

export function registerScheduleRoutes(
  app: FastifyInstance,
  { schedule, roles, clock = () => new Date() }: { schedule: ScheduleService; roles: RoleStore; clock?: () => Date },
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

  app.get<{ Querystring: { date?: string } }>('/api/training/days', async (req, reply) => {
    const role = await roleOf(req, reply);
    if (!role) return reply;
    if (role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return response(schedule, dateOf(req.query.date));
  });

  // Both roles reach the service, so a keeper's attempt is refused there and logged.
  app.put<{ Body: { days?: unknown; date?: unknown } | undefined }>('/api/training/days', async (req, reply) => {
    const role = await roleOf(req, reply);
    if (!role) return reply;
    const days = Array.isArray(req.body?.days) ? (req.body.days as unknown[]) : [];
    const date = dateOf(req.body?.date);
    try {
      await schedule.set({ account: req.identity!.account, role }, days, date);
      return response(schedule, date);
    } catch (e) {
      if (e instanceof ScheduleError) {
        return reply.code(e.code === 'forbidden' ? 403 : 400).send({ error: e.code, message: e.message });
      }
      return reply.code(500).send({ error: 'failed' });
    }
  });
}
