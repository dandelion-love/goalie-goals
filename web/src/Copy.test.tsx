import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { App } from './App';
import { SessionPlayer } from './SessionPlayer';
import { PainReportForm, PausedPanel } from './PainScreens';
import { MemoryPauseStore } from './pain';
import type { AuditEntry, PendingRequest } from './approvals';
import type { WakeLockController } from './wakeLock';
import { BRIDGE, PLANK, demoSession, demoWeek, keeperServer, todayWith } from './session.fixture';

// Copy rules from the quality rubric (CT1, CT3) and the UX patterns Decision, checked over
// the rendered screens with the existing demo fixtures.

const wake: WakeLockController = {
  status: 'active',
  acquire: async () => 'active',
  release: async () => {},
  subscribe: () => () => {},
};

/** Developer wording that must never reach the keeper or the parent. */
const DEV_WORDS = /content\/|\.spec\.md|\.json\b|card version|\(exercise card\)|sha256|\bweb\/src\b|\bserver\/src\b/i;

// Card text counts like any other text on screen (story #91): cue buttons are labels, and the
// card's steps, mistakes, stop signs and hints are sentences. tools/content_check.py holds every
// repo card to the same limits.
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

interface Copy {
  labels: string[];
  sentences: string[];
  /** Each element's own text as the script joins it, before card text is taken out. */
  lines: string[];
}

/** Script I of the rubric, for jsdom: control labels, and the sentences outside controls. */
function copyOnScreen(root: HTMLElement = document.body): Copy {
  const labels = [...root.querySelectorAll('button, a[href], [role="button"]')]
    .map((e) => (e.textContent || e.getAttribute('aria-label') || '').trim())
    .filter(Boolean);
  const raw = [...root.querySelectorAll('*')]
    .filter((e) => !e.closest('button, a[href], [role="button"], .sr-only, script, style'))
    .map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join(' '));
  const sentences = raw
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter((t) => /[A-Za-z]/.test(t))
    .flatMap((t) => t.split(/(?<=[.!?])\s+/));
  const lines = raw.map((t) => t.replace(/\s+/g, ' ').trim()).filter((t) => /[A-Za-z]/.test(t));
  return { labels, sentences, lines };
}

const screensSeen: string[] = [];

