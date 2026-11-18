import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import css from './styles.css?raw';
import { App } from './App';
import { History, ParentInbox } from './ApprovalScreens';
import { PainReportForm, PauseInboxItem } from './PainScreens';
import { cascaded, parseRules, px } from './cssCascade';
import type { AuditEntry, PendingRequest } from './approvals';

// Story #96: the parent's approve flow and its pending states. Demo content only.

const rules = parseRules(css);
const SLOW_MS = 2000;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A parent's fake API whose every POST takes two seconds, as on a slow server. */
function slowServer({ paused = false, audit = [] as AuditEntry[] } = {}) {
  const request = (id: string, title: string): PendingRequest => ({
    id,
    kind: 'plan',
    itemId: `plan-${id}`,
    itemVersion: `sha256:${id}`,
    title,
    detail: 'Three short sessions a week.',
    state: 'pending',
    createdAt: '2026-01-05T09:00:00Z',
    expiresAt: '2026-01-12T09:00:00Z',
  });
  const state = {
    pending: [request('r1', 'Starter plan'), request('r2', 'Spring legs')],
    paused,
    posts: [] as string[],
  };
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if ((init?.method ?? 'GET') === 'POST') {
      state.posts.push(url);
      await wait(SLOW_MS);
      const m = /^\/api\/approvals\/([^/]+)\/(approve|decline|undo)$/.exec(url);
      if (m && m[2] === 'undo') {
        audit.splice(0, audit.length, ...audit.map((e) => ({ ...e, undoForMs: 0 })));
        return json({ request: request(m[1], 'Starter plan') });
      }
      if (m) {
        state.pending = state.pending.filter((r) => r.id !== m[1]);
        return json({ request: { id: m[1] }, undoForMs: m[2] === 'approve' ? 60_000 : 0 });
      }
      if (url === '/api/pain/clear') {
        state.paused = false;
        return json({ ok: true });
      }
      return json({ error: 'not found' }, 404);
    }
    if (url === '/api/me') return json({ role: 'parent' });
    if (url === '/api/approvals/pending') return json({ requests: state.pending });
    if (url === '/api/notifications/badge') return json({ unread: state.pending.length });
    if (url === '/api/audit') return json({ events: audit });
    if (url === '/api/pain/status') {
      return json(
        state.paused
          ? { paused: true, since: '2026-01-05', reports: [{ id: 'p1', bodyArea: 'knee', note: null, date: '2026-01-05' }] }
          : { paused: false, since: null, reports: [] },
      );
    }
    if (url.startsWith('/api/training/days')) {
      return json({ days: [1, 3, 5], themes: [1, 3, 5].map((d, i) => ({ day: d, name: ['Mon', 'Wed', 'Fri'][i], title: 'Strong middle' })) });
    }
    return json({ error: 'not found' }, 404);
  });
  return { state, fetchImpl: fetchImpl as unknown as typeof fetch };
}

/** The text of the polite live regions (role status), never an alert. */
const politeText = () =>
  screen
    .getAllByRole('status')
    .filter((e) => (e.getAttribute('aria-live') ?? 'polite') === 'polite')
    .map((e) => e.textContent ?? '')
    .join(' | ');

/** While pending: "Saving…" on the pressed control, aria-busy, a polite announcement, no alert. */
function expectSaving(button: HTMLElement) {
  expect(button.textContent).toBe('Saving…');
  expect(button.getAttribute('aria-busy')).toBe('true');
  expect(politeText()).toContain('Saving…');
  expect(screen.queryAllByRole('alert').map((a) => a.textContent).join('')).not.toContain('Saving');
}

