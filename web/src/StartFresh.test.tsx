import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { GENERATION_HEADER, MemoryGenerationStore } from './generation';
import type { AuditEntry, PendingRequest } from './approvals';
import { demoWeek } from './session.fixture';
import type { WakeLockController } from './wakeLock';

// Story 121: the parent's Start fresh. AC1: at the bottom of the home, a confirm step that says
// what is cleared and what stays, the typed word, and Cancel. AC5: the History's first line.

const wake: WakeLockController = {
  status: 'active',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

const AT = '2026-01-05T09:00:00Z';
const REQUEST: PendingRequest = {
  id: 'r1',
  kind: 'plan',
  itemId: 'session-starter',
  itemVersion: 'sha256:session1',
  title: 'Session: Strong middle',
  detail: 'About 10 minutes.',
  state: 'pending',
  createdAt: AT,
  expiresAt: '2026-01-12T09:00:00Z',
};

/** The parent's server: one request, a pause while `paused`, and a reset that bumps the generation. */
function parentServer({ paused = true, failReset = false } = {}) {
  let generation = 0;
  let audit: AuditEntry[] = [
    { id: 'e1', requestId: 'r1', at: AT, action: 'requested', actorRole: 'system', kind: 'plan', title: REQUEST.title, reason: null },
  ];
  const resets: unknown[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { [GENERATION_HEADER]: String(generation) } });
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/household/reset') {
      resets.push(JSON.parse(String(init?.body)));
      if (failReset) return json({ error: 'failed' }, 500);
      generation += 1;
      paused = false;
      audit = [
        { id: 'e-reset', requestId: 'household', at: '2026-01-07T18:30:00Z', action: 'reset', actorRole: 'parent', kind: 'household', title: "the household's data", reason: null },
        { id: 'e2', requestId: 'r1', at: '2026-01-07T18:30:01Z', action: 'requested', actorRole: 'system', kind: 'plan', title: REQUEST.title, reason: null },
      ];
      return json({ ok: true, generation });
    }
    if (url === '/api/me') return json({ role: 'parent' });
    if (url === '/api/approvals/pending') return json({ requests: [REQUEST] });
    if (url === '/api/notifications/badge') return json({ unread: 1 });
    if (url === '/api/audit') return json({ events: audit });
    if (url === '/api/history/sessions') return json({ sessions: [] });
    if (url === '/api/pain/status') {
      return json(paused ? { paused: true, since: '2026-01-05', reports: [{ id: 'p1', bodyArea: 'knee', note: null, date: '2026-01-05' }] } : { paused: false, since: null, reports: [] });
    }
    if (url.startsWith('/api/progress/week')) return json(demoWeek('2026-01-07'));
    if (url.startsWith('/api/progress/summary')) {
      const streak = { current: 0, best: 0 };
      return json({ date: '2026-01-07', xp: { total: 0, today: 0 }, team: streak, keeper: streak, parent: streak, today: null, runs: [] });
    }
    return json({ error: 'not found' }, 404);
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, resets };
}

async function openStartFresh() {
  const settings = await screen.findByRole('button', { name: 'Settings' });
  if (!settings.hasAttribute('aria-current')) fireEvent.click(settings);
  const card = (await screen.findByRole('heading', { name: 'Start fresh' })).closest('article')!;
  fireEvent.click(within(card as HTMLElement).getByRole('button', { name: 'Start fresh' }));
  return card as HTMLElement;
}

afterEach(cleanup);

// The home reveals its panels in turn, so its last card can take a while under a full run.
configure({ asyncUtilTimeout: 5000 });


describe('Start fresh (AC1)', () => {
  it('keeps reset in Settings, separate from approvals and history', async () => {
    render(<App fetchImpl={parentServer().fetchImpl} wakeLock={wake} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
    const fresh = await screen.findByRole('heading', { name: 'Start fresh' });
    expect(fresh).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Approve/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear the pause' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'History' })).toBeNull();
  });

  it('says what is cleared and what stays, and the pause note when training is paused', async () => {
    render(<App fetchImpl={parentServer().fetchImpl} wakeLock={wake} />);
    const card = await openStartFresh();
    const lists = within(card).getAllByRole('list');
    expect(within(lists[0]).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Approvals and requests',
      'The history',
      'XP, streaks and day results',
      'Recent sessions',
      'Pain reports, notes and pauses',
    ]);
    expect(within(lists[1]).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Accounts', 'Training days']);
    expect(await within(card).findByText('Training is paused now. This also clears the pause.')).toBeTruthy();
  });

  it('mentions the pause even when none is open', async () => {
    render(<App fetchImpl={parentServer({ paused: false }).fetchImpl} wakeLock={wake} />);
    const card = await openStartFresh();
    expect(within(card).getByText('This also clears the pause, if one is open.')).toBeTruthy();
  });

  it('clears nothing until RESET is typed, and Cancel sends nothing', async () => {
    const server = parentServer();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} />);
    let card = await openStartFresh();
    const clear = within(card).getByRole('button', { name: 'Clear all data' }) as HTMLButtonElement;
    expect(clear.disabled).toBe(true);
    const field = within(card).getByLabelText('Type RESET to confirm.');
    for (const wrong of ['', 'reset', 'RESE', 'RESET NOW']) {
      fireEvent.change(field, { target: { value: wrong } });
      expect(clear.disabled).toBe(true);
      fireEvent.submit(clear.closest('form')!);
    }
    fireEvent.click(within(card).getByRole('button', { name: 'Cancel' }));
    expect(within(card).queryByRole('button', { name: 'Clear all data' })).toBeNull();
    expect(server.resets).toEqual([]);

    // Opened again, the field starts empty.
    card = await openStartFresh();
    expect((within(card).getByLabelText('Type RESET to confirm.') as HTMLInputElement).value).toBe('');
    expect(server.resets).toEqual([]);
  });

  it('with RESET typed, clears the data; the home starts fresh with the reset as the first History line (AC5)', async () => {
    const server = parentServer();
    const generations = new MemoryGenerationStore();
    render(<App fetchImpl={server.fetchImpl} wakeLock={wake} generationStore={generations} />);
    const card = await openStartFresh();
    fireEvent.change(within(card).getByLabelText('Type RESET to confirm.'), { target: { value: 'RESET' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Clear all data' }));
    await waitFor(() => expect(server.resets).toHaveLength(1));
    expect(server.resets[0]).toMatchObject({ confirm: 'RESET', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(await screen.findByText('Training data was cleared. Starting fresh.')).toBeTruthy();
    expect(generations.value).toBe(1);
    fireEvent.click(await screen.findByRole('button', { name: 'Progress' }));
    const line = await screen.findByText(/Parent reset the household's data/);
    expect(line.closest('li')?.querySelector('time')?.textContent).toBe('Jan 7');
    // The newest first: the reset is the oldest line of the new history.
    const lines = [...document.querySelectorAll('.history li')].map((li) => li.textContent ?? '');
    expect(lines.at(-1)).toMatch(/Parent reset the household's data/);
  });

  it('says so when the reset fails, and keeps the confirm step', async () => {
    render(<App fetchImpl={parentServer({ failReset: true }).fetchImpl} wakeLock={wake} />);
    const card = await openStartFresh();
    fireEvent.change(within(card).getByLabelText('Type RESET to confirm.'), { target: { value: 'RESET' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Clear all data' }));
    expect((await within(card).findByRole('alert')).textContent).toBe("Couldn't clear the data. Try again.");
    expect(within(card).getByRole('button', { name: 'Clear all data' })).toBeTruthy();
  });
});
