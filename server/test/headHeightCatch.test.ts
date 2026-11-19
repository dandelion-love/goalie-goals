import { beforeEach, describe, expect, it } from 'vitest';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent } from '../src/content.js';
import { MemorySnapshotStore, TrainingService, cardItemId, sessionItemId, type SessionTemplate } from '../src/training.js';
import { STARTER_PACK, WeeklyPlan, checkPlanRules, layOut } from '../src/weeklyPlan.js';
import { MemoryEquipmentStore } from '../src/equipment.js';

const content = loadContent();
const parent = { account: 'sam@example.com', role: 'parent' as const };
const quick = STARTER_PACK.find((s) => s.id === 'quick-feet-strong-arms')!;
const old: SessionTemplate = { ...quick, cardIds: ['set-position', 'lateral-shuffle', 'wall-chest-pass'] };
const previous = STARTER_PACK.map((s) => s.id === quick.id ? old : s);
let approvals: ApprovalService;
let snapshots: MemorySnapshotStore;
let equipment: MemoryEquipmentStore;
beforeEach(async () => {
  approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
  snapshots = new MemorySnapshotStore();
  equipment = new MemoryEquipmentStore();
  await equipment.write('available');
});
const service = (pack: readonly SessionTemplate[]) => new TrainingService({ approvals, content, plan: new WeeklyPlan(pack), snapshots, equipment });

describe('head-height catch', () => {
  it('uses the ladder dose and belongs to one rules-compliant session', () => {
    const card = content.cards.get('head-height-catch')!.card;
    expect(card.dose).toMatchObject({ kind: 'reps', sets: 2, reps: 10, per_side: false, rest_s: 60 });
    expect(card.parent_check).toHaveLength(3);
    expect(card.needs?.all).toContain('other:goalkeeper-gloves');
    expect(quick.cardIds).toEqual(['set-position', 'head-height-catch', 'wall-chest-pass']);
    expect(STARTER_PACK.filter((s) => s.cardIds.includes(card.id))).toHaveLength(1);
    expect(checkPlanRules(layOut(STARTER_PACK, [1, 3, 5]), content)).toEqual([]);
  });

  it('requires both exercise and changed session approval before the new catch can play', async () => {
    await service(previous).proposeFor('2026-01-05');
    for (const request of await approvals.pending()) await approvals.approve(request.id, parent);
    const training = service(STARTER_PACK);
    await training.proposeFor('2026-01-05');
    const pending = await approvals.pending();
    const card = pending.find((r) => r.itemId === cardItemId('head-height-catch'))!;
    const session = pending.find((r) => r.itemId === sessionItemId(quick.id))!;
    expect(card).toBeDefined();
    expect(session).toBeDefined();
    const today = () => training.today('2026-01-09');
    expect((await today()).today).toBeNull();
    expect((await today()).lastApproved!.cards.map((c) => c.id)).not.toContain('head-height-catch');
    await approvals.approve(card.id, parent);
    expect((await today()).today).toBeNull();
    await approvals.approve(session.id, parent);
    expect((await today()).today!.cards.map((c) => c.id)).toContain('head-height-catch');
    await equipment.write('unavailable');
    expect((await today()).today).toBeNull();
    expect((await today()).lastApproved).toBeNull();
    expect(await training.markStarted(session.itemId, session.itemVersion)).toBe(false);
    await equipment.write('unknown');
    expect((await today()).today).toBeNull();
  });
  it('does not play the new catch if the parent declines it', async () => {
    await service(previous).proposeFor('2026-01-05');
    for (const request of await approvals.pending()) await approvals.approve(request.id, parent);
    const training = service(STARTER_PACK);
    await training.proposeFor('2026-01-05');
    const pending = await approvals.pending();
    const card = pending.find((r) => r.itemId === cardItemId('head-height-catch'))!;
    const session = pending.find((r) => r.itemId === sessionItemId(quick.id))!;
    await approvals.decline(card.id, parent, 'Not yet');
    await approvals.approve(session.id, parent);
    const today = await training.today('2026-01-09');
    expect(today.today).toBeNull();
    expect(today.lastApproved!.cards.map((c) => c.id)).not.toContain('head-height-catch');
  });

});
