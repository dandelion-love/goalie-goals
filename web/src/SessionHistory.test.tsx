import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { App } from './App';
import { ParentHome } from './ParentHome';
import { SessionHistory } from './SessionHistory';
import { MemoryPauseStore } from './pain';
import type { HistorySession } from './history';
import type { AuditEntry } from './approvals';
import type { WakeLockController } from './wakeLock';
import { keeperServer, todayWith } from './session.fixture';

// Story 113 AC2, AC4, AC5: recent sessions on both homes, newest first, apart from the approvals.
// Invented demo content only.

const wake: WakeLockController = {
  status: 'active',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Newest first, as the server sends them: one of each ending. */
const SESSIONS: HistorySession[] = [
  {
    id: 'rec-3',
    date: '2026-01-07',
    title: 'Strong middle',
    outcome: 'done',
    setsDone: 4,
    setsPlanned: 4,
    goodCount: 3,
    cards: [
      { cardId: 'plank', name: 'Front plank', setsDone: 2, setsPlanned: 2, work: '20 s hold', goodCount: 2, goodCues: ['Stay board-straight', 'Keep breathing'] },
      { cardId: 'glute-bridge', name: 'Glute bridge', setsDone: 2, setsPlanned: 2, work: '12 reps', goodCount: 1, goodCues: ['Ribs down'] },
    ],
  },
  {
    id: 'rec-2',
    date: '2026-01-06',
    title: 'Strong middle',
    outcome: 'stopped',
    setsDone: 1,
    setsPlanned: 4,
    goodCount: 0,
    cards: [
      { cardId: 'plank', name: 'Front plank', setsDone: 1, setsPlanned: 2, work: '20 s hold', goodCount: 0, goodCues: [] },
      { cardId: 'glute-bridge', name: 'Glute bridge', setsDone: 0, setsPlanned: 2, work: '12 reps', goodCount: 0, goodCues: [] },
    ],
  },
  {
    id: 'rec-1',
    date: '2026-01-05',
    title: 'Strong middle',
    outcome: 'hurt',
    setsDone: 1,
    setsPlanned: 4,
    goodCount: 1,
    cards: [
      { cardId: 'plank', name: 'Front plank', setsDone: 1, setsPlanned: 2, work: '20 s hold', goodCount: 1, goodCues: [] },
      { cardId: 'glute-bridge', name: 'Glute bridge', setsDone: 0, setsPlanned: 2, work: '12 reps', goodCount: 0, goodCues: [] },
    ],
  },
];

describe('squat evidence', () => {
  it.each([true, false])('shows missing parent confirmation to parent=%s', async (parent) => {
    const fetchImpl = (async (input: RequestInfo | URL) => String(input) === '/api/history/squat-evidence'
      ? json({ status: 'unknown', detail: 'missing-confirmation' }) : json({ sessions: [] })) as typeof fetch;
    render(<SessionHistory parent={parent} fetchImpl={fetchImpl} />);
    expect(await screen.findByText(/recorded squat needs parent confirmation for each set/)).toBeTruthy();
    expect(screen.getByText(/evidence incomplete or unknown/)).toBeTruthy();
  });
  it('lets only the parent enter a completed set and shows the shared unknown state', async () => {
    const sample: HistorySession = { id: 'rec-squat-001', date: '2026-01-05', title: 'Example', outcome: 'done',
      setsDone: 1, setsPlanned: 2, goodCount: 0, cards: [{ cardId: 'squat-to-box', itemVersion: 'card-version',
        name: 'Squat to box', setsDone: 1, setsPlanned: 2, work: '10 reps', goodCount: 0, goodCues: [], squatSets: [] }] };
    const writes: unknown[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/history/squat-set') { writes.push(JSON.parse(String(init?.body))); return json({ ok: true }); }
      if (String(input) === '/api/history/squat-evidence') return json({ status: 'unknown', detail: 'below-target' });
      return json({ sessions: [sample] });
    }) as typeof fetch;
    const { unmount } = render(<SessionHistory parent fetchImpl={fetchImpl} />);
    expect(await screen.findByText(/Squat readiness: evidence incomplete or unknown/)).toBeTruthy();
    expect(screen.getByText(/recorded squat is below the ladder goal/)).toBeTruthy();
    fireEvent.click(await screen.findByText(/Example, Done/));
    fireEvent.change(screen.getByLabelText('Reps completed'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Every rep clean?'), { target: { value: 'yes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save set' }));
    await waitFor(() => expect(writes).toEqual([{ id: sample.id, version: 'card-version', set: 0, actualReps: 10, clean: true, previous: null }]));
    unmount();
    render(<SessionHistory fetchImpl={fetchImpl} />);
    fireEvent.click(await screen.findByText(/Example, Done/));
    expect(screen.queryByLabelText('Reps completed')).toBeNull();
    expect(screen.getByText(/Squat readiness: evidence incomplete or unknown/)).toBeTruthy();
    expect(screen.getByText(/recorded squat is below the ladder goal/)).toBeTruthy();
  });
});

const APPROVAL: AuditEntry = {
  id: 'e1',
  at: '2026-01-05T09:00:00Z',
  action: 'approved',
  actorRole: 'parent',
  kind: 'plan',
  title: 'Session: Strong middle',
  reason: null,
};

/** Wraps a fake API: the history and the audit log answer with the lists above. */
function withHistory(base: typeof fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/history/sessions') return json({ sessions: SESSIONS });
    if (url === '/api/audit') return json({ events: [APPROVAL] });
    return base(input, init);
  }) as unknown as typeof fetch;
}

