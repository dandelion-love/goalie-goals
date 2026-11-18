import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import type { AuditEntry } from './approvals';
import type { TrainingDays, Weekday } from './schedule';

// A small fake of the training-days API with invented days. The rules (back-to-back days, the
// parent-only write, the audit) are tested on the server; this checks what Parent home shows
// and sends.
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const THEMES = ['Strong middle', 'Spring legs', 'Quick feet, strong arms'];
const order = (d: number) => (d + 6) % 7;

function daysBody(days: Weekday[]): TrainingDays {
  const sorted = [...days].sort((a, b) => order(a) - order(b));
  return { days: sorted, themes: sorted.map((d, i) => ({ day: d, name: NAMES[d], title: THEMES[i] })) };
}

function fakeServer(role: 'keeper' | 'parent', { saveFails = false } = {}) {
  let days: Weekday[] = [1, 3, 5];
  const audit: AuditEntry[] = [];
  const puts: unknown[] = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url === '/api/me') return json({ role });
    if (url === '/api/approvals/pending') return json({ requests: [] });
    if (url === '/api/audit') return json({ events: audit });
    if (url.startsWith('/api/training/days')) {
      if (role !== 'parent') return json({ error: 'forbidden' }, 403);
      if (method === 'GET') return json(daysBody(days));
      const body = JSON.parse(String(init?.body)) as { days: Weekday[] };
      puts.push(body);
      if (saveFails) return json({ error: 'unavailable', message: "Couldn't save the training days. Try again." }, 503);
      const set = new Set(body.days);
      const clash = body.days.find((d) => set.has(((d + 1) % 7) as Weekday));
      if (clash !== undefined) {
        return json({ error: 'invalid', message: `${NAMES[clash]} and ${NAMES[(clash + 1) % 7]} are back to back.` }, 400);
      }
      days = body.days;
      const text = daysBody(days).themes.map((t) => t.name).join(', ');
      audit.push({ id: `e${audit.length}`, at: '2026-01-06T09:00:00Z', action: 'changed', actorRole: 'parent', kind: 'schedule', title: `the training days (${text})`, reason: null });
      return json(daysBody(days));
    }
    return json({ error: 'not found' }, 404);
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, puts };
}

afterEach(cleanup);

async function control() {
  return (await screen.findByRole('heading', { name: 'Training days' })).closest('article')!;
}

const pressed = (card: HTMLElement) =>
  within(card)
    .getAllByRole('button', { pressed: true })
    .map((b) => b.textContent);

describe('training days on Parent home', () => {
  it('shows the default days with their themes, and Save waits for a change', async () => {
    render(<App fetchImpl={fakeServer('parent').fetchImpl} />);
    const card = await control();
    expect(pressed(card)).toEqual(['Mon', 'Wed', 'Fri']);
    expect(within(card).getByText('Mon: Strong middle')).toBeTruthy();
    expect(within(card).getByText('Fri: Quick feet, strong arms')).toBeTruthy();
    expect((within(card).getByRole('button', { name: 'Save days' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps exactly three days on, saves the choice, moves the themes and adds to the history', async () => {
    const server = fakeServer('parent');
    render(<App fetchImpl={server.fetchImpl} />);
    const card = await control();
    // A fourth day can't be added; take one off first.
    fireEvent.click(within(card).getByRole('button', { name: 'Tue' }));
    expect(pressed(card)).toEqual(['Mon', 'Wed', 'Fri']);
    fireEvent.click(within(card).getByRole('button', { name: 'Mon' }));
    const save = within(card).getByRole('button', { name: 'Save days' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(within(card).getByRole('button', { name: 'Sun' }));
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(await within(card).findByRole('status')).toBeTruthy();
    expect(server.puts[0]).toMatchObject({ days: [3, 5, 0] });
    expect(within(card).getByText('Wed: Strong middle')).toBeTruthy();
    expect(within(card).getByText('Sun: Quick feet, strong arms')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Parent set the training days \(Wed, Fri, Sun\)/)).toBeTruthy());
  });

  it("shows the server's message when back-to-back days are refused", async () => {
    render(<App fetchImpl={fakeServer('parent').fetchImpl} />);
    const card = await control();
    fireEvent.click(within(card).getByRole('button', { name: 'Fri' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Thu' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Save days' }));
    expect((await within(card).findByRole('alert')).textContent).toMatch(/Wed and Thu are back to back/);
    expect(within(card).getByText('Fri: Quick feet, strong arms')).toBeTruthy();
  });

  it("shows the server's message when the days could not be saved, and keeps the old days", async () => {
    render(<App fetchImpl={fakeServer('parent', { saveFails: true }).fetchImpl} />);
    const card = await control();
    fireEvent.click(within(card).getByRole('button', { name: 'Fri' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Sat' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Save days' }));
    expect((await within(card).findByRole('alert')).textContent).toMatch(/Couldn't save the training days\. Try again\./);
    expect(within(card).getByText('Fri: Quick feet, strong arms')).toBeTruthy();
  });

  it('is hidden for the keeper', async () => {
    const server = fakeServer('keeper');
    render(<App fetchImpl={server.fetchImpl} />);
    expect(await screen.findByRole('heading', { name: 'Keeper home' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Training days' })).toBeNull();
    expect(server.fetchImpl).not.toHaveBeenCalledWith(expect.stringMatching(/^\/api\/training\/days/), expect.anything());
  });
});