function checkCopy(where: string, limit: number) {
  screensSeen.push(where);
  const text = document.body.textContent ?? '';
  expect(text, where).not.toMatch(DEV_WORDS);
  const ariaLabels = [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label') ?? '');
  for (const l of ariaLabels) expect(l, where).not.toMatch(DEV_WORDS);

  const { labels, sentences, lines } = copyOnScreen();
  expect(sentences.length, `${where}: no text found`).toBeGreaterThan(0);
  for (const label of labels) {
    expect(words(label), `${where}: label "${label}"`).toBeLessThanOrEqual(3);
  }
  for (const s of sentences) expect(words(s), `${where}: "${s}"`).toBeLessThanOrEqual(limit);
  // Story #96 AC3: no stray space before punctuation ("Jan 12 ; silence"), as the audit script
  // reads a line, joining its text nodes with spaces.
  for (const l of lines) expect(l, `${where}: stray space`).not.toMatch(/\s[;:,.!?]/);
}

/** In-session screens (K2 to K5) allow 12 words a sentence; every other screen 20. */
const IN_SESSION = 12;
const ELSEWHERE = 20;

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** A recent session on the parent's home (story 113), stopped for safety, one cue rated. */
const HISTORY_STOPPED = {
  id: 'rec-1',
  date: '2026-01-05',
  title: 'Strong middle',
  outcome: 'hurt',
  setsDone: 1,
  setsPlanned: 4,
  goodCount: 1,
  cards: [
    { cardId: 'plank', name: PLANK.name, setsDone: 1, setsPlanned: 2, work: '20 s hold', goodCount: 1, goodCues: [PLANK.cues[0]] },
    { cardId: 'glute-bridge', name: BRIDGE.name, setsDone: 0, setsPlanned: 2, work: '12 reps', goodCount: 0, goodCues: [] },
  ],
};

/** A parent's fake API: requests in the server's own plain wording, a pause, and the history. */
function parentServer() {
  const at = '2026-01-05T09:00:00Z';
  const expiresAt = '2026-01-12T09:00:00Z';
  const requests: PendingRequest[] = [
    {
      id: 'r1',
      kind: 'exercise',
      itemId: 'card-plank',
      itemVersion: 'sha256:plank1',
      title: PLANK.name,
      detail: `${PLANK.why} Dose: ${PLANK.doseText}.`,
      state: 'pending',
      createdAt: at,
      expiresAt,
    },
    {
      id: 'r2',
      kind: 'plan',
      itemId: 'session-starter',
      itemVersion: 'sha256:session2',
      title: 'Session: Strong middle',
      detail:
        'About 12 minutes. Warm-up: 6 moves, 5 min. Front plank: 2 sets of 20 s hold, rest 45 s. ' +
        'Glute bridge: 2 sets of 12 reps, rest 45 s. Cool-down: 1 move, 1 min.',
      state: 'pending',
      createdAt: at,
      expiresAt,
    },
  ];
  const audit: AuditEntry[] = requests.map((r) => ({
    id: `e-${r.id}`,
    at,
    action: 'requested',
    actorRole: 'system',
    kind: r.kind,
    title: r.title,
    reason: null,
  }));
  audit.push({ id: 'e-p', at, action: 'paused', actorRole: 'keeper', kind: 'pause', title: 'something hurts (knee)', reason: null });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/me') return json({ role: 'parent' });
    if (url === '/api/approvals/pending') return json({ requests });
    if (url === '/api/notifications/badge') return json({ unread: requests.length + 1 });
    if (url === '/api/audit') return json({ events: audit });
    if (url === '/api/history/sessions') return json({ sessions: [HISTORY_STOPPED] });
    if (url === '/api/pain/status') {
      return json({ paused: true, since: '2026-01-05', reports: [{ id: 'p1', bodyArea: 'knee', note: null, date: '2026-01-05', mistakeAt: '2026-01-05T17:02:00Z' }] });
    }
    // Story 120: the training days with each session's minutes.
    if (url.startsWith('/api/training/days')) {
      return json({
        days: [1, 3, 5],
        themes: [
          { day: 1, name: 'Mon', title: 'Strong middle', minutes: 12 },
          { day: 3, name: 'Wed', title: 'Spring legs', minutes: 15 },
          { day: 5, name: 'Fri', title: 'Quick feet, strong arms', minutes: 12 },
        ],
      });
    }
    // Story 114: this week, with a safety stop and the pause on the days ahead.
    if (url.startsWith('/api/progress/week')) return json(demoWeek('2026-01-07', 'paused', 'stopped'));
    if (url.startsWith('/api/progress/summary')) {
      const streak = { current: 2, best: 3 };
      return json({ date: '2026-01-05', xp: { total: 40, today: 0 }, team: streak, keeper: streak, parent: streak, today: null, runs: [] });
    }
    return json({ error: 'not found' }, 404);
  }) as unknown as typeof fetch;
}

afterEach(cleanup);