function parentApi(): typeof fetch {
  return withHistory((async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/api/progress/summary')) {
      const streak = { current: 1, best: 1 };
      return json({ date: '2026-01-07', xp: { total: 10, today: 0 }, team: streak, keeper: streak, parent: streak, today: null, runs: [] });
    }
    if (url === '/api/approvals/pending') return json({ requests: [] });
    if (url === '/api/schedule') return json({ days: [1, 3, 5] });
    return json({ error: 'not found' }, 404);
  }) as unknown as typeof fetch);
}

/** The list's lines, in the order shown. */
async function lines() {
  const panel = await screen.findByRole('article', { name: 'Recent sessions' });
  await within(panel).findByText(/Jan 7: Strong middle, Done/);
  return { panel, items: within(panel).getAllByRole('listitem').filter((li) => li.parentElement?.classList.contains('session-list')) };
}

afterEach(cleanup);

describe('recent sessions on both homes (AC2, AC5)', () => {
  it('keeper home: newest first, with the day, session, ending, sets and cues', async () => {
    render(<App fetchImpl={withHistory(keeperServer(todayWith()).fetchImpl)} wakeLock={wake} pauseStore={new MemoryPauseStore()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'History' }));
    expect(screen.getByRole('heading', { name: 'History', level: 1 })).toBeTruthy();
    const { items } = await lines();
    expect(items.map((li) => li.querySelector('summary')!.textContent)).toEqual([
      'Jan 7: Strong middle, Done4 of 4 sets, 3 good-form cues',
      'Jan 6: Strong middle, Stopped1 of 4 sets, 0 good-form cues',
      'Jan 5: Strong middle, Stopped for safety1 of 4 sets, 1 good-form cue',
    ]);
    fireEvent.click(items[0].querySelector('summary')!);
    fireEvent.click(within(items[0]).getByRole('button', { name: 'Back to sessions' }));
    expect(items[0].querySelector('details')!.open).toBe(false);
    expect(document.activeElement).toBe(items[0].querySelector('summary'));
  });

  it('parent home: the same list, and opening one shows each card and the cues rated good', async () => {
    render(<ParentHome layout="compact" fetchImpl={parentApi()} />);
    const { items } = await lines();
    expect(items).toHaveLength(3);
    const newest = items[0];
    fireEvent.click(newest.querySelector('summary')!);
    expect(newest.querySelector('details')!.open).toBe(true);
    expect(within(newest).getByText('Front plank: 2 of 2 sets, 20 s hold')).toBeTruthy();
    expect(within(newest).getByText('Looked good: Stay board-straight, Keep breathing.')).toBeTruthy();
    expect(within(newest).getByText('Glute bridge: 2 of 2 sets, 12 reps')).toBeTruthy();
    expect(within(newest).getByText('Looked good: Ribs down.')).toBeTruthy();
    // A card version the server no longer knows: the count, without cue text.
    expect(within(items[2]).getByText('1 good-form cue.')).toBeTruthy();
    // Parent wording never gives the keeper a pronoun.
    expect(document.body.textContent).not.toMatch(/\b(he|she|his|her|him|hers)\b/i);
  });

  it('a home with no sessions yet says so', async () => {
    render(<SessionHistory fetchImpl={(async () => json({ sessions: [] })) as unknown as typeof fetch} />);
    expect(await screen.findByText('No sessions yet.')).toBeTruthy();
  });

  it('a failed load offers Retry in its own space', async () => {
    let fail = true;
    const fetchImpl = (async () => (fail ? json({ error: 'x' }, 500) : json({ sessions: SESSIONS }))) as unknown as typeof fetch;
    render(<SessionHistory fetchImpl={fetchImpl} />);
    expect(await screen.findByText("Couldn't load recent sessions.")).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Jan 7: Strong middle, Done/)).toBeTruthy();
  });
});

describe('approvals keep their own list (AC4)', () => {
  it.each(['keeper', 'parent'] as const)('%s home: sessions and approvals in separate panels', async (who) => {
    if (who === 'keeper') {
      render(<App fetchImpl={withHistory(keeperServer(todayWith()).fetchImpl)} wakeLock={wake} pauseStore={new MemoryPauseStore()} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
      fireEvent.click(await screen.findByRole('button', { name: 'History' }));
    } else {
      render(<ParentHome layout="compact" fetchImpl={parentApi()} />);
    }
    const { panel } = await lines();
    if (who === 'keeper') { fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' })); fireEvent.click(screen.getByRole('button', { name: 'Training' })); }
    const approvals = await screen.findByRole('article', { name: 'History' });
    await within(approvals).findByText(/Session: Strong middle/);
    expect(within(panel).queryByText(/approved/)).toBeNull();
    expect(within(approvals).queryByText(/good-form/)).toBeNull();
    // Recent sessions come before the approvals on the page.
    expect(panel.compareDocumentPosition(approvals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
