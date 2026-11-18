// Client for the parent-approval API. The server enforces every rule; these calls only read
// what the signed-in role may see and send the parent's answers.

export type RequestKind = 'plan' | 'exercise' | 'harder_version';

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
  at: string;
  action: 'requested' | 'approved' | 'declined' | 'expired' | 'refused';
  actorRole: 'keeper' | 'parent' | 'system';
  kind: RequestKind;
  title: string;
  reason: string | null;
}

export class ApiError extends Error {
  constructor(readonly status: number) {
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
  if (!res.ok) throw new ApiError(res.status);
  return (await res.json()) as T;
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function fetchPending(fetchImpl: typeof fetch = fetch): Promise<PendingRequest[]> {
  const body = await call<{ requests?: unknown }>(fetchImpl, '/api/approvals/pending');
  return list<PendingRequest>(body.requests);
}

export async function answerRequest(
  id: string,
  answer: 'approve' | 'decline',
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await call(fetchImpl, `/api/approvals/${encodeURIComponent(id)}/${answer}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
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
};
