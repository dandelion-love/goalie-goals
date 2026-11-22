import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import css from './styles.css?raw';
import { App } from './App';
import { CLOSE_UP_MS, mergeRows, ParentInbox } from './ApprovalScreens';
import { cascaded, parseRules } from './cssCascade';
import type { PendingRequest } from './approvals';

// Story #95: Parent home holds still on load and after an answer. jsdom has no layout, so these
// check what decides a box's size: the same elements, in the same order, with the same declared
// sizes, before and after each change. The live layout-shift numbers come from the browser run.
// Demo content only.

const rules = parseRules(css);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const request = (id: string, title: string): PendingRequest => ({
  id,
  kind: 'exercise',
  itemId: `card-${id}`,
  itemVersion: `sha256:${id}`,
  title,
  detail: 'Bodyweight only, 2 sets of 10.',
  state: 'pending',
  createdAt: '2026-01-05T09:00:00Z',
  expiresAt: '2026-01-12T09:00:00Z',
});

/**
 * A parent's fake API. `gate` holds a route's answer until released; `answerMs` is how long an
 * answer takes on the server's clock (the inbox reads the time with Date.now()).
 */
function parentServer({ failInbox = false, answerMs = 0, failAnswer = false } = {}) {
  const gates = new Map<string, () => void>();
  const held = new Map<string, Promise<void>>();
  const hold = (route: string) => held.set(route, new Promise<void>((r) => gates.set(route, r)));
  const state = {
    pending: [request('r1', 'Squat to box'), request('r2', 'Lateral shuffle'), request('r3', 'Low pogo hops')],
    failInbox,
  };
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const route = url.split('?')[0];
    await held.get(route);
    if ((init?.method ?? 'GET') === 'POST') {
      const m = /^\/api\/approvals\/([^/]+)\/(approve|decline|undo)$/.exec(url);
      if (!m) return json({ error: 'not found' }, 404);
      if (answerMs) vi.setSystemTime(Date.now() + answerMs);
      if (failAnswer) return json({ error: 'boom' }, 500);
      if (m[2] === 'undo') {
        state.pending = [request('r1', 'Squat to box'), ...state.pending.filter((r) => r.id !== 'r1')];
        return json({ request: request(m[1], 'Squat to box') });
      }
      state.pending = state.pending.filter((r) => r.id !== m[1]);
      return json({ request: { id: m[1] }, undoForMs: m[2] === 'approve' ? 60_000 : 0 });
    }
    if (url === '/api/me') return json({ role: 'parent' });
    if (url === '/api/approvals/pending') return state.failInbox ? json({ error: 'boom' }, 500) : json({ requests: state.pending });
    if (url === '/api/notifications/badge') return json({ unread: state.pending.length });
    if (url === '/api/audit') return json({ events: [] });
    if (url === '/api/pain/status') return json({ paused: false, since: null, reports: [] });
    if (route === '/api/progress/summary') {
      const s = { current: 1, best: 1 };
      return json({ date: '2026-01-05', xp: { total: 5, today: 5 }, team: s, keeper: s, parent: s, today: null, runs: [] });
    }
    if (route === '/api/training/days') {
      const names = ['Mon', 'Wed', 'Fri'];
      const titles = ['Strong middle', 'Spring legs', 'Quick feet, strong arms'];
      return json({ days: [1, 3, 5], themes: [1, 3, 5].map((day, i) => ({ day, name: names[i], title: titles[i] })) });
    }
    return json({ error: 'not found' }, 404);
  });
  return { state, hold, release: (route: string) => gates.get(route)?.(), fetchImpl: fetchImpl as unknown as typeof fetch };
}

/** An element's box as the stylesheet sets it: tag, classes, and the sizes declared for it. */
function shape(el: Element): string {
  const sizes = ['display', 'min-height', 'height', 'margin', 'margin-top', 'padding', 'grid-template-columns']
    .map((p) => `${p}=${cascaded(rules, el, p) ?? ''}`)
    .join(';');
  return `${el.tagName}.${[...el.classList].sort().join('.')}{${sizes}}`;
}