describe('the words on both homes (AC1)', () => {
  it('parent home: plain request details, short labels, no repo paths or card versions', async () => {
    render(<App fetchImpl={parentServer()} wakeLock={wake} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Inbox/ }));
    expect(await screen.findByRole('heading', { name: 'Session: Strong middle' })).toBeTruthy();
    await screen.findByText(/Keeper reported something hurts/);
    await screen.findByRole('heading', { name: 'Training paused: something hurts' });
    // Story 104: the keeper's mistake note, in the same copy rules.
    await screen.findByText('Check in before clearing.');
    fireEvent.click(screen.getByRole('button', { name: 'Review Session: Strong middle' }));
    expect(copyOnScreen().lines).toContain('Lapses unanswered on Jan 12; silence never approves.');
    checkCopy('P1 parent home', ELSEWHERE);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
    // Story 114: this week's strip, in the same copy rules.
    await screen.findByText('1 of 3 sessions');
    // Story 120: the training days with each session's minutes, in the same copy rules.
    await screen.findByText('About 15 minutes');
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    // Story 113: a recent session, opened, in the same copy rules.
    const recent = await screen.findByText('Jan 5: Strong middle, Stopped for safety');
    fireEvent.click(recent.closest('summary')!);
    expect(screen.getByText(`Looked good: ${PLANK.cues[0]}.`)).toBeTruthy();
    // The lapse date in the copy rules' own reading (AC3 of story #96).
  });

  it("parent home: Start fresh's confirm step (story 121)", async () => {
    render(<App fetchImpl={parentServer()} wakeLock={wake} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reset' }));
    const card = (await screen.findByRole('heading', { name: 'Start fresh' }, { timeout: 5000 })).closest('article') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Start fresh' }));
    await within(card).findByText('Training is paused now. This also clears the pause.');
    // The step's own sentences stay within the in-session limit.
    for (const s of copyOnScreen(card).sentences) expect(words(s), s).toBeLessThanOrEqual(IN_SESSION);
    checkCopy('P2 start fresh', ELSEWHERE);
  });

  it('keeper home, the player at every phase, and the finish screen', async () => {
    const server = keeperServer(todayWith());
    // Story 114: cards in Your training, each with its next step.
    const approved = ['plank', 'broad-jump-stick'].map((id) => ({
      kind: 'exercise',
      itemId: `card-${id}`,
      itemVersion: `sha256:${id}`,
      title: id === 'plank' ? PLANK.name : 'Broad jump with stick landing',
      detail: PLANK.why,
      approvedAt: '2026-01-05T09:00:00Z',
    }));
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) =>
      String(input) === '/api/training/approved'
        ? new Response(JSON.stringify({ items: approved, waiting: 0 }))
        : server.fetchImpl(input, init)) as typeof fetch;
    render(<App fetchImpl={fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} />);
    await screen.findByRole('button', { name: 'Start session' });
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Training' }));
    await screen.findByText(/Squat jump and stick/);
    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Week' }));
    await screen.findByRole('list', { name: 'Days this week' });
    checkCopy('K1 keeper home', ELSEWHERE);

    fireEvent.click(await screen.findByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    click('Start session');
    checkCopy('K2 warm-up move', IN_SESSION);
    click('Next');
    click('Next');
    checkCopy('card ready', IN_SESSION);
    click('Start set 1');
    checkCopy('K3 timed hold', IN_SESSION);
    click('End set');
    checkCopy('form-cue rating', IN_SESSION);
    click('Stay board-straight');
    checkCopy('K5 rest', IN_SESSION);
    click('Skip rest');
    click('End set');
    click('Skip');
    click('Start set 1');
    click('+1');
    checkCopy('K4 rep set', IN_SESSION);
    click('Set done');
    click('Skip');
    click('Skip rest');
    click('Set done');
    click('Skip');
    click('Next');
    expect(screen.getByRole('heading', { name: 'Session done' })).toBeTruthy();
    checkCopy('K6 session done', ELSEWHERE);
  });

  it('the fallback, the pain report and the paused home', async () => {
    const lastApproved = demoSession({ itemVersion: 'sha256:session1', cards: [PLANK], minutes: 4 });
    render(<App fetchImpl={keeperServer(todayWith({ today: null, lastApproved, waiting: 1 })).fetchImpl} wakeLock={wake} />);
    await screen.findByRole('button', { name: 'Do last version' });
    checkCopy('K1 fallback', ELSEWHERE);
    cleanup();

    render(<PainReportForm onSend={async () => true} />);
    checkCopy('K7 pain report', ELSEWHERE);
    cleanup();

    render(<PausedPanel />);
    checkCopy('K8 paused', ELSEWHERE);
    cleanup();

    // Story 104: "Tapped by mistake" on the form and the paused screen, and after it.
    render(<PainReportForm onSend={async () => true} onMistake={() => {}} />);
    checkCopy('K7 pain report with Tapped by mistake', ELSEWHERE);
    click('Tapped by mistake');
    checkCopy('K7 tapped by mistake', ELSEWHERE);
    cleanup();

    render(<PausedPanel onMistake={() => {}} />);
    checkCopy('K8 paused with Tapped by mistake', ELSEWHERE);
    cleanup();

    render(<PausedPanel mistake />);
    checkCopy('K8 paused after Tapped by mistake', ELSEWHERE);
    cleanup();

    render(
      <SessionPlayer
        session={demoSession()}
        layout="medium"
        wakeLock={wake}
        hurtForm={<PainReportForm onSend={async () => true} />}
        onExit={() => {}}
      />,
    );
    click('Something hurts');
    checkCopy('K7 good call stopping', ELSEWHERE);
    cleanup();

    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onExit={() => {}} />);
    click('Stop');
    checkCopy('stopped', ELSEWHERE);
  });

  it('offline: the progress panel and a finish saved on the device (story #94)', async () => {
    const base = keeperServer(todayWith({ today: demoSession({ warmUp: [], coolDown: [], cards: [PLANK] }) })).fetchImpl;
    const net = { online: true };
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!net.online) throw new TypeError('Failed to fetch');
      return base(input, init);
    }) as unknown as typeof fetch;
    render(<App fetchImpl={fetchImpl} wakeLock={wake} pauseStore={new MemoryPauseStore()} />);
    const startButton = await screen.findByRole('button', { name: 'Start session' });
    net.online = false;
    fireEvent.click(startButton);
    click('Start set 1');
    click('End set');
    click('Skip');
    click('Skip rest');
    click('End set');
    click('Skip');
    await screen.findByText('Saved on this device; it will sync.');
    checkCopy('finish saved on the device', ELSEWHERE);
    click('Done for today');
    await screen.findByText(/Progress will update here when you're back online/);
    checkCopy('progress offline', ELSEWHERE);
  });

  it('covered every screen it names', () => {
    expect(screensSeen.length).toBeGreaterThanOrEqual(12);
  });
});

