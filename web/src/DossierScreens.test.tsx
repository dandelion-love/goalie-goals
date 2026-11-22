import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { SessionPlayer } from './SessionPlayer';
import { ApprovedTraining, ParentInbox } from './ApprovalScreens';
import type { ApprovedItem, PendingRequest } from './approvals';
import type { Dossier } from './dossier';
import type { Card } from './training';
import type { WakeLockController } from './wakeLock';
import { BRIDGE, PLANK, demoSession } from './session.fixture';

// Story 115: an approved dossier opens from the player's card intro and from "Your training";
// the parent reads a dossier request in the inbox before approving it. The server decides what
// is approved (server/test/dossiers.test.ts); these check what each screen shows.

/** Shaped like the server's plank dossier: its keeper-facing text, two sections and sources. */
const DOSSIER: Dossier = {
  cardId: 'plank',
  itemVersion: 'sha256:dossier1',
  name: 'Front plank',
  headline: 'A steady middle keeps you in one piece when you dive.',
  why: [
    {
      label: 'Dives',
      text: 'When you dive, your trunk links your legs to your hands. A study of academy keepers looked at dives to each side. Dives to the weaker side showed less trunk control.',
      sources: [1],
    },
    {
      label: 'Set position',
      text: 'In the ready stance you hold still, then push off fast. Coaches of young players train the middle to steady spine and hips.',
      sources: [2],
    },
    { label: 'Set position', text: 'In studies with adults, a stiffer middle helped. It passed more hip power to arms and legs.', sources: [3] },
  ],
  expect: [
    {
      label: '6 weeks',
      text: 'In a trial, pupils in their early teens trained twice a week. After 6 weeks, trunk strength tests were 8 to 22% better. Sideways jumping was 4 to 5% better.',
      sources: [4],
    },
    {
      label: 'Keep it up',
      text: 'Training about twice a week, as in your plan, keeps gains coming. In one youth study, jump gains lasted 8 weeks after training stopped. Everyone improves at their own pace.',
      sources: [5, 6],
    },
  ],
  sources: [
    { n: 1, title: 'Di Paolo et al. On-field biomechanical assessment of high and low dive in competitive goalkeepers (Sensors, 2022)', url: 'https://pubmed.ncbi.nlm.nih.gov/36236618/' },
    { n: 2, title: 'FIFA Training Centre. Athleticism for young players: core strength (2025)', url: 'https://www.fifatrainingcentre.com/en/' },
    { n: 3, title: 'McGill. Core training: evidence translating to better performance (Strength Cond J, 2010)', url: 'https://www.ovid.com/00126548-201006000-00004' },
    { n: 4, title: 'Granacher et al. Effects of core strength training in adolescents (BMC Sports Sci Med Rehabil, 2014)', url: 'https://pubmed.ncbi.nlm.nih.gov/25584193/' },
    { n: 5, title: 'Nunes et al. Neuromuscular training and detraining in youth volleyball players (J Strength Cond Res, 2021)', url: 'https://pubmed.ncbi.nlm.nih.gov/31453943/' },
    { n: 6, title: 'A source with no public page', url: null },
  ],
};

const wake: WakeLockController = {
  status: 'active',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

afterEach(cleanup);

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * The rubric's CT1 over the opened dossier: control labels at most 3 words, every sentence at
 * most `limit`. A source title is a citation (inside `cite`), not the app's own copy.
 */
function checkCopy(root: HTMLElement, limit: number) {
  for (const el of root.querySelectorAll('button, a[href]')) {
    const label = (el.textContent ?? '').trim();
    expect(words(label), `label "${label}"`).toBeLessThanOrEqual(3);
  }
  const sentences = [...root.querySelectorAll('*')]
    .filter((e) => !e.closest('button, a[href], cite, .sr-only'))
    .map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join(' '))
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter((t) => /[A-Za-z]/.test(t))
    .flatMap((t) => t.split(/(?<=[.!?])\s+/));
  expect(sentences.length).toBeGreaterThan(0);
  for (const s of sentences) expect(words(s), `"${s}"`).toBeLessThanOrEqual(limit);
}

