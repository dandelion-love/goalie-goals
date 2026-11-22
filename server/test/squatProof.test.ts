import { expect, it } from 'vitest';
import { FirestoreHistoryStore, MemoryHistoryStore, type HistoryRecord, type HistoryStore } from '../src/history.js';
import { FirestoreSquatProofStore, MemorySquatProofStore, SquatProofService, type SquatProofStore } from '../src/squatProof.js';
import { FakeFirestore } from './fakeFirestore.js';

async function record(store: HistoryStore, n: number) {
  const id = `record-proof-${n}`;
  const instanceId = `instance-proof-${n}`;
  const row: HistoryRecord = { id, instanceId, date: '2026-01-05', itemId: 'session-proof', itemVersion: 'session-v1', title: 'Example', outcome: 'done', at: new Date('2026-01-05T12:00:00Z'), cards: [{ cardId: 'squat-to-box', itemVersion: 'card-v1', name: 'Squat', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps: 15, perSide: false }, cueIds: [] }] };
  expect(await store.startInstance({ id: instanceId, itemId: row.itemId, itemVersion: row.itemVersion, cards: [{ cardId: 'squat-to-box', itemVersion: 'card-v1' }], recordId: null })).toBe(true);
  expect(await store.addBound(row, instanceId)).toBe(true);
  for (const set of [0, 1]) expect(await store.confirmSquatSet(id, 'card-v1', set, { actualReps: 15, clean: true }, null)).toBe(true);
  return id;
}

it.each(['memory', 'firestore'])('%s proof is exact, revocable and invalidated by later activity', async (kind) => {
  const db = new FakeFirestore();
  const history: HistoryStore = kind === 'memory' ? new MemoryHistoryStore() : new FirestoreHistoryStore(db);
  const proofs: SquatProofStore = kind === 'memory' ? new MemorySquatProofStore() : new FirestoreSquatProofStore(db);
  let pauseRevision = 'none';
  let approved = true;
  let now = new Date('2026-01-05T12:00:00Z');
  const service = new SquatProofService(history, proofs, async () => pauseRevision, async () => approved, () => now);
  const ids = [await record(history, 1), await record(history, 2)];
  const attestation = { orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true };
  expect(await service.status()).toBe('unknown');
  expect(await service.attest({ ...attestation, allDevicesSynced: false })).toBe(false);
  expect(await service.attest({ ...attestation, orderedRecordIds: [ids[0], ids[0]] })).toBe(false);
  expect(await service.attest(attestation)).toBe(true);
  expect(await service.status()).toBe('ready-for-parent');
  expect(await service.attest({ ...attestation, allDevicesSynced: false })).toBe(false);
  expect(await service.status()).toBe('unknown');
  expect(await service.attest(attestation)).toBe(true);
  approved = false;
  expect(await service.status()).toBe('unknown');
  approved = true;
  pauseRevision = 'new-pause';
  expect(await service.status()).toBe('unknown');
  expect(await service.attest({ ...attestation, growthClear: false })).toBe(true);
  expect(await service.status()).toBe('held');
  expect(await service.attest(attestation)).toBe(true);
  now = new Date('2026-01-11T00:00:00Z');
  expect(await service.status()).toBe('unknown');
  now = new Date('2026-01-05T12:00:00Z');
  await history.startInstance({ id: 'instance-open-3', itemId: 'session-proof', itemVersion: 'session-v1', cards: [], recordId: null });
  expect(await service.status()).toBe('unknown');
  await proofs.deleteAll();
  expect(await service.status()).toBe('unknown');
});