describe('finish feedback names the cue or the work, never the people (AC2)', () => {
  const GRADES_PEOPLE = /great (work|job)|well done|both of you|you're (amazing|great)|good (boy|girl)|\bbad\b|proud of you/i;

  it.each(['done', 'stopped'] as const)('the %s screen and the cue line', (ending) => {
    render(<SessionPlayer session={demoSession({ warmUp: [], coolDown: [], cards: [PLANK] })} layout="medium" wakeLock={wake} onExit={() => {}} />);
    click('Start set 1');
    click('End set');
    click('Keep breathing');
    // The line after a rating names the cue.
    expect(screen.getByRole('status').textContent).toBe('Keep breathing: nice');
    if (ending === 'stopped') {
      click('Stop');
    } else {
      click('Skip rest');
      click('End set');
      click('Skip');
    }
    const finish = screen.getByRole('region', { name: ending === 'done' ? 'Session done' : 'Good call' });
    expect(finish.textContent).not.toMatch(GRADES_PEOPLE);
    expect(within(finish).getByText('Keep breathing')).toBeTruthy();
    if (ending === 'done') expect(within(finish).getByText('Every set is logged. Rest and recovery come next.')).toBeTruthy();
  });
});

describe('screen readers hear what is shown (AC3)', () => {
  async function axeViolations(root: Element) {
    const result = await axe.run(root, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      // jsdom has no layout or colours; TC1 measures contrast in a real browser.
      // label-content-name-mismatch is the audit's US4 finding; axe marks it experimental, so it is
      // turned on by name.
      rules: { 'color-contrast': { enabled: false }, 'label-content-name-mismatch': { enabled: true } },
    });
    // Without layout, axe cannot see rendered text, so a control whose aria-label may not match
    // it comes back "incomplete" rather than a violation. Count that as a failure too: the
    // timer passes only by having no aria-label at all, its name being its text.
    const mismatch = result.incomplete.filter((v) => v.id === 'label-content-name-mismatch');
    return [...result.violations, ...mismatch].map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  }

  it('the player passes axe on a warm-up timer, a hold, a rest and the rep counter', async () => {
    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onExit={() => {}} />);
    const player = screen.getByRole('region', { name: 'Session player' });
    expect(await axeViolations(player)).toEqual([]);

    click('Next');
    click('Next');
    click('Start set 1');
    expect(await axeViolations(player)).toEqual([]);
    click('End set');
    click('Skip');
    expect(screen.getByRole('button', { name: '45 left', description: 'Rest' })).toBeTruthy();
    expect(await axeViolations(player)).toEqual([]);
    click('Skip rest');
    click('End set');
    click('Skip');
    click('Start set 1');
    expect(await axeViolations(player)).toEqual([]);
  });

  it("names the timer by exactly its visible text, and says what is timed", () => {
    render(<SessionPlayer session={demoSession()} layout="medium" wakeLock={wake} onExit={() => {}} />);
    const face = document.querySelector('.timer-face') as HTMLButtonElement;
    expect(face.getAttribute('aria-label')).toBeNull();
    expect(face.textContent).toBe('1:00 left');
    expect(screen.getByRole('button', { name: '1:00 left', description: 'March on the spot' })).toBe(face);
  });

  it('the rep counter shows reps left, counting down', () => {
    render(<SessionPlayer session={demoSession({ warmUp: [], coolDown: [], cards: [BRIDGE] })} layout="medium" wakeLock={wake} onExit={() => {}} />);
    click('Start set 1');
    const value = () => document.querySelector('.counter-value')!.textContent;
    expect(value()).toBe('12');
    expect(screen.getByText('reps left')).toBeTruthy();
    click('+1');
    click('+1');
    expect(value()).toBe('10');
  });
});

describe('a disabled control says why (AC4)', () => {
  it('Tell my parent is described by "Choose where it hurts first" until an area is chosen', () => {
    render(<PainReportForm onSend={async () => true} />);
    const send = screen.getByRole('button', { name: 'Tell my parent', description: 'Choose where it hurts first.' });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Choose where it hurts first.')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Knee' }));
    expect((send as HTMLButtonElement).disabled).toBe(false);
    expect(send.getAttribute('aria-describedby')).toBeNull();
    expect(screen.queryByText('Choose where it hurts first.')).toBeNull();
  });
});
