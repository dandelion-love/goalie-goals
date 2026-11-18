// HTTP routes for the session player: today's session, the approved card library and card
// figures. Everything served here is an approved item version; the role check runs on the
// server for every route.

import type { FastifyInstance } from 'fastify';
import type { RoleStore } from './roles.js';
import { DATE_RE, utcDate, type TrainingService } from './training.js';
import type { Clock } from './approvals.js';

export function registerTrainingRoutes(
  app: FastifyInstance,
  {
    training,
    roles,
    clock = () => new Date(),
    isPaused = async () => false,
  }: { training: TrainingService; roles: RoleStore; clock?: Clock; isPaused?: () => Promise<boolean> },
): void {
  async function allowed(account: string): Promise<boolean> {
    const role = await roles.roleFor(account);
    return role === 'keeper' || role === 'parent';
  }

  // Today's approved session, or the fallback (last approved version, else rest).
  // `?date=YYYY-MM-DD` is the device's local date; the server's UTC date otherwise.
  app.get<{ Querystring: { date?: string } }>('/api/training/today', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (!(await allowed(req.identity!.account))) return reply.code(403).send({ error: 'forbidden' });
    const date = typeof req.query.date === 'string' && DATE_RE.test(req.query.date) ? req.query.date : utcDate(clock());
    const today = await training.today(date);
    // Paused after a pain report: rest only, nothing to train, until a parent clears it.
    if (await isPaused()) return { ...today, paused: true, today: null, lastApproved: null };
    return { ...today, paused: false };
  });

  // The keeper's card library: the latest approved version of each card.
  app.get('/api/training/cards', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (!(await allowed(req.identity!.account))) return reply.code(403).send({ error: 'forbidden' });
    return { cards: await training.approvedCards() };
  });

  // A card's figure, for an approved version only. Served as an image with no active content.
  app.get<{ Params: { id: string }; Querystring: { v?: string } }>(
    '/api/training/cards/:id/figure.svg',
    async (req, reply) => {
      if (!(await allowed(req.identity!.account))) {
        return reply.code(403).header('cache-control', 'no-store').send({ error: 'forbidden' });
      }
      const svg = await training.figure(req.params.id, String(req.query.v ?? ''));
      if (svg === null) return reply.code(404).header('cache-control', 'no-store').send({ error: 'not found' });
      return reply
        .header('content-type', 'image/svg+xml; charset=utf-8')
        .header('x-content-type-options', 'nosniff')
        .header('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'")
        // A version never changes, but approval can be withdrawn: keep it private and short.
        .header('cache-control', 'private, max-age=300')
        .send(svg);
    },
  );
}
