import { expect, it } from 'vitest';
import { MemoryPainStore } from '../src/pain.js';
import { painEvidenceSource } from '../src/painEvidence.js';

it('retains a restart hold after a pain report is cleared without copying its note', async () => {
  const store = new MemoryPainStore(), source = painEvidenceSource(store);
  const before = await source();
  await store.create({ id: 'pain-example', bodyArea: 'knee', note: 'private example', date: '2026-01-05', at: new Date('2026-01-05T12:00:00Z'), reportedBy: 'keeper', clearedAt: null, clearedOn: null, mistakeAt: null, mistakeId: null });
  const held = await source();
  expect(held.anyPain).toBe(true);
  expect(held.revision).not.toBe(before.revision);
  expect(JSON.stringify(held)).not.toContain('private example');
  await store.clearOpen(new Date('2026-01-06T12:00:00Z'), '2026-01-06');
  const cleared = await source();
  expect(cleared.anyPain).toBe(true);
  expect(cleared.revision).not.toBe(held.revision);
});
