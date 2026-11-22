import { createHash, randomUUID } from 'node:crypto';
import type { HistoryRecord, HistoryStore, SessionInstance } from './history.js';
import type { FsDb } from './firestoreDb.js';
import { evaluateSquatReadiness, type ReadinessFacts, type SquatReadiness } from './squatReadiness.js';
import { bumpEvidenceRevision, evidenceRevisionRef, readEvidenceRevision } from './evidenceRevision.js';

/** No free text or client-provided eligibility. A parent confirms facts, not a promotion. */
export type SquatAttestation = { orderedRecordIds: string[]; allDevicesSynced: boolean; growthClear: boolean; breakRestartClear: boolean; stepDownClear: boolean };
type StoredProof = { fingerprint: string; orderedRecordIds: string[]; safety: ReadinessFacts['safety']; pauseRevision: string; revision: string | null };
type ProofAttempt = { token: string; revision: string | null };
export interface SquatProofStore { read(): Promise<StoredProof | null>; held(): Promise<boolean>; begin(hold?: boolean): Promise<ProofAttempt>; finish(attempt: ProofAttempt, proof: StoredProof): Promise<boolean>; deleteAll(): Promise<void> }
export class MemorySquatProofStore implements SquatProofStore {
  private proof: StoredProof | null = null;
  private token: string | null = null;
  private hold = false;
  async read() { return this.proof && structuredClone(this.proof); }
  async held() { return this.hold; }
  async begin(hold = false) { this.token = randomUUID(); this.proof = null; this.hold ||= hold; return { token: this.token, revision: null }; }
  async finish(attempt: ProofAttempt, proof: StoredProof) { if (this.token !== attempt.token || this.proof !== null || proof.revision !== attempt.revision) return false; this.proof = structuredClone(proof); this.hold ||= Object.values(proof.safety).includes('held'); return true; }
  async deleteAll() { this.token = null; this.proof = null; this.hold = false; }
}
export class FirestoreSquatProofStore implements SquatProofStore {
  constructor(private readonly db: FsDb) {}
  private ref() { return this.db.collection('squatReadiness').doc('parent-proof'); }
  async read() { const data = (await this.ref().get()).data() as { proof?: StoredProof | null } | undefined; return data?.proof ?? null; }
  async held() { const snap = await this.ref().get(); const hold = snap.get('hold'); if (hold !== undefined && typeof hold !== 'boolean') throw new Error('Invalid readiness hold'); return hold === true; }
  async begin(newHold = false): Promise<ProofAttempt> {
    const ref = this.ref(), token = randomUUID();
    return this.db.runTransaction(async (tx) => {
      const revisionRef = evidenceRevisionRef(this.db);
      await readEvidenceRevision(tx, revisionRef);
      const hold = (await tx.get(ref)).get('hold');
      if (hold !== undefined && typeof hold !== 'boolean') throw new Error('Invalid readiness hold');
      const revision = bumpEvidenceRevision(tx, revisionRef);
      tx.set(ref, { token, proof: null, hold: hold === true || newHold });
      return { token, revision };
    });
  }
  async finish(attempt: ProofAttempt, proof: StoredProof) {
    const ref = this.ref();
    return this.db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      const revision = await readEvidenceRevision(tx, evidenceRevisionRef(this.db));
      if (current.get('token') !== attempt.token || current.get('proof') !== null || revision !== attempt.revision || proof.revision !== attempt.revision) return false;
      const hold = current.get('hold');
      if (typeof hold !== 'boolean') throw new Error('Invalid readiness hold');
      // Clearing a warning alone does not establish the required step-down and restart.
      // No verified restart is implemented yet, so a hold remains closed to promotion.
      tx.set(ref, { token: attempt.token, proof, hold: hold || Object.values(proof.safety).includes('held') });
      return true;
    });
  }
  async deleteAll() { await this.ref().delete(); }
}

type Snapshot = { records: HistoryRecord[]; instances: SessionInstance[] };
const digest = (snapshot: Snapshot) => createHash('sha256').update(JSON.stringify({
  records: [...snapshot.records].sort((a, b) => a.id.localeCompare(b.id)),
  instances: [...snapshot.instances].sort((a, b) => a.id.localeCompare(b.id)),
})).digest('hex');