/** Taps a pending control three more times, as an impatient parent would. */
function tapAgain(button: HTMLElement) {
  for (let i = 0; i < 3; i++) fireEvent.click(button);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('a slow server shows a pending state and never sends twice (AC2)', () => {
  it.each([
    ['Approve', 'approve'],
    ['Decline', 'decline'],
  ])('%s', async (label, verb) => {
    const server = slowServer();
    render(<ParentInbox fetchImpl={server.fetchImpl} />);
    const item = await screen.findByRole('listitem', { name: 'Starter plan' });
    const button = within(item).getByRole('button', { name: label });
    fireEvent.click(button);
    expectSaving(button);
    tapAgain(button);
    // The other answers wait their turn.
    for (const other of screen.getAllByRole('button').filter((b) => b !== button)) {
      expect((other as HTMLButtonElement).disabled, other.textContent ?? '').toBe(true);
    }
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS / 2));
    expectSaving(button);
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Starter plan' })).toBeNull());
    expect(server.state.posts).toEqual([`/api/approvals/r1/${verb}`]);
    expect(politeText()).not.toContain('Saving…');
  });

  it('Undo', async () => {
    const server = slowServer();
    render(<ParentInbox fetchImpl={server.fetchImpl} />);
    const item = await screen.findByRole('listitem', { name: 'Starter plan' });
    fireEvent.click(within(item).getByRole('button', { name: 'Approve' }));
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS));
    const toast = (await screen.findByText('Approved: Starter plan')).parentElement!;
    const undo = within(toast).getByRole('button', { name: 'Undo' });
    fireEvent.click(undo);
    expectSaving(undo);
    tapAgain(undo);
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS));
    expect(await screen.findByText("Approval undone. It's back in the inbox.")).toBeTruthy();
    expect(server.state.posts).toEqual(['/api/approvals/r1/approve', '/api/approvals/r1/undo']);
  });

  it('Undo on the History', async () => {
    const approved: AuditEntry = {
      id: 'e1',
      at: '2026-01-06T09:00:00Z',
      action: 'approved',
      actorRole: 'parent',
      kind: 'plan',
      title: 'Starter plan',
      reason: null,
      requestId: 'r1',
      undoForMs: 60_000,
    };
    const server = slowServer({ audit: [approved] });
    render(<History fetchImpl={server.fetchImpl} />);
    const undo = await screen.findByRole('button', { name: 'Undo approval of Starter plan' });
    fireEvent.click(undo);
    expectSaving(undo);
    tapAgain(undo);
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS / 2));
    expectSaving(undo);
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS));
    expect(await screen.findByText("Approval undone. It's back in the inbox.")).toBeTruthy();
    expect(server.state.posts).toEqual(['/api/approvals/r1/undo']);
    expect(politeText()).not.toContain('Saving…');
  });

  it('Clear the pause', async () => {
    const server = slowServer({ paused: true });
    render(<PauseInboxItem fetchImpl={server.fetchImpl} />);
    const clear = await screen.findByRole('button', { name: 'Clear the pause' });
    fireEvent.click(clear);
    expectSaving(clear);
    tapAgain(clear);
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS / 2));
    expectSaving(clear);
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS));
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Training paused/ })).toBeNull());
    expect(server.state.posts).toEqual(['/api/pain/clear']);
  });

  it('Tell my parent', async () => {
    const onSend = vi.fn(async () => {
      await wait(SLOW_MS);
      return true;
    });
    render(<PainReportForm onSend={onSend} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Knee' }));
    const send = screen.getByRole('button', { name: 'Tell my parent' });
    fireEvent.click(send);
    expectSaving(send);
    tapAgain(send);
    fireEvent.submit(send.closest('form')!);
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS / 2));
    expectSaving(send);
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS));
    expect(await screen.findByText(/Your parent has been told/)).toBeTruthy();
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});

