import { createHash } from 'node:crypto';
import type { HistoryRecord, HistoryStore, SessionInstance } from './history.js';
import type { FsDb } from './firestoreDb.js';
import { evaluateSquatReadiness, type ReadinessFacts, type SquatReadiness } from './squatReadiness.js';

/** No free text or client-provided eligibility. A parent confirms facts, not a promotion. */
export type SquatAttestation = { orderedRecordIds: string[]; allDevicesSynced: boolean; growthClear: boolean; breakRestartClear: boolean; stepDownClear: boolean };
type StoredProof = { fingerprint: string; orderedRecordIds: string[]; safety: ReadinessFacts['safety']; pauseRevision: string };
export interface SquatProofStore { read(): Promise<StoredProof | null>; write(proof: StoredProof): Promise<void>; deleteAll(): Promise<void> }
export class MemorySquatProofStore implements SquatProofStore {
  private proof: StoredProof | null = null;
  async read() { return this.proof && structuredClone(this.proof); }
  async write(proof: StoredProof) { this.proof = structuredClone(proof); }
  async deleteAll() { this.proof = null; }
}
export class FirestoreSquatProofStore implements SquatProofStore {
  constructor(private readonly db: FsDb) {}
  private ref() { return this.db.collection('squatReadiness').doc('parent-proof'); }
  async read() { return (await this.ref().get()).data() as StoredProof | null ?? null; }
  async write(proof: StoredProof) { const ref = this.ref(); await this.db.runTransaction(async (tx) => { tx.set(ref, { ...proof }); }); }
  async deleteAll() { await this.ref().delete(); }
}

type Snapshot = { records: HistoryRecord[]; instances: SessionInstance[] };
const digest = (snapshot: Snapshot) => createHash('sha256').update(JSON.stringify({
  records: [...snapshot.records].sort((a, b) => a.id.localeCompare(b.id)),
  instances: [...snapshot.instances].sort((a, b) => a.id.localeCompare(b.id)),
})).digest('hex');

/**
 * Parent attestation is bound to every known session and its confirmations. New starts,
 * finishes, edits or pain events invalidate it. Missing, open, unbound or malformed records
 * cannot establish completeness. The parent explicitly confirms the listed occurrence order
 * and that all devices are synced; an eventual late arrival invalidates the prior snapshot.
 */
export class SquatProofService {
  constructor(private readonly history: HistoryStore, private readonly proofs: SquatProofStore,
    private readonly pauseRevision: () => Promise<string>, private readonly cardApproved: (version: string) => Promise<boolean>,
    private readonly clock: () => Date = () => new Date()) {}

  private async complete(): Promise<Snapshot | null> {
    const snapshot = await this.history.readinessSnapshot();
    if (!snapshot || snapshot.instances.some((i) => !i.recordId)) return null;
    if (snapshot.records.length !== snapshot.instances.length || new Set(snapshot.instances.map((i) => i.recordId)).size !== snapshot.instances.length) return null;
    if (!(await Promise.all(snapshot.records.map((record) => this.history.isBound(record)))).every(Boolean)) return null;
    return snapshot;
  }

  async attest(input: SquatAttestation): Promise<boolean> {
    // An attempted re-attestation supersedes the prior one even when it cannot be accepted.
    await this.proofs.deleteAll();
    if (!input.allDevicesSynced || !Array.isArray(input.orderedRecordIds) || !input.orderedRecordIds.every((id) => typeof id === 'string') ||
        typeof input.growthClear !== 'boolean' || typeof input.breakRestartClear !== 'boolean' || typeof input.stepDownClear !== 'boolean') return false;
    const pauseRevision = await this.pauseRevision();
    const snapshot = await this.complete();
    if (!snapshot || input.orderedRecordIds.length !== snapshot.records.length || new Set(input.orderedRecordIds).size !== snapshot.records.length || input.orderedRecordIds.some((id) => !snapshot.records.some((r) => r.id === id))) return false;
    const state = (clear: boolean) => clear ? 'clear' as const : 'held' as const;
    if (await this.pauseRevision() !== pauseRevision) return false;
    const proof: StoredProof = { fingerprint: digest(snapshot), orderedRecordIds: [...input.orderedRecordIds], pauseRevision, safety: { pain: 'clear', growth: state(input.growthClear), breakRestart: state(input.breakRestartClear), stepDown: state(input.stepDownClear) } };
    await this.proofs.write(proof);
    return true;
  }

  async status(): Promise<SquatReadiness> {
    const proof = await this.proofs.read();
    const snapshot = await this.complete();
    if (!proof || !proof.safety || !snapshot || proof.fingerprint !== digest(snapshot) || proof.pauseRevision !== await this.pauseRevision()) return 'unknown';
    const records = new Map(snapshot.records.map((record) => [record.id, record]));
    if (!Array.isArray(proof.orderedRecordIds) || proof.orderedRecordIds.length !== records.size || new Set(proof.orderedRecordIds).size !== records.size || proof.orderedRecordIds.some((id) => !records.has(id))) return 'unknown';
    if (Object.values(proof.safety).includes('held')) return 'held';
    const ordered = proof.orderedRecordIds.map((id) => records.get(id)!);
    // A week off requires a restart. Civil dates may differ from UTC by a day, so do not
    // assert clear when the most recent date is close enough to make that boundary uncertain.
    const latest = ordered.map((record) => record.date).sort().at(-1);
    if (!latest) return 'unknown';
    const utcDay = Date.parse(`${this.clock().toISOString().slice(0, 10)}T00:00:00Z`);
    const latestDay = Date.parse(`${latest}T00:00:00Z`);
    const days = (utcDay - latestDay) / 86_400_000;
    if (!Number.isFinite(days) || days < -1 || days >= 6) return 'unknown';
    const versions = [...new Set(ordered.flatMap((record) => record.cards.filter((card) => card.cardId === 'squat-to-box').map((card) => card.itemVersion)))];
    const approved = await Promise.all(versions.map((version) => this.cardApproved(version)));
    const status = evaluateSquatReadiness(ordered, { orderedHistoryComplete: true, safety: proof.safety, approvedCardVersions: new Set(versions.filter((_, i) => approved[i])) });
    const latestSnapshot = await this.complete();
    if (!latestSnapshot || digest(latestSnapshot) !== proof.fingerprint || await this.pauseRevision() !== proof.pauseRevision) return 'unknown';
    return status;
  }
}
