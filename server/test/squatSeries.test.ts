import { expect, it } from 'vitest';
import { MemoryHistoryStore, type HistoryRecord } from '../src/history.js';
import { hasCompletedSquatSeries } from '../src/squatSeries.js';

it('does not treat two top-dose sessions as proof of earlier dose transitions', async () => {
  const history = new MemoryHistoryStore();
  const steps = [10, 12, 14, 15].map((reps) => ({ reps, version: `version-${reps}` }));
  for (const n of [1, 2]) {
    const id = `series-record-${n}`, instanceId = `series-instance-${n}`;
    const record: HistoryRecord = { id, instanceId, date: '2026-01-05', itemId: 'session', itemVersion: 'session-v1', title: 'Example', outcome: 'done', at: new Date('2026-01-05T12:00:00Z'), cards: [{ cardId: 'squat-to-box', itemVersion: 'version-15', name: 'Squat', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps: 15, perSide: false }, cueIds: [] }] };
    await history.startInstance({ id: instanceId, itemId: record.itemId, itemVersion: record.itemVersion, cards: [{ cardId: 'squat-to-box', itemVersion: 'version-15' }], recordId: null });
    await history.addBound(record, instanceId);
    for (const set of [0, 1]) await history.confirmSquatSet(id, 'version-15', set, { actualReps: 15, clean: true }, null);
  }
  expect(await hasCompletedSquatSeries(history, steps, async () => true, async () => true)).toBe(false);
});

it('uses later clean pairs after an incomplete session and ignores older legacy history', async () => {
  const history = new MemoryHistoryStore();
  const steps = [10, 12, 14, 15].map((reps) => ({ reps, version: `version-${reps}` }));
  const row = (n: number, reps: number): HistoryRecord => ({ id: `window-record-${n}`, instanceId: `window-instance-${n}`, date: '2026-01-05', itemId: 'session', itemVersion: 'session-v1', title: 'Example', outcome: n === 1 ? 'stopped' : 'done', at: new Date('2026-01-05T12:00:00Z'), cards: [{ cardId: 'squat-to-box', itemVersion: `version-${reps}`, name: 'Squat', setsDone: n === 1 ? 1 : 2, setsPlanned: 2, dose: { kind: 'reps', reps, perSide: false }, cueIds: [] }] });
  const legacy = { ...row(99, 10), id: 'legacy-window-1', date: '2025-01-01' }; delete legacy.instanceId;
  await history.add(legacy);
  const doses = [10, 10, 10, 12, 12, 14, 14, 15, 15];
  for (let i = 0; i < doses.length; i++) {
    const record = row(i + 1, doses[i]);
    await history.startInstance({ id: record.instanceId!, itemId: record.itemId, itemVersion: record.itemVersion, cards: [{ cardId: 'squat-to-box', itemVersion: record.cards[0].itemVersion }], recordId: null });
    await history.addBound(record, record.instanceId!);
    if (i) for (const set of [0, 1]) await history.confirmSquatSet(record.id, record.cards[0].itemVersion, set, { actualReps: doses[i], clean: true }, null);
  }
  expect(await hasCompletedSquatSeries(history, steps, async () => true, async () => true)).toBe(true);
  expect(await hasCompletedSquatSeries(history, steps, async () => true, async () => false)).toBe(false);
  await history.add({ ...legacy, id: 'legacy-window-2', date: '2026-01-05' });
  expect(await hasCompletedSquatSeries(history, steps, async () => true, async () => true)).toBe(false);
});