describe('the Undo toast keeps its distance and moves nothing (AC1, and story #95 AC3)', () => {
  it('sits in a slot after every other target, at least 8 px below them, held at its height', async () => {
    const server = slowServer();
    render(<ParentInbox fetchImpl={server.fetchImpl} />);
    const item = await screen.findByRole('listitem', { name: 'Starter plan' });
    // Before any toast: the slot is there already, empty, hidden from readers, at its height.
    const slot = item.closest('article')!.querySelector('.toast-slot')!;
    expect(slot).toBeTruthy();
    expect(slot.childElementCount).toBe(0);
    expect(slot.getAttribute('aria-hidden')).toBe('true');
    const emptyHeight = cascaded(rules, slot, 'height');
    expect(emptyHeight).toMatch(/var\(--/);

    fireEvent.click(within(item).getByRole('button', { name: 'Approve' }));
    await act(() => vi.advanceTimersByTimeAsync(SLOW_MS));
    const toast = (await screen.findByText('Approved: Starter plan')).parentElement!;
    expect(toast.className).toBe('toast');
    // The same slot, at the same height, holds the toast: its coming moves nothing.
    expect(toast.parentElement).toBe(slot);
    expect(cascaded(rules, slot, 'height')).toBe(emptyHeight);
    expect(slot.getAttribute('aria-hidden')).toBeNull();
    expect(cascaded(rules, toast, 'height')).toBe('100%');
    expect(cascaded(rules, toast, 'margin-top')).toBeNull();
    // Long text is held to two lines, so it never grows past the slot.
    expect(cascaded(rules, toast.querySelector('.toast-text')!, 'overflow')).toBe('hidden');

    // Not floating: a fixed or absolute toast lies over whatever is under it (Decline, before).
    expect(['fixed', 'absolute', 'sticky']).not.toContain(cascaded(rules, toast, 'position'));
    expect(['fixed', 'absolute', 'sticky']).not.toContain(cascaded(rules, slot, 'position'));
    expect(cascaded(rules, toast, 'transform')).toBeNull();
    // Below the list, with a gap of at least 8 px and nothing pulling it back up.
    const before = slot.previousElementSibling!;
    expect(before.className).toBe('requests');
    expect(px(cascaded(rules, slot, 'margin-top'))).toBeGreaterThanOrEqual(8);
    expect(cascaded(rules, before, 'margin')).toBe('0');
    expect(cascaded(rules, before, 'margin-bottom')).toBeNull();
    // Every target outside the toast comes before it in the flow, Decline included.
    const card = toast.closest('article')!;
    const targets = within(card).getAllByRole('button').filter((b) => !toast.contains(b));
    expect(targets.map((b) => b.textContent)).toContain('Decline');
    for (const b of targets) {
      expect(b.compareDocumentPosition(toast) & Node.DOCUMENT_POSITION_FOLLOWING, b.textContent ?? '').toBeTruthy();
    }
    // Inside it, Undo keeps its own room from the text.
    expect(px(cascaded(rules, toast, 'gap'))).toBeGreaterThanOrEqual(8);

    // Gone again after the undo window: the empty slot keeps its height.
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    await waitFor(() => expect(slot.childElementCount).toBe(0));
    expect(slot.isConnected).toBe(true);
    expect(cascaded(rules, slot, 'height')).toBe(emptyHeight);
    expect(slot.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('the lapse date reads cleanly (AC3)', () => {
  it('has no space before the semicolon, even when text nodes are joined', async () => {
    render(<ParentInbox fetchImpl={slowServer().fetchImpl} />);
    const item = await screen.findByRole('listitem', { name: 'Starter plan' });
    const meta = item.querySelector('.meta')!;
    const joined = [...meta.childNodes].map((n) => n.textContent ?? '').join(' ');
    expect(joined).toMatch(/^Lapses unanswered on \S.*\S; silence never approves\.$/);
    expect(joined).not.toMatch(/\s;/);
  });
});

describe('the Training days toggles at 390 x 844 (AC4)', () => {
  function setViewport(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
    window.dispatchEvent(new Event('resize'));
  }
  afterEach(() => setViewport(1024, 768));

  /** The first length of a shorthand such as `var(--hairline) solid var(--card-line)`. */
  const first = (value: string | null) => px(value?.split(/\s+/)[0] ?? null);

  it('are each at least 44 px both ways, with at least 8 px between them', async () => {
    setViewport(390, 844);
    render(<App fetchImpl={slowServer().fetchImpl} />);
    const card = (await screen.findByRole('heading', { name: 'Training days' })).closest('article')!;
    const group = await within(card).findByRole('group', { name: 'Training days' });
    const toggles = within(group).getAllByRole('button');
    expect(toggles).toHaveLength(7);
    expect(card.closest('.app')!.getAttribute('data-layout')).toBe('compact');

    // The width the grid gets at 390 px: the page's and the card's padding and border come off.
    const main = card.closest('.app-main')!;
    const content =
      390 - 2 * first(cascaded(rules, main, 'padding')) - 2 * first(cascaded(rules, card, 'padding')) - 2 * first(cascaded(rules, card, 'border'));
    const columns = cascaded(rules, group, 'grid-template-columns')!;
    const m = /^repeat\((\d+),\s*minmax\((.+),\s*1fr\)\)$/.exec(columns);
    expect(m, columns).not.toBeNull();
    const count = Number(m![1]);
    const gap = px(cascaded(rules, group, 'gap'));
    expect(gap).toBeGreaterThanOrEqual(8);
    expect(px(m![2])).toBeGreaterThanOrEqual(44);
    // The columns fit at their minimum, so none is squeezed below 44 px or spills out.
    expect(count * px(m![2]) + (count - 1) * gap).toBeLessThanOrEqual(content);
    expect((content - (count - 1) * gap) / count).toBeGreaterThanOrEqual(44);
    // Seven toggles in rows of that count: a 4 + 3 grid on a phone.
    expect(count).toBeLessThan(7);
    expect(count).toBeGreaterThanOrEqual(4);

    for (const t of toggles) {
      expect(px(cascaded(rules, t, 'min-height')), t.textContent ?? '').toBeGreaterThanOrEqual(44);
      expect(px(cascaded(rules, t, 'min-width')), t.textContent ?? '').toBeGreaterThanOrEqual(44);
    }
  });
});
