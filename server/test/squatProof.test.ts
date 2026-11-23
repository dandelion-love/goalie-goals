import { expect, it } from 'vitest';
import { FirestoreHistoryStore, MemoryHistoryStore, type HistoryRecord, type HistoryStore } from '../src/history.js';
import { FirestoreSquatProofStore, MemorySquatProofStore, SquatProofService, type SquatProofStore } from '../src/squatProof.js';
import { FakeFirestore } from './fakeFirestore.js';
import { evidenceRevisionRef, guardedEvidenceMutation, readEvidenceRevision } from '../src/evidenceRevision.js';

it('invalidates a pending decision when a real set confirmation changes', async () => {
  const db = new FakeFirestore();
  const history = new FirestoreHistoryStore(db);
  const id = await record(history, 10);
  const revision = await db.runTransaction((tx) => readEvidenceRevision(tx, evidenceRevisionRef(db)));
  expect(await history.confirmSquatSet(id, 'card-v1', 0, { actualReps: 14, clean: false }, { actualReps: 15, clean: true, revision: 1 })).toBe(true);
  const target = db.collection('decisions').doc('pending');
  expect(await guardedEvidenceMutation(db, revision, async (tx) => { tx.set(target, { approved: true }); })).toEqual({ applied: false });
  expect((await target.get()).exists).toBe(false);
  const beforeLegacy = await db.runTransaction((tx) => readEvidenceRevision(tx, evidenceRevisionRef(db)));
  const legacy = { ...(await history.list())[0], id: 'legacy-proof-10' };
  delete legacy.instanceId;
  expect(await history.add(legacy)).toBe(true);
  expect(await guardedEvidenceMutation(db, beforeLegacy, async (tx) => { tx.set(target, { approved: true }); })).toEqual({ applied: false });
});

it('cannot publish a proof collected across a concurrent history change', async () => {
  const db = new FakeFirestore();
  const history = new FirestoreHistoryStore(db);
  const proofs = new FirestoreSquatProofStore(db);
  const attempt = await proofs.begin();
  await record(history, 11);
  const proof = { fingerprint: 'example', orderedRecordIds: [], pauseRevision: 'none', revision: attempt.revision, target: { reps: 15 }, safety: { pain: 'clear' as const, growth: 'clear' as const, breakRestart: 'clear' as const, stepDown: 'clear' as const } };
  expect(await proofs.finish(attempt, proof)).toBe(false);
  expect(await proofs.read()).toBeNull();
});

it.each(['memory', 'firestore'])('%s cannot clear a newer hold with an older attempt', async (kind) => {
  const proofs: SquatProofStore = kind === 'memory' ? new MemorySquatProofStore() : new FirestoreSquatProofStore(new FakeFirestore());
  const older = await proofs.begin();
  const newer = await proofs.begin(true);
  const clear = { fingerprint: 'example', orderedRecordIds: [], pauseRevision: 'none', revision: older.revision, target: { reps: 15 }, safety: { pain: 'clear' as const, growth: 'clear' as const, breakRestart: 'clear' as const, stepDown: 'clear' as const } };
  expect(await proofs.finish(older, clear)).toBe(false);
  expect(await proofs.held()).toBe(true);
  expect(await proofs.finish(newer, { ...clear, revision: newer.revision, safety: { ...clear.safety, growth: 'held' } })).toBe(true);
  expect(await proofs.held()).toBe(true);
});

async function record(store: HistoryStore, n: number, late = false) {
  const id = `record-proof-${n}`;
  const instanceId = `instance-proof-${n}`;
  const date = n % 2 ? '2026-01-03' : '2026-01-05';
  const row: HistoryRecord = { id, instanceId, date, itemId: 'session-proof', itemVersion: 'session-v1', title: 'Example', outcome: 'done', at: new Date(`${date}T12:00:00Z`), cards: [{ cardId: 'squat-to-box', itemVersion: 'card-v1', name: 'Squat', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps: 15, perSide: false }, cueIds: [] }] };
  expect(await store.startInstance({ id: instanceId, itemId: row.itemId, itemVersion: row.itemVersion, cards: [{ cardId: 'squat-to-box', itemVersion: 'card-v1' }], recordId: null, plannedDate: row.date, startedAt: `${row.date}T12:00:00Z` }, late)).toBe(true);
  expect(await store.addBound(row, instanceId)).toBe(true);
  for (const set of [0, 1]) expect(await store.confirmSquatSet(id, 'card-v1', set, { actualReps: 15, clean: true }, null)).toBe(true);
  return id;
}

