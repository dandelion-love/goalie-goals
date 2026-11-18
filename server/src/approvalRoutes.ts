// HTTP routes for parent approval. Every route checks the caller's role from the app's own
// data; the UI hiding a button is not the control.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApprovalError, type ApprovalRequest, type ApprovalService, type AuditEvent } from './approvals.js';
import type { Role, RoleStore } from './roles.js';

/** Where the badge number comes from: the in-app notifier while push is mocked. */
export interface BadgeSource {
  unreadCount(to: Role): Promise<number>;
}

export function hasBadge(value: unknown): value is BadgeSource {
  return typeof (value as BadgeSource | undefined)?.unreadCount === 'function';
}

export interface ClientRequest {
  id: string;
  kind: ApprovalRequest['kind'];
  itemId: string;
  itemVersion: string;
  title: string;
  detail: string;
  state: ApprovalRequest['state'];
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
}

export interface ClientAuditEvent {
  id: string;
  at: string;
  action: AuditEvent['action'];
  actorRole: AuditEvent['actorRole'];
  kind: AuditEvent['kind'];
  itemId: string;
  itemVersion: string;
  title: string;
  reason: string | null;
}

function toClient(r: ApprovalRequest, service: ApprovalService): ClientRequest {
  return {
    id: r.id,
    kind: r.kind,
    itemId: r.itemId,
    itemVersion: r.itemVersion,
    title: r.content.title,
    detail: r.content.detail,
    state: r.state,
    createdAt: r.createdAt.toISOString(),
    expiresAt: service.expiresAt(r).toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  };
}

/** Accounts stay on the server: clients see the actor's role only. */
function toClientEvent(e: AuditEvent): ClientAuditEvent {
  return {
    id: e.id,
    at: e.at.toISOString(),
    action: e.action,
    actorRole: e.actorRole,
    kind: e.kind,
    itemId: e.itemId,
    itemVersion: e.itemVersion,
    title: e.title,
    reason: e.reason,
  };
}

const STATUS: Record<ApprovalError['code'], number> = {
  forbidden: 403,
  not_found: 404,
  not_pending: 409,
  invalid: 400,
};

export function registerApprovalRoutes(
  app: FastifyInstance,
  { service, roles, badge }: { service: ApprovalService; roles: RoleStore; badge?: BadgeSource },
): void {
  /** The caller's role if it is one of `allowed`; otherwise a 403 has been sent. */
  async function requireRole(req: FastifyRequest, reply: FastifyReply, allowed: Role[]): Promise<Role | null> {
    reply.header('cache-control', 'no-store');
    const role = await roles.roleFor(req.identity!.account);
    if (!role || !allowed.includes(role)) {
      await reply.code(403).send({ error: 'forbidden' });
      return null;
    }
    return role;
  }

  async function answer(
    req: FastifyRequest<{ Params: { id: string }; Body: { reason?: unknown } | undefined }>,
    reply: FastifyReply,
    verb: 'approve' | 'decline',
  ) {
    // Both roles reach the service so a keeper's attempt is refused there and logged.
    const role = await requireRole(req, reply, ['parent', 'keeper']);
    if (!role) return reply;
    const actor = { account: req.identity!.account, role };
    try {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;
      const done =
        verb === 'approve'
          ? await service.approve(req.params.id, actor)
          : await service.decline(req.params.id, actor, reason);
      return { request: toClient(done, service) };
    } catch (e) {
      if (e instanceof ApprovalError) return reply.code(STATUS[e.code]).send({ error: e.code });
      throw e;
    }
  }

  // The parent's inbox.
  app.get('/api/approvals/pending', async (req, reply) => {
    if (!(await requireRole(req, reply, ['parent']))) return reply;
    const pending = await service.pending();
    return { requests: pending.map((r) => toClient(r, service)) };
  });

  app.post<{ Params: { id: string }; Body: { reason?: unknown } | undefined }>(
    '/api/approvals/:id/approve',
    async (req, reply) => answer(req, reply, 'approve'),
  );

  app.post<{ Params: { id: string }; Body: { reason?: unknown } | undefined }>(
    '/api/approvals/:id/decline',
    async (req, reply) => answer(req, reply, 'decline'),
  );

  // What the keeper may train with: approved versions only. `waiting` says how many changes
  // wait for the parent, without showing them.
  app.get('/api/training/approved', async (req, reply) => {
    if (!(await requireRole(req, reply, ['keeper', 'parent']))) return reply;
    const items = await service.approvedItems();
    const waiting = (await service.pending()).length;
    return {
      items: items.map((i) => ({
        kind: i.kind,
        itemId: i.itemId,
        itemVersion: i.itemVersion,
        title: i.content.title,
        detail: i.content.detail,
        approvedAt: i.approvedAt.toISOString(),
      })),
      waiting,
    };
  });

  // The audit log: both roles read the full history. There is no route to change it.
  app.get('/api/audit', async (req, reply) => {
    if (!(await requireRole(req, reply, ['keeper', 'parent']))) return reply;
    await service.expireDue();
    const events = await service.audit.list();
    return { events: events.map(toClientEvent) };
  });

  // The in-app badge, standing in for push notifications.
  app.get('/api/notifications/badge', async (req, reply) => {
    const role = await requireRole(req, reply, ['keeper', 'parent']);
    if (!role) return reply;
    await service.expireDue();
    return { unread: badge ? await badge.unreadCount(role) : 0 };
  });
}
