import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import type { ApprovedItem, AuditEntry, PendingRequest } from './approvals';

// A small fake of the approval API with demo content only. The real rules are tested on the
// server; this checks what each screen shows and sends.
function fakeServer(role: 'keeper' | 'parent') {
  const pending: PendingRequest[] = [
    {
      id: 'r1',
      kind: 'plan',
      itemId: 'plan-starter',
      itemVersion: 'sha256:a1',
      title: 'Starter plan',
      detail: 'Three short sessions a week.',
      state: 'pending',
      createdAt: '2026-01-05T09:00:00Z',
      expiresAt: '2026-01-12T09:00:00Z',
    },
    {
      id: 'r2',
      kind: 'harder_version',
      itemId: 'pogo-hops',
      itemVersion: 'sha256:b2',
      title: 'Low pogo hops, a step harder',
      detail: 'Hops forward and back over a line, 3 sets of 6.',
      state: 'pending',
      createdAt: '2026-01-05T09:00:00Z',
      expiresAt: '2026-01-12T09:00:00Z',
    },
  ];
  const approved: ApprovedItem[] = [];
  const audit: AuditEntry[] = pending.map((r) => ({
    id: `e-${r.id}`,
    at: r.createdAt,
    action: 'requested',
    actorRole: 'system',
    kind: r.kind,
    title: r.title,
    reason: null,
  }));
  const posts: string[] = [];

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url === '/api/me') return json({ role });
    if (url === '/api/approvals/pending') return role === 'parent' ? json({ requests: pending }) : json({}, 403);
    if (url === '/api/notifications/badge') return json({ unread: role === 'parent' ? pending.length : 0 });
    if (url === '/api/training/approved') return json({ items: approved, waiting: pending.length });
    if (url === '/api/audit') return json({ events: audit });
    const m = /^\/api\/approvals\/([^/]+)\/(approve|decline)$/.exec(url);
    if (m && method === 'POST') {
      posts.push(`${m[2]}:${m[1]}`);
      if (role !== 'parent') return json({ error: 'forbidden' }, 403);
      const i = pending.findIndex((r) => r.id === m[1]);
      if (i < 0) return json({ error: 'not_pending' }, 409);
      const [r] = pending.splice(i, 1);
      if (m[2] === 'approve') {
        approved.push({ kind: r.kind, itemId: r.itemId, itemVersion: r.itemVersion, title: r.title, detail: r.detail, approvedAt: '2026-01-06T09:00:00Z' });
      }
      audit.push({ id: `e-${posts.length}-x`, at: '2026-01-06T09:00:00Z', action: m[2] === 'approve' ? 'approved' : 'declined', actorRole: 'parent', kind: r.kind, title: r.title, reason: null });
      return json({ request: { ...r, state: m[2] === 'approve' ? 'approved' : 'declined' } });
    }
    return json({ error: 'not found' }, 404);
  });

  return { fetchImpl: fetchImpl as unknown as typeof fetch, pending, approved, posts };
}

afterEach(cleanup);

describe('parent inbox', () => {
  it('opens a request, returns to the inbox and rejects an answer resolved elsewhere', async () => {
    const server = fakeServer('parent');
    render(<App fetchImpl={server.fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    const plan = await screen.findByRole('listitem', { name: 'Starter plan' });
    fireEvent.click(within(plan).getByRole('button', { name: 'Review Starter plan' }));
    expect(screen.queryByRole('listitem', { name: 'Low pogo hops, a step harder' })).toBeNull();
    fireEvent.click(within(plan).getByRole('button', { name: 'Back to inbox' }));
    expect(await screen.findByRole('listitem', { name: 'Low pogo hops, a step harder' })).toBeTruthy();
    fireEvent.click(within(plan).getByRole('button', { name: 'Review Starter plan' }));
    server.pending.splice(0, 1);
    fireEvent.click(within(plan).getByRole('button', { name: 'Approve' }));
    expect((await screen.findByRole('alert')).textContent).toContain("That answer didn't go through");
    expect(server.approved).toEqual([]);
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Starter plan' })).toBeNull());
  });
  it('lists pending requests with Approve and Decline, and a badge with the pending count', async () => {
    const server = fakeServer('parent');
    render(<App fetchImpl={server.fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    const inbox = (await screen.findByRole('heading', { name: /Inbox/, level: 2 })).closest('article')!;
    expect(await within(inbox).findByText('Starter plan')).toBeTruthy();
    expect(within(inbox).getByText('Low pogo hops, a step harder')).toBeTruthy();
    expect(within(inbox).getByText('Plan')).toBeTruthy();
    expect(within(inbox).getByText('Harder version')).toBeTruthy();
    expect(within(inbox).getAllByRole('button', { name: 'Approve' })).toHaveLength(2);
    expect(within(inbox).getAllByRole('button', { name: 'Decline' })).toHaveLength(2);
    expect(within(inbox).getByLabelText('2 waiting').textContent).toBe('2');
  });

  it('approves one request, then the badge and the list drop it', async () => {
    const server = fakeServer('parent');
    render(<App fetchImpl={server.fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    const plan = await screen.findByRole('listitem', { name: 'Starter plan' });
    fireEvent.click(within(plan).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Starter plan' })).toBeNull());
    expect(server.posts).toEqual(['approve:r1']);
    expect(screen.getByLabelText('1 waiting').textContent).toBe('1');
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    expect(await screen.findByText(/Parent approved Starter plan/)).toBeTruthy();
  });

  it('declines a request', async () => {
    const server = fakeServer('parent');
    render(<App fetchImpl={server.fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    const harder = await screen.findByRole('listitem', { name: 'Low pogo hops, a step harder' });
    fireEvent.click(within(harder).getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(server.posts).toEqual(['decline:r2']));
    expect(server.approved).toEqual([]);
  });

  it('shows no badge and "Nothing to approve" when the inbox is empty', async () => {
    const server = fakeServer('parent');
    server.pending.length = 0;
    render(<App fetchImpl={server.fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    expect(await screen.findByText('Nothing to approve.')).toBeTruthy();
    expect(screen.queryByLabelText(/waiting/)).toBeNull();
  });
});

describe('keeper home', () => {
  it('shows only approved items and never pending content or answer buttons', async () => {
    const server = fakeServer('keeper');
    server.approved.push({
      kind: 'exercise',
      itemId: 'lateral-shuffle',
      itemVersion: 'sha256:c3',
      title: 'Lateral shuffle',
      detail: '2 sets of 3 efforts over 4 m.',
      approvedAt: '2026-01-04T09:00:00Z',
    });
    render(<App fetchImpl={server.fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Training' }));
    const training = (await screen.findByRole('heading', { name: 'Your training' })).closest('article')!;
    expect(await within(training).findByText('Lateral shuffle')).toBeTruthy();
    expect(within(training).queryByText('Starter plan')).toBeNull();
    expect(within(training).queryByText('Low pogo hops, a step harder')).toBeNull();
    expect(within(training).getByText('2 changes are waiting for your parent.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('heading', { name: /Inbox/, level: 2 })).toBeNull();
    expect(server.fetchImpl).not.toHaveBeenCalledWith('/api/approvals/pending', expect.anything());
  });

  it('shows the same history the parent sees', async () => {
    const server = fakeServer('keeper');
    render(<App fetchImpl={server.fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Training' }));
    const history = (await screen.findByRole('heading', { name: 'History' })).closest('article')!;
    expect(await within(history).findByText(/App asked for Starter plan/)).toBeTruthy();
  });
});