it.each(['memory', 'firestore'])('%s proof is exact, revocable and invalidated by later activity', async (kind) => {
  const db = new FakeFirestore();
  const history: HistoryStore = kind === 'memory' ? new MemoryHistoryStore() : new FirestoreHistoryStore(db);
  const proofs: SquatProofStore = kind === 'memory' ? new MemorySquatProofStore() : new FirestoreSquatProofStore(db);
  let pauseRevision = 'none';
  let anyPain = false;
  let approved = true;
  let now = new Date('2026-01-05T12:00:00Z');
  const service = new SquatProofService(history, proofs, async () => ({ revision: pauseRevision, anyPain }), async () => approved, () => now);
  const ids = [await record(history, 1), await record(history, 2)];
  const legacy = { ...(await history.list())[0], id: 'legacy-record-1', date: '2025-12-01' };
  delete legacy.instanceId;
  expect(await history.add(legacy)).toBe(true);
  const attestation = { orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true };
  expect(await service.status()).toBe('unknown');
  expect(await service.attest({ ...attestation, allDevicesSynced: false })).toBe(false);
  expect(await service.attest({ ...attestation, orderedRecordIds: [ids[0], ids[0]] })).toBe(false);
  expect(await service.attest({ ...attestation, orderedRecordIds: [...ids].reverse() })).toBe(false);
  expect(await service.attest(attestation)).toBe(true);
  expect(await service.status()).toBe('ready-for-parent');
  const otherDose = new SquatProofService(history, proofs, async () => ({ revision: pauseRevision, anyPain }), async () => approved, () => now, { reps: 10, version: 'card-v1' });
  expect(await otherDose.status()).toBe('unknown');
  const saved = (await proofs.read())!;
  const first = await proofs.begin();
  const later = await proofs.begin();
  const latestProof = { ...saved, revision: later.revision };
  expect(await proofs.finish(later, latestProof)).toBe(true);
  expect(await proofs.finish(later, latestProof)).toBe(false);
  expect(await proofs.finish(first, saved)).toBe(false);
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
  expect(await service.attest({ ...attestation, allDevicesSynced: false })).toBe(false);
  expect(await service.status()).toBe('held');
  expect(await service.attest(attestation)).toBe(true);
  expect(await service.status()).toBe('held');
  // Reset deletes the household data; it is not a progression restart.
  await proofs.deleteAll();
  expect(await service.attest(attestation)).toBe(true);
  expect(await service.attest({ ...attestation, allDevicesSynced: false, stepDownClear: false })).toBe(false);
  expect(await service.status()).toBe('held');
  await proofs.deleteAll();
  expect(await service.attest(attestation)).toBe(true);
  now = new Date('2026-01-11T00:00:00Z');
  expect(await service.status()).toBe('unknown');
  now = new Date('2026-01-05T12:00:00Z');
  const ambiguous = { ...legacy, id: 'legacy-record-2', date: '2026-01-05' };
  expect(await history.add(ambiguous)).toBe(true);
  expect(await service.attest(attestation)).toBe(false);
  await history.startInstance({ id: 'instance-open-3', itemId: 'session-proof', itemVersion: 'session-v1', cards: [], recordId: null });
  expect(await service.status()).toBe('unknown');
  await proofs.deleteAll();
  expect(await service.status()).toBe('unknown');
  anyPain = true;
  expect(await service.status()).toBe('held');
  expect(await service.attest(attestation)).toBe(false);
  anyPain = false;
  expect(await service.status()).toBe('held');
});

