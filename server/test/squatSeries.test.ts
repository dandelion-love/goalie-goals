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
  expect(await hasCompletedSquatSeries(history, steps, async () => true)).toBe(false);
});