/** The shape of a card's block content, down to the rows of toggles, themes and buttons. */
function cardShape(card: Element): string[] {
  const out: string[] = [];
  const walk = (el: Element) => {
    // A wrapper that adds no box of its own (no padding, border or margin) is looked through.
    if (el.classList.contains('days-skeleton')) return [...el.children].forEach(walk);
    out.push(shape(el));
    if (el.matches('.day-toggles, .themes')) out.push(`children=${el.children.length}`);
  };
  [...card.children].forEach(walk);
  return out;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the Training days card holds its final size (AC2)', () => {
  it('is drawn at its loaded shape while it loads, so no panel moves when it resolves', async () => {
    const server = parentServer();
    server.hold('/api/training/days');
    render(<App fetchImpl={server.fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Plan' }));
    const card = (await screen.findByRole('heading', { name: 'Training days' })).closest('article')!;
    expect(card.getAttribute('aria-busy')).toBe('true');
    const loading = cardShape(card);
    // The wrapper that carries the loading status draws no box of its own.
    const wrapper = card.querySelector('.days-skeleton')!;
    for (const p of ['padding', 'margin', 'border', 'min-height', 'height']) expect(cascaded(rules, wrapper, p)).toBeNull();
    // The panels below are mounted (they load) but hidden, and hold their place in the page.
    const panes = document.querySelector('.inbox-pane')!.closest('.reveal')!;
    expect(panes.hasAttribute('hidden')).toBe(true);
    await waitFor(() => expect(panes.querySelector('.request')).not.toBeNull());

    await act(async () => server.release('/api/training/days'));
    await within(card).findByRole('group', { name: 'Training days' });
    expect(card.getAttribute('aria-busy')).toBeNull();
    // The same card element, the same blocks in the same order, at the same declared sizes.
    expect(card.isConnected).toBe(true);
    expect(cardShape(card)).toEqual(loading);
    // The panels below appear after it and in the same place in the page.
    await waitFor(() => expect(panes.hasAttribute('hidden')).toBe(false));
    expect(panes.isConnected).toBe(true);
  });

  it('keeps a place for the message after Save, so a message moves nothing below', async () => {
    const server = parentServer();
    render(<App fetchImpl={server.fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Plan' }));
    const card = (await screen.findByRole('heading', { name: 'Training days' })).closest('article')!;
    const group = await within(card).findByRole('group', { name: 'Training days' });
    const slot = card.querySelector('.days-message')!;
    expect(slot.lastElementChild === null && slot === card.lastElementChild).toBe(true);
    expect(cascaded(rules, slot, 'min-height')).toMatch(/calc\(2 \*/);
    const before = cardShape(card);
    fireEvent.click(within(group).getByRole('button', { name: 'Wed' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Thu' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Save days' }));
    // The message comes inside the kept place.
    await waitFor(() => expect(slot.textContent).not.toBe(''));
    expect(slot.children).toHaveLength(1);
    expect(cardShape(card)).toEqual(before);
  });
});

describe('an answer collapses its item in place (AC3)', () => {
  const rows = () => screen.getAllByRole('listitem').map((li) => li.getAttribute('aria-label'));

  it('a quick answer takes its item away as the result of the tap', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const server = parentServer({ answerMs: CLOSE_UP_MS - 50 });
    render(<ParentInbox fetchImpl={server.fetchImpl} />);
    const item = await screen.findByRole('listitem', { name: 'Squat to box' });
    fireEvent.click(within(item).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(rows()).toEqual(['Lateral shuffle', 'Low pogo hops']));
  });

  it('a slow answer leaves its item in place with its outcome, until the next answer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const server = parentServer({ answerMs: 2000 });
    render(<ParentInbox fetchImpl={server.fetchImpl} />);
    const item = await screen.findByRole('listitem', { name: 'Squat to box' });
    const list = item.parentElement!;
    const toastSlot = list.nextElementSibling!;
    const actions = item.querySelector('.actions')!;
    const actionsShape = { 'min-height': cascaded(rules, actions, 'min-height'), margin: cascaded(rules, actions, 'margin-top') };

    fireEvent.click(within(item).getByRole('button', { name: 'Decline' }));
    const outcome = await within(item).findByText('Declined');
    // Nothing moved: the same item, in the same place, every row still there.
    expect(item.isConnected).toBe(true);
    expect(rows()).toEqual(['Squat to box', 'Lateral shuffle', 'Low pogo hops']);
    expect(list.nextElementSibling).toBe(toastSlot);
    expect(within(item).queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(within(item).queryByRole('button', { name: 'Decline' })).toBeNull();
    // The outcome sits where the buttons were, at their height.
    expect(outcome.classList.contains('actions')).toBe(true);
    expect(cascaded(rules, outcome, 'min-height')).toBe('var(--target)');
    expect(cascaded(rules, outcome, 'margin-top')).toBe(actionsShape.margin);
    expect(actionsShape['min-height']).toBeNull();
    // The next answer is the tap that closes the list up, at once, before its own answer lands.
    const next = screen.getByRole('listitem', { name: 'Lateral shuffle' });
    fireEvent.click(within(next).getByRole('button', { name: 'Approve' }));
    expect(rows()).toEqual(['Lateral shuffle', 'Low pogo hops']);
    expect(within(next).getByRole('button', { name: 'Saving…' })).toBeTruthy();
    await within(next).findByText('Approved');
  });

  it('an undo puts the item back where it was, without moving the rows around it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const server = parentServer({ answerMs: 2000 });
    render(<ParentInbox fetchImpl={server.fetchImpl} />);
    const item = await screen.findByRole('listitem', { name: 'Squat to box' });
    fireEvent.click(within(item).getByRole('button', { name: 'Approve' }));
    const toast = (await screen.findByText('Approved: Squat to box')).parentElement!;
    fireEvent.click(within(toast).getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText("Approval undone. It's back in the inbox.")).toBeTruthy();
    // The same element is pending again in its own place.
    await waitFor(() => expect(within(item).getByRole('button', { name: 'Approve' })).toBeTruthy());
    expect(screen.getAllByRole('listitem')[0]).toBe(item);
    expect(rows()).toEqual(['Squat to box', 'Lateral shuffle', 'Low pogo hops']);
  });

  it('an answer that fails says so in the toast\'s kept place, not above the list', async () => {
    const server = parentServer({ failAnswer: true });
    render(<ParentInbox fetchImpl={server.fetchImpl} />);
    const item = await screen.findByRole('listitem', { name: 'Squat to box' });
    const card = item.closest('article')!;
    const before = [...card.children].map((c) => c.className);
    fireEvent.click(within(item).getByRole('button', { name: 'Approve' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe("That answer didn't go through. Check the inbox and try again.");
    expect(alert.parentElement!.className).toBe('toast-slot');
    expect([...card.children].map((c) => c.className)).toEqual(before);
    expect(within(item).getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  it('keeps each row in place across a reload, and puts a returning request after the one before it', () => {
    const [a, b, c] = [request('a', 'A'), request('b', 'B'), request('c', 'C')];
    const rowsOf = (xs: ReturnType<typeof mergeRows>) => xs.map((x) => `${x.request.id}${x.answered ? `:${x.answered}` : ''}`);
    // Answered here: kept in place. Gone elsewhere and not answered here: gone.
    expect(rowsOf(mergeRows([{ request: a }, { request: b, answered: 'approve' }, { request: c }], [a]))).toEqual(['a', 'b:approve']);
    // Undone: pending again in the same place.
    expect(rowsOf(mergeRows([{ request: a }, { request: b, answered: 'approve' }, { request: c }], [a, b, c]))).toEqual(['a', 'b', 'c']);
    // Back after its row had gone: after the request before it.
    expect(rowsOf(mergeRows([{ request: a }, { request: c }], [a, b, c]))).toEqual(['a', 'b', 'c']);
    expect(rowsOf(mergeRows([{ request: b }], [a, b]))).toEqual(['a', 'b']);
  });
});

describe('a failed load keeps the skeleton\'s space (AC4)', () => {
  it('shows the inbox message and Retry in the same box the skeleton held', async () => {
    const server = parentServer({ failInbox: true });
    server.hold('/api/approvals/pending');
    render(<ParentInbox fetchImpl={server.fetchImpl} />);
    const card = screen.getByRole('heading', { name: 'Inbox', level: 2 }).closest('article')!;
    const space = card.querySelector('.load-space')!;
    expect(within(space as HTMLElement).getByRole('status', { name: 'Loading' })).toBeTruthy();
    const box = { classes: space.className, minHeight: cascaded(rules, space, 'min-height'), next: space.nextElementSibling };
    const children = [...card.children];
    // The skeleton's box is at least the room the error needs: two lines and Retry.
    expect(box.minHeight).toBe('var(--skeleton-request)');

    await act(async () => server.release('/api/approvals/pending'));
    const alert = await within(card).findByRole('alert');
    // The same box: same element, same classes and size, same neighbours; the error is inside.
    expect(space.isConnected).toBe(true);
    expect(space.contains(alert)).toBe(true);
    expect(within(space as HTMLElement).getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect({ classes: space.className, minHeight: cascaded(rules, space, 'min-height'), next: space.nextElementSibling }).toEqual(box);
    expect([...card.children]).toEqual(children);
    expect(alert.textContent).toContain("Couldn't load the inbox.");

    // Retry: the skeleton comes back inside the same box.
    server.state.failInbox = false;
    fireEvent.click(within(space as HTMLElement).getByRole('button', { name: 'Retry' }));
    expect(space.isConnected).toBe(true);
    expect(within(space as HTMLElement).getByRole('status', { name: 'Loading' })).toBeTruthy();
    expect(await screen.findByRole('listitem', { name: 'Squat to box' })).toBeTruthy();
  });

  it('the base space fits two lines of message and Retry for every panel', () => {
    const el = document.createElement('div');
    el.className = 'load-space';
    expect(cascaded(rules, el, 'min-height')).toBe('calc(2 * var(--text-md) * var(--leading-md) + var(--space-2) + var(--target))');
  });
});
