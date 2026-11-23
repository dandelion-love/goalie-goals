import { createHash, randomUUID } from 'node:crypto';
import type { HistoryRecord, HistoryStore, SessionInstance } from './history.js';
import type { FsDb } from './firestoreDb.js';
import { evaluateSquatDoseReadiness, type ReadinessFacts, type SquatReadiness } from './squatReadiness.js';
import { bumpEvidenceRevision, evidenceRevisionRef, readEvidenceRevision } from './evidenceRevision.js';
import { onLocalDate } from './approvals.js';

/** No free text or client-provided eligibility. A parent confirms facts, not a promotion. */
export type SquatAttestation = { orderedRecordIds: string[]; allDevicesSynced: boolean; growthClear: boolean; breakRestartClear: boolean; stepDownClear: boolean };
type StoredProof = { fingerprint: string; orderedRecordIds: string[]; safety: ReadinessFacts['safety']; pauseRevision: string; revision: string | null; target: { reps: number; version?: string } };
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
    private readonly painHistory: () => Promise<{ revision: string; anyPain: boolean }>, private readonly cardApproved: (version: string) => Promise<boolean>,
    private readonly clock: () => Date = () => new Date(), private readonly target: { reps: number; version?: string } = { reps: 15 },
    private readonly strengthCard: (id: string, version: string) => boolean | null = (id) => id === 'squat-to-box' ? true : null) {}

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
    const firstDay = Date.parse(`${firstRecord.date}T00:00:00Z`);
    if (!Number.isFinite(firstDay)) return null;
    const monday = firstDay - ((new Date(firstDay).getUTCDay() + 6) % 7) * 86400000;
    const boundaryDate = new Date(monday).toISOString().slice(0, 10);
    const boundary = sequenced.filter((i) => i.sequence! <= first.sequence! && i.recordId && (records.get(i.recordId)?.date ?? '') >= boundaryDate).sort((a, b) => a.sequence! - b.sequence!)[0] ?? first;
    const window = sequenced.filter((i) => i.sequence! >= boundary.sequence!).sort((a, b) => a.sequence! - b.sequence!);
    if (window.some((i) => i.late !== false || !i.recordId || !records.has(i.recordId) || !i.plannedDate || !i.startedAt || records.get(i.recordId)?.date !== i.plannedDate || !onLocalDate(new Date(i.startedAt), i.plannedDate))) return null;
    const ordered = window.map((i) => records.get(i.recordId!)!);
    if (new Set(ordered.map((r) => r.id)).size !== ordered.length || !(await Promise.all(ordered.map((r) => this.history.isBound(r)))).every(Boolean)) return null;
    let previousStrength: number | null = null, previousStart: number | null = null;
    const strengthWeeks = new Map<number, number>();
    for (const [index, record] of ordered.entries()) {
      const kinds = record.cards.map((card) => this.strengthCard(card.cardId, card.itemVersion));
      if (kinds.some((kind) => kind === null)) return null;
      if (!kinds.includes(true)) continue;
      const day = Date.parse(`${record.date}T00:00:00Z`);
      const start = Date.parse(window[index].startedAt!);
      if (!Number.isFinite(day) || !Number.isFinite(start) || (previousStrength !== null && (day - previousStrength) / 86400000 < 2) || (previousStart !== null && start - previousStart < 86400000)) return null;
      previousStrength = day;
      previousStart = start;
      const week = day - ((new Date(day).getUTCDay() + 6) % 7) * 86400000;
      const count = (strengthWeeks.get(week) ?? 0) + 1;
      if (count > 3) return null;
      strengthWeeks.set(week, count);
    }
    const windowIds = new Set(ordered.map((r) => r.id));
    // A legacy/unbound record on or after the first day could fall between the pair.
    if (snapshot.records.some((r) => !windowIds.has(r.id) && !snapshot.instances.some((i) => i.recordId === r.id && i.sequence !== undefined && i.sequence < boundary.sequence!) && r.date >= boundaryDate)) return null;
    return { snapshot, ordered };
  }

  /** The parent can confirm this server order; it cannot be supplied or rearranged by a keeper. */
  async reviewWindow(): Promise<{ id: string; date: string; title: string }[] | null> {
    const window = await this.window();
    return window?.ordered.map((record) => ({ id: record.id, date: record.date, title: record.title })) ?? null;
  }

  async attest(input: SquatAttestation): Promise<boolean> {
    const pain = await this.painHistory();
    // An attempted re-attestation supersedes the prior one even when it cannot be accepted.
    const token = await this.proofs.begin(pain.anyPain || input.growthClear === false || input.breakRestartClear === false || input.stepDownClear === false);
    if (!input.allDevicesSynced || !Array.isArray(input.orderedRecordIds) || !input.orderedRecordIds.every((id) => typeof id === 'string') ||
        typeof input.growthClear !== 'boolean' || typeof input.breakRestartClear !== 'boolean' || typeof input.stepDownClear !== 'boolean') return false;
    const pauseRevision = pain.revision;
    const window = await this.window();
    if (!window || JSON.stringify(input.orderedRecordIds) !== JSON.stringify(window.ordered.map((r) => r.id))) return false;
    const state = (clear: boolean) => clear ? 'clear' as const : 'held' as const;
    const latestPain = await this.painHistory();
    if (latestPain.revision !== pauseRevision || latestPain.anyPain !== pain.anyPain || pain.anyPain) return false;
    const proof: StoredProof = { fingerprint: digest(window.snapshot), orderedRecordIds: [...input.orderedRecordIds], pauseRevision, revision: token.revision, target: { ...this.target }, safety: { pain: 'clear', growth: state(input.growthClear), breakRestart: state(input.breakRestartClear), stepDown: state(input.stepDownClear) } };
    return this.proofs.finish(token, proof);
  }

  async status(): Promise<SquatReadiness> {
    const pain = await this.painHistory();
    if (pain.anyPain) return 'held';
    if (await this.proofs.held()) return 'held';
    const proof = await this.proofs.read();
    const window = await this.window();
    if (!proof || !proof.safety || JSON.stringify(proof.target) !== JSON.stringify(this.target) || !window || proof.fingerprint !== digest(window.snapshot) || proof.pauseRevision !== pain.revision) return 'unknown';
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
    const status = evaluateSquatDoseReadiness(ordered, { orderedHistoryComplete: true, safety: proof.safety, approvedCardVersions: new Set(versions.filter((_, i) => approved[i])) }, this.target);
    const latestWindow = await this.window();
    const latestPain = await this.painHistory();
    if (latestPain.anyPain) return 'held';
    if (!latestWindow || digest(latestWindow.snapshot) !== proof.fingerprint || latestPain.revision !== proof.pauseRevision) return 'unknown';
    return status;
  }
}