async function axeViolations(root: Element) {
  const result = await axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false }, 'label-content-name-mismatch': { enabled: true } },
  });
  const mismatch = result.incomplete.filter((v) => v.id === 'label-content-name-mismatch');
  return [...result.violations, ...mismatch].map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

/** The two sections and the sources, as shown inside `root`. */
function expectDossier(root: HTMLElement) {
  const v = within(root);
  expect(v.getByText(DOSSIER.headline)).toBeTruthy();
  expect(v.getByRole('heading', { name: 'Why it matters for a goalkeeper' })).toBeTruthy();
  expect(v.getByRole('heading', { name: 'What to expect' })).toBeTruthy();
  // The labels: each game action once over its claims, the time frame of each change.
  const terms = [...root.querySelector('.dossier')!.querySelectorAll('dt')].map((d) => d.textContent);
  expect(terms).toEqual(['Dives', 'Set position', '6 weeks', 'Keep it up']);
  expect(root.textContent).toContain('8 to 22% better');
  expect(root.textContent).toContain('[5, 6]');
  // Sources are reachable: each public one links out in a new tab; one without a page has no link.
  const links = v.getAllByRole('link');
  expect(links.map((a) => a.getAttribute('href'))).toEqual(DOSSIER.sources.filter((s) => s.url).map((s) => s.url));
  for (const a of links) {
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  }
  expect(links[0].textContent).toBe('Open source 1');
  expect(v.getByText(DOSSIER.sources[5].title)).toBeTruthy();
}

describe("the player's card intro (AC2)", () => {
  const player = (cards: Card[] = [{ ...PLANK, dossier: DOSSIER }]) =>
    render(
      <SessionPlayer session={demoSession({ warmUp: [], coolDown: [], cards })} layout="expanded" wakeLock={wake} onExit={() => {}} />,
    );

  it('opens an approved dossier from the intro, before set 1, and closes it again', async () => {
    player();
    fireEvent.click(screen.getByText('For the parent', { selector: 'summary' }));
    const intro = screen.getByRole('region', { name: 'For the parent' });
    const open = within(intro).getByRole('button', { name: 'Why it matters' });
    expect(open.getAttribute('aria-expanded')).toBe('false');
    expect(within(intro).queryByText(DOSSIER.headline)).toBeNull();
    fireEvent.click(open);
    expect(open.getAttribute('aria-expanded')).toBe('true');
    expectDossier(intro);
    // Start keeps its place above the intro.
    expect(document.querySelector('.player-controls')!.firstElementChild?.textContent).toBe('Start set 1');
    // In the player, held to the in-session limit of 12 words a sentence (quality rubric CT1).
    checkCopy(intro, 12);
    expect(await axeViolations(intro)).toEqual([]);
    fireEvent.click(open);
    expect(within(intro).queryByText(DOSSIER.headline)).toBeNull();
  });

  it('offers nothing for a card without an approved dossier', () => {
    player([BRIDGE]);
    fireEvent.click(screen.getByText('For the parent', { selector: 'summary' }));
    const intro = screen.getByRole('region', { name: 'For the parent' });
    expect(within(intro).queryByRole('button', { name: 'Why it matters' })).toBeNull();
  });
});