it('does not infer occurrence order from a queued late start', async () => {
  const history = new MemoryHistoryStore();
  const proofs = new MemorySquatProofStore();
  const service = new SquatProofService(history, proofs, async () => ({ revision: 'none', anyPain: false }), async () => true, () => new Date('2026-01-05T12:00:00Z'));
  const ids = [await record(history, 1), await record(history, 2, true)];
  expect(await service.attest({ orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true })).toBe(false);
  expect(await service.status()).toBe('unknown');
});

it('checks other strength sessions without treating footwork as strength', async () => {
  const history = new MemoryHistoryStore(), proofs = new MemorySquatProofStore();
  const ids: string[] = [];
  for (const [index, date] of ['2026-01-05', '2026-01-06', '2026-01-07'].entries()) {
    const squat = index !== 1, id = `spacing-record-${index}`, instanceId = `spacing-instance-${index}`;
    const cardId = squat ? 'squat-to-box' : 'other-movement', version = squat ? 'squat-v1' : 'other-v1';
    const row: HistoryRecord = { id, instanceId, date, itemId: 'session', itemVersion: 'session-v1', title: 'Example', outcome: 'done', at: new Date(`${date}T12:00:00Z`), cards: [{ cardId, itemVersion: version, name: 'Example', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps: 15, perSide: false }, cueIds: [] }] };
    await history.startInstance({ id: instanceId, itemId: row.itemId, itemVersion: row.itemVersion, recordId: null, plannedDate: row.date, startedAt: `${row.date}T12:00:00Z`, cards: [{ cardId, itemVersion: version }] });
    await history.addBound(row, instanceId);
    if (squat) for (const set of [0, 1]) await history.confirmSquatSet(id, version, set, { actualReps: 15, clean: true }, null);
    ids.push(id);
  }
  let otherIsStrength = true;
  const service = new SquatProofService(history, proofs, async () => ({ revision: 'clear', anyPain: false }), async () => true, () => new Date('2026-01-07T12:00:00Z'), { reps: 15 }, (id) => id === 'squat-to-box' || otherIsStrength);
  const facts = { orderedRecordIds: ids, allDevicesSynced: true, growthClear: true, breakRestartClear: true, stepDownClear: true };
  expect(await service.attest(facts)).toBe(false);
  otherIsStrength = false;
  expect(await service.attest(facts)).toBe(true);
  expect(await service.status()).toBe('ready-for-parent');
});

it('cannot use local-date changes to make two simultaneous starts qualify', async () => {
  const history = new MemoryHistoryStore(), proofs = new MemorySquatProofStore();
  for (const [index, date] of ['2026-01-06', '2026-01-08'].entries()) {
    const id = `date-record-${index}`, instanceId = `date-instance-${index}`;
    const row: HistoryRecord = { id, instanceId, date, itemId: 'session', itemVersion: 'session-v1', title: 'Example', outcome: 'done', at: new Date('2026-01-07T10:00:00Z'), cards: [{ cardId: 'squat-to-box', itemVersion: 'card-v1', name: 'Squat', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps: 15, perSide: false }, cueIds: [] }] };
    await history.startInstance({ id: instanceId, itemId: row.itemId, itemVersion: row.itemVersion, recordId: null, plannedDate: date, startedAt: '2026-01-07T10:00:00.000Z', cards: [{ cardId: 'squat-to-box', itemVersion: 'card-v1' }] });
    expect(await history.addBound({ ...row, date: '2026-01-07' }, instanceId)).toBe(false);
    expect(await history.addBound(row, instanceId)).toBe(true);
    for (const set of [0, 1]) await history.confirmSquatSet(id, 'card-v1', set, { actualReps: 15, clean: true }, null);
  }
  const service = new SquatProofService(history, proofs, async () => ({ revision: 'clear', anyPain: false }), async () => true, () => new Date('2026-01-08T12:00:00Z'));
  expect(await service.reviewWindow()).toBeNull();
  expect(await service.status()).toBe('unknown');
});
