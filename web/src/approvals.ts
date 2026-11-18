// Client for the parent-approval API. The server enforces every rule; these calls only read
// what the signed-in role may see and send the parent's answers.

/** `dossier`: an exercise dossier (story 115), shown to the keeper once approved. */
export type RequestKind = 'plan' | 'exercise' | 'harder_version' | 'dossier';

export interface PendingRequest {
  id: string;
  kind: RequestKind;
  itemId: string;
  itemVersion: string;
  title: string;
  detail: string;
  state: 'pending' | 'approved' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface ApprovedItem {
  kind: RequestKind;
  itemId: string;
  itemVersion: string;
  title: string;
  detail: string;
  approvedAt: string;
}

export interface AuditEntry {
  id: string;
  /** The request the event is about (sent by the server; absent in older fixtures). */
  requestId?: string;
  at: string;
  action:
    | 'requested'
    | 'approved'
    | 'declined'
    | 'expired'
    | 'refused'
    | 'paused'
    | 'cleared'
    /** The keeper marked a pain report "Tapped by mistake"; the pause still holds (story 104). */
    | 'marked'
    | 'changed'
    | 'undone'
    /** A start queued on the keeper's device that reached the server after an undo (story #94). */
    | 'started';
  actorRole: 'keeper' | 'parent' | 'system';
  /**
   * `pause`: a pain report or its clear; the title names the body area only.
   * `schedule`: the parent's choice of training days.
   */
  kind: RequestKind | 'pause' | 'schedule';
  /** What the event is about; `training-pause-mistake` for a mistake note (story 104). */
  itemId?: string;
  title: string;
  reason: string | null;
  /** On an approval the parent may still undo: milliseconds left, as of the response. */
  undoForMs?: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** The server's error code, such as `started` or `too_late`, when it sent one. */
    readonly code: string | null = null,
  ) {
    super(`HTTP ${status}`);
  }
}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };

async function call<T>(fetchImpl: typeof fetch, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchImpl(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
    headers: { ...HEADERS, ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    let code: string | null = null;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === 'string') code = body.error;
    } catch {
      // No JSON body.
    }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function fetchPending(fetchImpl: typeof fetch = fetch): Promise<PendingRequest[]> {
  const body = await call<{ requests?: unknown }>(fetchImpl, '/api/approvals/pending');
  return list<PendingRequest>(body.requests);
}

/** Send the parent's answer. For an approval, how long the parent may still undo it (ms). */
export async function answerRequest(
  id: string,
  answer: 'approve' | 'decline',
  fetchImpl: typeof fetch = fetch,
): Promise<{ undoForMs: number }> {
  const body = await call<{ undoForMs?: unknown } | null>(fetchImpl, `/api/approvals/${encodeURIComponent(id)}/${answer}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  return { undoForMs: typeof body?.undoForMs === 'number' ? body.undoForMs : 0 };
}

/**
 * Undo an approval inside its window. The server refuses with `started` once the keeper has
 * started that session, and with `too_late` after the window.
 */
export async function undoApproval(id: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  await call(fetchImpl, `/api/approvals/${encodeURIComponent(id)}/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

/** What the parent reads after a refused undo, by the server's answer. */
export function undoMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : null;
  if (code === 'started') return 'The keeper has already started this session, so it stays approved.';
  if (code === 'too_late') return 'Too late to undo. It stays approved.';
  return "The undo didn't go through. It is still approved.";
}

export async function fetchApproved(
  fetchImpl: typeof fetch = fetch,
): Promise<{ items: ApprovedItem[]; waiting: number }> {
  const body = await call<{ items?: unknown; waiting?: unknown }>(fetchImpl, '/api/training/approved');
  return { items: list<ApprovedItem>(body.items), waiting: typeof body.waiting === 'number' ? body.waiting : 0 };
}

export async function fetchAudit(fetchImpl: typeof fetch = fetch): Promise<AuditEntry[]> {
  const body = await call<{ events?: unknown }>(fetchImpl, '/api/audit');
  return list<AuditEntry>(body.events);
}

export async function fetchBadge(fetchImpl: typeof fetch = fetch): Promise<number> {
  const body = await call<{ unread?: unknown }>(fetchImpl, '/api/notifications/badge');
  return typeof body.unread === 'number' ? body.unread : 0;
}

export const KIND_LABEL: Record<RequestKind, string> = {
  plan: 'Plan',
  exercise: 'New exercise',
  harder_version: 'Harder version',
  dossier: 'About an exercise',
};