/**
 * Parent attestation is bound to the server's ordered recent window and its confirmations.
 * New starts, finishes, edits or pain events invalidate it. The parent confirms the server's
 * order and that all devices are synced; they cannot reorder starts to create a clean pair.
 */
export class SquatProofService {
  constructor(private readonly history: HistoryStore, private readonly proofs: SquatProofStore,
    private readonly pauseRevision: () => Promise<string>, private readonly cardApproved: (version: string) => Promise<boolean>,
    private readonly clock: () => Date = () => new Date()) {}

  private async window(): Promise<{ snapshot: Snapshot; ordered: HistoryRecord[] } | null> {
    const snapshot = await this.history.readinessSnapshot();
    if (!snapshot) return null;
    const sequenced = snapshot.instances.filter((i) => i.sequence !== undefined);
    if (new Set(sequenced.map((i) => i.sequence)).size !== sequenced.length) return null;
    const records = new Map(snapshot.records.map((r) => [r.id, r]));
    if (records.size !== snapshot.records.length || snapshot.instances.some((i) => i.sequence === undefined && !i.recordId)) return null;
    const squat = sequenced.filter((i) => i.recordId && records.get(i.recordId)?.cards.some((card) => card.cardId === 'squat-to-box')).sort((a, b) => a.sequence! - b.sequence!);
    if (!squat.length) return null;
    const first = squat[Math.max(0, squat.length - 2)];
    const firstRecord = records.get(first.recordId!)!;
    const window = sequenced.filter((i) => i.sequence! >= first.sequence!).sort((a, b) => a.sequence! - b.sequence!);
    if (window.some((i) => i.late !== false || !i.recordId || !records.has(i.recordId))) return null;
    const ordered = window.map((i) => records.get(i.recordId!)!);
    if (new Set(ordered.map((r) => r.id)).size !== ordered.length || !(await Promise.all(ordered.map((r) => this.history.isBound(r)))).every(Boolean)) return null;
    const windowIds = new Set(ordered.map((r) => r.id));
    // A legacy/unbound record on or after the first day could fall between the pair.
    if (snapshot.records.some((r) => !windowIds.has(r.id) && !snapshot.instances.some((i) => i.recordId === r.id && i.sequence !== undefined && i.sequence < first.sequence!) && r.date >= firstRecord.date)) return null;
    return { snapshot, ordered };
  }

  async attest(input: SquatAttestation): Promise<boolean> {
    // An attempted re-attestation supersedes the prior one even when it cannot be accepted.
    const token = await this.proofs.begin(input.growthClear === false || input.breakRestartClear === false || input.stepDownClear === false);
    if (!input.allDevicesSynced || !Array.isArray(input.orderedRecordIds) || !input.orderedRecordIds.every((id) => typeof id === 'string') ||
        typeof input.growthClear !== 'boolean' || typeof input.breakRestartClear !== 'boolean' || typeof input.stepDownClear !== 'boolean') return false;
    const pauseRevision = await this.pauseRevision();
    const window = await this.window();
    if (!window || JSON.stringify(input.orderedRecordIds) !== JSON.stringify(window.ordered.map((r) => r.id))) return false;
    const state = (clear: boolean) => clear ? 'clear' as const : 'held' as const;
    if (await this.pauseRevision() !== pauseRevision) return false;
    const proof: StoredProof = { fingerprint: digest(window.snapshot), orderedRecordIds: [...input.orderedRecordIds], pauseRevision, revision: token.revision, safety: { pain: 'clear', growth: state(input.growthClear), breakRestart: state(input.breakRestartClear), stepDown: state(input.stepDownClear) } };
    return this.proofs.finish(token, proof);
  }

  async status(): Promise<SquatReadiness> {
    if (await this.proofs.held()) return 'held';
    const proof = await this.proofs.read();
    const window = await this.window();
    if (!proof || !proof.safety || !window || proof.fingerprint !== digest(window.snapshot) || proof.pauseRevision !== await this.pauseRevision()) return 'unknown';
    if (JSON.stringify(proof.orderedRecordIds) !== JSON.stringify(window.ordered.map((r) => r.id))) return 'unknown';
    if (Object.values(proof.safety).includes('held')) return 'held';
    const ordered = window.ordered;
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
    const latestWindow = await this.window();
    if (!latestWindow || digest(latestWindow.snapshot) !== proof.fingerprint || await this.pauseRevision() !== proof.pauseRevision) return 'unknown';
    return status;
  }
}
