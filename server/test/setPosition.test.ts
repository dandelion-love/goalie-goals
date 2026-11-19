// Story 109: the set-position card, the first goalkeeper exercise. Its dose, its place in the
// themed week (inside the training rules, with no session getting longer), and the approval gate
// that keeps it out of any session until the parent approves it.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { cardSeconds, doseText, loadContent } from '../src/content.js';
import { MemorySnapshotStore, TrainingService, cardItemId, sessionItemId, type SessionTemplate } from '../src/training.js';
import { STARTER_PACK as CURRENT_PACK, WeeklyPlan, checkPlanRules, layOut } from '../src/weeklyPlan.js';

// Fixtures: the invented cast and invented days; content is the repo's own exercise cards.
const SAM = { account: 'sam@example.com', role: 'parent' as const };
const CONTENT = loadContent();
// 2026-01-05 is a Monday; with the default days the third theme falls on Friday 2026-01-09.
const MON = '2026-01-05';
const FRI = '2026-01-09';

// Freeze the week from story 109 so its historical trade remains independently testable.
const QUICK = { ...CURRENT_PACK.find((s) => s.id === 'quick-feet-strong-arms')!, cardIds: ['set-position', 'lateral-shuffle', 'wall-push-up'] };
const STARTER_PACK = CURRENT_PACK.map((s) => s.id === QUICK.id ? QUICK : s);
/** The session as it was before story 109, for the trade and the approval gate. */
const QUICK_BEFORE: SessionTemplate = { ...QUICK, cardIds: ['lateral-shuffle', 'broad-jump-stick', 'wall-push-up'] };
const PACK_BEFORE = STARTER_PACK.map((s) => (s.id === QUICK.id ? QUICK_BEFORE : s));

let approvals: ApprovalService;
let snapshots: MemorySnapshotStore;

beforeEach(() => {
  approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
  snapshots = new MemorySnapshotStore();
});

const service = (pack: readonly SessionTemplate[]) =>
  new TrainingService({ approvals, content: CONTENT, plan: new WeeklyPlan(pack), snapshots });

async function approveAllPending() {
  for (const r of await approvals.pending()) await approvals.approve(r.id, SAM);
}

/** "About N minutes." as the parent's session request reads it. */
function minutesOf(training: TrainingService, template: SessionTemplate): number {
  const m = /^About (\d+) minutes\./.exec(training.currentSession(template)!.content.detail ?? '');
  return Number(m![1]);
}

describe('AC1, AC5: the card and its dose', () => {
  const source = CONTENT.cards.get('set-position')!;
  const card = source.card;
  // The fields the server does not load (equipment, the approved flag, the harder version).
  const raw = JSON.parse(readFileSync(new URL('../../content/exercises/set-position.json', import.meta.url), 'utf8'));

  it('is the ladder row, rung 1: reps, 2 x 10, rest 45 s, body only, held 3 s each rep', () => {
    expect(card.dose).toEqual({
      kind: 'reps',
      sets: 2,
      reps: 10,
      per_side: false,
      rest_s: 45,
      tempo: 'drop on the call, hold still for 3 s',
    });
    expect(doseText(card.dose)).toBe('2 sets of 10 reps, rest 45 s');
    expect(raw.needs).toEqual({ all: ['body only'], any: [] });
    expect(card.category).toBe('footwork');
    expect(card.timer).toBe('reps');
    expect(raw.approved).toBe(false);
  });

  it('names the goalkeeper need, the parent-checkable cues and the step down', () => {
    expect(card.why).toMatch(/Keepers set before every shot/);
    expect(card.parent_check).toEqual([
      'Feet shoulder width, knees bent, heels just up',
      'Hands up in front, palms facing you',
      'Head still for the whole 3 s',
    ]);
    expect(card.easier.variant).toMatch(/slower call.*5 s/i);
    expect(raw.harder.move_on_when).toMatch(/2 x 15, two sessions in a row\. Then the owner approves/);
  });

  it('has its figure and credit line', () => {
    expect(source.figureSvg).toMatch(/^<svg/);
    expect(source.credit).toBe('Figure: the goalie-goals contributors, CC BY-SA 4.0, drawn for this repo.');
  });
});