/** A fake of the approvals and dossier API, demo content only. */
function fakeServer({ dossiers = [DOSSIER], failDossiers = false } = {}) {
  const approved: ApprovedItem[] = [
    { kind: 'exercise', itemId: 'card-plank', itemVersion: 'sha256:p', title: 'Front plank', detail: 'Dose: 2 sets of 20 s hold.', approvedAt: '2026-01-05T09:00:00Z' },
    { kind: 'exercise', itemId: 'card-glute-bridge', itemVersion: 'sha256:g', title: 'Glute bridge', detail: 'Dose: 2 sets of 12 reps.', approvedAt: '2026-01-05T09:00:00Z' },
    { kind: 'dossier', itemId: 'dossier-plank', itemVersion: 'sha256:dossier1', title: 'Front plank: why it matters', detail: 'What the keeper reads.', approvedAt: '2026-01-05T09:00:00Z' },
  ];
  const pending: PendingRequest[] = [
    {
      id: 'd1',
      kind: 'dossier',
      itemId: 'dossier-plank',
      itemVersion: 'sha256:dossier1',
      title: 'Front plank: why it matters',
      detail: 'What the keeper reads about this exercise: why it helps a goalkeeper and what to expect. It cites 12 sources.',
      state: 'pending',
      createdAt: '2026-01-05T09:00:00Z',
      expiresAt: '2026-01-12T09:00:00Z',
    },
  ];
  const calls: string[] = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url === '/api/training/approved') return json({ items: approved, waiting: 0 });
    if (url === '/api/training/dossiers') return failDossiers ? json({ error: 'x' }, 500) : json({ dossiers });
    if (url === '/api/approvals/pending') return json({ requests: pending });
    if (url === '/api/notifications/badge') return json({ unread: pending.length });
    if (url === '/api/pain/status') return json({ paused: false });
    if (url === '/api/approvals/d1/dossier') return json({ dossier: DOSSIER });
    if (url === '/api/approvals/d1/approve') {
      pending.splice(0, 1);
      return json({ request: { id: 'd1', state: 'approved' }, undoForMs: 30000 });
    }
    return json({ error: 'not found' }, 404);
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe('"Your training" (AC2)', () => {
  it('opens the dossier from its exercise, and never lists the dossier as an item of its own', async () => {
    const { fetchImpl } = fakeServer();
    render(<ApprovedTraining fetchImpl={fetchImpl} />);
    const plank = (await screen.findByRole('heading', { name: 'Front plank' })).closest('li')!;
    expect(screen.queryByRole('heading', { name: 'Front plank: why it matters' })).toBeNull();
    const bridge = screen.getByRole('heading', { name: 'Glute bridge' }).closest('li')!;
    expect(within(bridge).queryByRole('button', { name: 'Why it matters' })).toBeNull();
    fireEvent.click(within(plank).getByRole('button', { name: 'Why it matters' }));
    expectDossier(plank);
    // Outside the session: the rubric's 20 words a sentence.
    checkCopy(plank, 20);
    expect(await axeViolations(plank)).toEqual([]);
  });

  it('hides an unapproved dossier: no button when the server sends none', async () => {
    const { fetchImpl } = fakeServer({ dossiers: [] });
    render(<ApprovedTraining fetchImpl={fetchImpl} />);
    await screen.findByRole('heading', { name: 'Front plank' });
    expect(screen.queryByRole('button', { name: 'Why it matters' })).toBeNull();
    expect(document.body.textContent).not.toContain(DOSSIER.headline);
  });

  it('still shows the training when the dossiers fail to load', async () => {
    const { fetchImpl } = fakeServer({ failDossiers: true });
    render(<ApprovedTraining fetchImpl={fetchImpl} />);
    await screen.findByRole('heading', { name: 'Front plank' });
    expect(screen.queryByRole('button', { name: 'Why it matters' })).toBeNull();
  });
});

describe("the parent's request (AC3)", () => {
  it('shows a dossier request in the inbox, readable in full before the parent approves it', async () => {
    const { fetchImpl, calls } = fakeServer();
    render(<ParentInbox fetchImpl={fetchImpl} />);
    const row = await screen.findByRole('listitem', { name: 'Front plank: why it matters' });
    expect(within(row).getByText('About an exercise')).toBeTruthy();
    // Fetched only when the parent opens it.
    expect(calls).not.toContain('GET /api/approvals/d1/dossier');
    if (within(row).queryAllByRole('button', { name: /^(Approve|Decline|Read it)$/ }).length === 0) fireEvent.click(await within(row).findByRole('button', { name: /^Review/ }));
    fireEvent.click(within(row).getByRole('button', { name: 'Read it' }));
    await within(row).findByText(DOSSIER.headline);
    expect(calls).toContain('GET /api/approvals/d1/dossier');
    expectDossier(row);
    checkCopy(row, 20);
    if (within(row).queryAllByRole('button', { name: /^(Approve|Decline|Read it)$/ }).length === 0) fireEvent.click(await within(row).findByRole('button', { name: /^Review/ }));
    fireEvent.click(within(row).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(calls).toContain('POST /api/approvals/d1/approve'));
  });
});
