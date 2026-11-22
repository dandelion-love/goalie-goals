import { createHash } from 'node:crypto';
import type { PainStore } from './pain.js';

/** Until a verified restart exists, any recorded pain requires a hold, even after clearing. */
export function painEvidenceSource(store: PainStore): () => Promise<{ revision: string; anyPain: boolean }> {
  return async () => {
    const reports = await store.list();
    const states = reports.map((r) => ({ id: r.id, at: r.at.toISOString(), clearedAt: r.clearedAt?.toISOString() ?? null, mistakeAt: r.mistakeAt?.toISOString() ?? null })).sort((a, b) => a.id.localeCompare(b.id));
    return { revision: createHash('sha256').update(JSON.stringify(states)).digest('hex'), anyPain: reports.length > 0 };
  };
}