describe('AC3, AC5: its place in the themed week', () => {
  it('joins Quick feet, strong arms first, before the strength card, in trade for the broad jump', () => {
    expect(QUICK.cardIds).toEqual(['set-position', 'lateral-shuffle', 'wall-push-up']);
    expect(STARTER_PACK.flatMap((s) => s.cardIds)).not.toContain('broad-jump-stick');
    expect(STARTER_PACK.filter((s) => s.cardIds.includes('set-position'))).toHaveLength(1);
  });

  it('keeps every training rule, and refuses the card after strength work', () => {
    expect(checkPlanRules(layOut(STARTER_PACK, [1, 3, 5]), CONTENT)).toEqual([]);
    const late: SessionTemplate = { ...QUICK, cardIds: ['lateral-shuffle', 'wall-push-up', 'set-position'] };
    const pack = STARTER_PACK.map((s) => (s.id === QUICK.id ? late : s));
    expect(checkPlanRules(layOut(pack, [1, 3, 5]), CONTENT)).toContain(
      'Fri "Quick feet, strong arms": Set position comes after strength work; jumps go first.',
    );
  });

  it('adds no time: the trade takes out more than the card adds, and no session reads longer', () => {
    const seconds = (id: string) => cardSeconds(CONTENT.cards.get(id)!.card.dose);
    expect(seconds('set-position')).toBe(125);
    expect(seconds('broad-jump-stick')).toBe(216);

    const training = service(STARTER_PACK);
    const before = service(PACK_BEFORE);
    expect(minutesOf(before, QUICK_BEFORE)).toBe(14);
    expect(minutesOf(training, QUICK)).toBe(12);
    // Every session of the week, as the parent reads it: none longer than before story 109.
    const now = STARTER_PACK.map((t) => minutesOf(training, t));
    const then = PACK_BEFORE.map((t) => minutesOf(before, t));
    expect(now).toEqual([12, 15, 12]);
    now.forEach((m, i) => expect(m).toBeLessThanOrEqual(then[i]));
  });
});

describe('AC4, AC5: the approval gate', () => {
  it('arrives as a new-exercise request, and its session comes back for approval too', async () => {
    // The week as the parent had approved it before the card existed.
    await service(PACK_BEFORE).proposeFor(MON);
    await approveAllPending();

    const training = service(STARTER_PACK);
    await training.proposeFor(MON);
    const pending = await approvals.pending();
    expect(pending.map((r) => [r.kind, r.itemId])).toEqual([
      ['exercise', cardItemId('set-position')],
      ['plan', sessionItemId('quick-feet-strong-arms')],
    ]);
    expect(pending[0].content.title).toBe('Set position');
    expect(pending[0].content.detail).toBe(
      'Keepers set before every shot. A balanced stance lets you push off either way. ' +
        'Dose: 2 sets of 10 reps, rest 45 s.',
    );
    expect(pending[1].content.detail).toMatch(/^About 12 minutes\. .*Set position: 2 sets of 10 reps, rest 45 s\./);
  });

  it('stays out of every session until the parent approves both the card and the session', async () => {
    await service(PACK_BEFORE).proposeFor(MON);
    await approveAllPending();
    const training = service(STARTER_PACK);
    await training.proposeFor(MON);
    const [cardReq, sessionReq] = await approvals.pending();
    const ids = async () => {
      const t = await training.today(FRI);
      return { today: t.today?.cards.map((c) => c.id) ?? null, lastApproved: t.lastApproved?.cards.map((c) => c.id) ?? null };
    };

    // Waiting: the last approved version runs, without the card.
    expect(await ids()).toEqual({ today: null, lastApproved: ['lateral-shuffle', 'broad-jump-stick', 'wall-push-up'] });
    expect((await training.approvedCards()).map((c) => c.id)).not.toContain('set-position');

    // The card alone is not enough: the session that uses it waits for its own approval.
    await approvals.approve(cardReq.id, SAM);
    expect((await ids()).today).toBeNull();

    await approvals.approve(sessionReq.id, SAM);
    expect(await ids()).toEqual({ today: ['set-position', 'lateral-shuffle', 'wall-push-up'], lastApproved: null });
  });

  it('never plays when the parent declines the card', async () => {
    await service(PACK_BEFORE).proposeFor(MON);
    await approveAllPending();
    const training = service(STARTER_PACK);
    await training.proposeFor(MON);
    const [cardReq, sessionReq] = await approvals.pending();
    await approvals.decline(cardReq.id, SAM, 'Not yet');
    await approvals.approve(sessionReq.id, SAM);
    const t = await training.today(FRI);
    expect(t.today).toBeNull();
    expect(t.lastApproved!.cards.map((c) => c.id)).not.toContain('set-position');
    // A figure of an unapproved card is never served.
    expect(await training.figure('set-position', cardReq.itemVersion)).toBeNull();
  });
});
