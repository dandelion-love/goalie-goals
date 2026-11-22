import { randomUUID } from 'node:crypto';
import type { FsDb, FsDocRef, FsTx } from './firestoreDb.js';

// A single document is the conflict point for evidence and decisions. This helper alone
// does not establish completeness: every relevant writer must participate before use.
export function evidenceRevisionRef(db: FsDb): FsDocRef {
  return db.collection('progressionEvidence').doc('revision');
}

export async function readEvidenceRevision(tx: FsTx, ref: FsDocRef): Promise<string | null> {
  const snap = await tx.get(ref);
  if (!snap.exists) return null;
  const value = snap.get('value');
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/.test(value)) throw new Error('Invalid evidence revision');
  return value;
}

/** Read before any writes; an unchanged transaction must not call this. */
export function bumpEvidenceRevision(tx: FsTx, ref: FsDocRef): string {
  const value = randomUUID();
  tx.set(ref, { value });
  return value;
}

/** Compare and mutate in one transaction, never after a separate eligibility read. */
export async function guardedEvidenceMutation<T>(
  db: FsDb,
  expected: string | null,
  change: (tx: FsTx) => Promise<T>,
): Promise<{ applied: false } | { applied: true; result: T }> {
  const ref = evidenceRevisionRef(db);
  return db.runTransaction(async (tx) => {
    const current = await readEvidenceRevision(tx, ref);
    if (current !== expected) return { applied: false } as const;
    const result = await change(tx);
    bumpEvidenceRevision(tx, ref);
    return { applied: true, result } as const;
  });
}
