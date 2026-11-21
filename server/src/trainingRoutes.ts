// HTTP routes for the session player: today's session, the approved card library and card
// figures. Everything served here is an approved item version; the role check runs on the
// server for every route.

import type { FastifyInstance } from 'fastify';
import type { RoleStore } from './roles.js';
import { DATE_RE, utcDate, type TrainingService } from './training.js';
import type { Clock } from './approvals.js';
import type { HistoryService } from './history.js';
import type { ResetPainGate } from './householdReset.js';
import { GENERATION_HEADER, requestGeneration } from './generation.js';

export function registerTrainingRoutes(
  app: FastifyInstance,
  {
    training,
    roles,
    clock = () => new Date(),
    isPaused = async () => false,
    history, gate, currentGeneration,
  }: { training: TrainingService; roles: RoleStore; clock?: Clock; isPaused?: () => Promise<boolean>; history?: HistoryService; gate?: ResetPainGate; currentGeneration?: () => number },
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

  // The keeper starts a session. Recorded so an approval it uses can no longer be undone; a
  // version that is no longer approved (the parent just undid it) is refused with 409.
  // `late: true`: the device queued this start and could not send it at the Start tap (story
  // #94). If the parent's undo landed first, the session still counts: it is recorded and
  // audited as started before the undo reached the device.
  // Only on the day of the undo: an old undo never reopens a session.
  app.post<{ Body: { itemId?: unknown; itemVersion?: unknown; late?: unknown; date?: unknown; instanceId?: unknown } | undefined }>(
    '/api/training/started',
    async (req, reply) => {
      reply.header('cache-control', 'no-store');
      const account = req.identity!.account;
      const role = await roles.roleFor(account);
      if (role !== 'keeper' && role !== 'parent') return reply.code(403).send({ error: 'forbidden' });
      const { itemId, itemVersion, late, date, instanceId } = req.body ?? {};
      if (typeof itemId !== 'string' || typeof itemVersion !== 'string') {
        return reply.code(400).send({ error: 'invalid' });
      }
      if (instanceId !== undefined && (typeof instanceId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(instanceId) || !history)) return reply.code(400).send({ error: 'invalid' });
      if (gate && !gate.beginWrite()) return reply.code(409).send({ error: 'reset-in-progress' });
      try {
      if (currentGeneration && requestGeneration(req.headers[GENERATION_HEADER]) !== currentGeneration()) return reply.code(409).send({ error: 'stale_generation' });
      if (await isPaused()) return reply.code(409).send({ error: 'paused' });
      const bind = () => typeof instanceId === 'string' ? history!.startInstance(instanceId, itemId, itemVersion) : Promise.resolve(true);
      let started = await training.markStarted(itemId, itemVersion, bind);
      let wasLate = false;
      if (!started &&
        late === true &&
        typeof date === 'string' &&
        (await training.markStartedLate(itemId, itemVersion, { account, role }, date, bind))) {
        started = true;
        wasLate = true;
      }
      if (!started) return reply.code(409).send({ error: 'not_approved' });
      return wasLate ? { ok: true, late: true } : { ok: true };
      } finally { gate?.endWrite(); }
    },
  );

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
