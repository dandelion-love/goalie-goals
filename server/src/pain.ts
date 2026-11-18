// "Something hurts": a pain report pauses all training for the keeper until a parent clears it
// (parent-approval Decision, section 7; training-rules Decision, warning signs).
//
// The report is stored in the app's data only. Nothing here logs it, and the audit log keeps
// the roles and the body area, never the note. The store sits behind an interface, as approvals
// do: in memory for tests and the demo, the household's Firestore data in production (story 118).

import type { AuditLog } from './approvals.js';
import { asDate, asObject, type FsDb } from './firestoreDb.js';
import type { Notifier } from './notifier.js';
import type { PauseSource } from './progress.js';
import { isRole, type Role } from './roles.js';

/** A short fixed list: one tap, no free-text body area. */
export const BODY_AREAS = [
  'head',
  'neck',
  'chest',
  'back',
  'shoulder_arm',
  'wrist_hand',
  'hip',
  'knee',
  'lower_leg',
  'ankle_foot',
  'other',
  'unsure',
] as const;

export type BodyArea = (typeof BODY_AREAS)[number];

export const BODY_AREA_LABEL: Record<BodyArea, string> = {
  head: 'Head',
  neck: 'Neck',
  chest: 'Chest',
  back: 'Back',
  shoulder_arm: 'Shoulder or arm',
  wrist_hand: 'Wrist or hand',
  hip: 'Hip or groin',
  knee: 'Knee',
  lower_leg: 'Shin or calf',
  ankle_foot: 'Ankle or foot',
  other: 'Somewhere else',
  unsure: 'Not said',
};

export function isBodyArea(value: unknown): value is BodyArea {
  return typeof value === 'string' && (BODY_AREAS as readonly string[]).includes(value);
}

export const NOTE_MAX = 500;

export interface PainReport {
  /** Made by the device, so a report sent again from the offline outbox is stored once. */
  id: string;
  bodyArea: BodyArea;
  note: string | null;
  /** The keeper's local date of the report. */
  date: string;
  at: Date;
  reportedBy: Role;
  clearedAt: Date | null;
  /** The parent's local date of the clear; the pause covers `date` to `clearedOn`. */
  clearedOn: string | null;
  /**
   * When the keeper marked the report "Tapped by mistake" (story 104). A note for the parent
   * only: the pause holds until the parent clears it.
   */
  mistakeAt: Date | null;
  /** Made by the device, so a note sent again from the offline outbox is stored once. */
  mistakeId: string | null;
}

export interface PainStore {
  /** Store a new report; returns the stored one, or the existing one with the same id. */
  create(report: PainReport): Promise<PainReport>;
  list(): Promise<PainReport[]>;
  /** Mark every open report cleared; returns the ones it cleared. */
  clearOpen(at: Date, on: string): Promise<PainReport[]>;
  /** Mark one open report as tapped by mistake; null when it is not open or already marked. */
  markMistake(reportId: string, mistakeId: string, at: Date): Promise<PainReport | null>;
}

function copy(r: PainReport): PainReport {
  return {
    ...r,
    at: new Date(r.at),
    clearedAt: r.clearedAt ? new Date(r.clearedAt) : null,
    mistakeAt: r.mistakeAt ? new Date(r.mistakeAt) : null,
  };
}

export class MemoryPainStore implements PainStore {
  private readonly reports = new Map<string, PainReport>();

  async create(report: PainReport): Promise<PainReport> {
    const existing = this.reports.get(report.id);
    if (existing) return copy(existing);
    this.reports.set(report.id, copy(report));
    return copy(report);
  }

  async list(): Promise<PainReport[]> {
    return [...this.reports.values()].sort((a, b) => a.at.getTime() - b.at.getTime()).map(copy);
  }

  /** Dev-only demo reset (src/demo.ts); a parent clears a pause with `clearOpen`, never this. */
  clear(): void {
    this.reports.clear();
  }

  /** Delete every report with the household, or when the parent starts fresh (story 121). */
  async deleteAll(): Promise<void> {
    this.reports.clear();
  }

  async clearOpen(at: Date, on: string): Promise<PainReport[]> {
    const cleared: PainReport[] = [];
    for (const r of this.reports.values()) {
      if (r.clearedAt) continue;
      r.clearedAt = new Date(at);
      r.clearedOn = on;
      cleared.push(copy(r));
    }
    return cleared;
  }

  async markMistake(reportId: string, mistakeId: string, at: Date): Promise<PainReport | null> {
    const r = this.reports.get(reportId);
    if (!r || r.clearedAt || r.mistakeAt) return null;
    r.mistakeAt = new Date(at);
    r.mistakeId = mistakeId;
    return copy(r);
  }
}

/**
 * Pain reports in Firestore (story 118): the household's one document, `painReports/household`,
 * holds every report, as the training days' document holds their changes. Each write is one
 * transaction on that document, so a report sent twice is kept once, one clear closes every open
 * report, and a pause takes one mistake note, even with two writers. A report is a few hundred
 * bytes, so the document holds well over a thousand of them.
 */
export const PAIN_COLLECTION = 'painReports';
export const PAIN_DOC = 'household';

/** A stored report back to a report; null (left out) when it is not well formed. */
export function readPainReport(value: unknown): PainReport | null {
  const r = asObject(value);
  if (!r || typeof r.id !== 'string' || !isBodyArea(r.bodyArea) || typeof r.date !== 'string' || !isRole(r.reportedBy)) {
    return null;
  }
  const at = asDate(r.at);
  const clearedAt = r.clearedAt == null ? null : asDate(r.clearedAt);
  const mistakeAt = r.mistakeAt == null ? null : asDate(r.mistakeAt);
  // A clear or a note that cannot be read is never dropped: the report is left out instead, and
  // the store refuses to answer (see `reports`), so an open pause is never lost.
  if (!at || (r.clearedAt != null && !clearedAt) || (r.mistakeAt != null && !mistakeAt)) return null;
  return {
    id: r.id,
    bodyArea: r.bodyArea,
    note: typeof r.note === 'string' ? r.note : null,
    date: r.date,
    at,
    reportedBy: r.reportedBy,
    clearedAt,
    clearedOn: typeof r.clearedOn === 'string' ? r.clearedOn : null,
    mistakeAt,
    mistakeId: typeof r.mistakeId === 'string' ? r.mistakeId : null,
  };
}

function painData(r: PainReport): Record<string, unknown> {
  return {
    id: r.id,
    bodyArea: r.bodyArea,
    note: r.note,
    date: r.date,
    at: new Date(r.at),
    reportedBy: r.reportedBy,
    clearedAt: r.clearedAt ? new Date(r.clearedAt) : null,
    clearedOn: r.clearedOn,
    mistakeAt: r.mistakeAt ? new Date(r.mistakeAt) : null,
    mistakeId: r.mistakeId,
  };
}

export class FirestorePainStore implements PainStore {
  constructor(
    private readonly db: FsDb,
    private readonly collection = PAIN_COLLECTION,
  ) {}

  private ref() {
    return this.db.collection(this.collection).doc(PAIN_DOC);
  }

  /**
   * The reports in a snapshot. A stored report that cannot be read is an error, never a gap: a
   * pause the app could not read must not show the keeper as free to train.
   */
  private reports(snap: { exists: boolean; data(): unknown }): PainReport[] {
    if (!snap.exists) return [];
    const list = asObject(snap.data())?.reports;
    if (!Array.isArray(list)) throw new Error('The pain reports could not be read.');
    const reports = list.map(readPainReport);
    if (reports.some((r) => r === null)) throw new Error('A pain report could not be read.');
    return reports as PainReport[];
  }

  private async update<T>(change: (reports: PainReport[]) => { reports?: PainReport[]; result: T }): Promise<T> {
    const ref = this.ref();
    return this.db.runTransaction(async (tx) => {
      const { reports, result } = change(this.reports(await tx.get(ref)));
      if (reports) tx.set(ref, { reports: reports.map(painData) });
      return result;
    });
  }

  async create(report: PainReport): Promise<PainReport> {
    return this.update((reports) => {
      const existing = reports.find((r) => r.id === report.id);
      if (existing) return { result: copy(existing) };
      return { reports: [...reports, copy(report)], result: copy(report) };
    });
  }

  async list(): Promise<PainReport[]> {
    return this.reports(await this.ref().get()).sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  async clearOpen(at: Date, on: string): Promise<PainReport[]> {
    return this.update((reports) => {
      const cleared: PainReport[] = [];
      const next = reports.map((r) => {
        if (r.clearedAt) return r;
        const done = { ...r, clearedAt: new Date(at), clearedOn: on };
        cleared.push(copy(done));
        return done;
      });
      return { reports: cleared.length ? next : undefined, result: cleared };
    });
  }

  async markMistake(reportId: string, mistakeId: string, at: Date): Promise<PainReport | null> {
    return this.update((reports) => {
      const r = reports.find((x) => x.id === reportId);
      // One note per pause: none while any open report already has one.
      if (!r || r.clearedAt || r.mistakeAt || reports.some((x) => !x.clearedAt && x.mistakeAt)) return { result: null };
      const marked = { ...r, mistakeAt: new Date(at), mistakeId };
      return { reports: reports.map((x) => (x.id === reportId ? marked : x)), result: copy(marked) };
    });
  }

  /** Delete the household's reports. A parent clears a pause with `clearOpen`, never this. */
  async deleteAll(): Promise<void> {
    await this.ref().delete();
  }
}

export class PainError extends Error {
  constructor(
    readonly code: 'forbidden' | 'invalid' | 'not_paused' | 'already_marked',
    message: string,
  ) {
    super(message);
  }
}

export interface PainServiceDeps {
  store: PainStore;
  /** The same append-only log as approvals, so both roles see one history. */
  audit: AuditLog;
  notifier: Notifier;
  clock?: () => Date;
}

export interface ReportInput {
  id: string;
  bodyArea: BodyArea;
  note?: string | null;
  date: string;
}

export interface PauseStatus {
  paused: boolean;
  since: string | null;
  open: PainReport[];
}

const PAUSE_REF = 'training-pause';
/** The audit item of a "Tapped by mistake" note and its refusals (story 104). */
export const MISTAKE_REF = 'training-pause-mistake';

export interface MistakeInput {
  /** Made by the device: the same note sent again is stored once. */
  id: string;
  /** The open report the note is about (the device's pause). */
  reportId: string;
}

const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export class PainService implements PauseSource {
  private readonly store: PainStore;
  private readonly audit: AuditLog;
  private readonly notifier: Notifier;
  private readonly clock: () => Date;

  constructor({ store, audit, notifier, clock = () => new Date() }: PainServiceDeps) {
    this.store = store;
    this.audit = audit;
    this.notifier = notifier;
    this.clock = clock;
  }

  /** Either role may report pain, at any time, with no gate. */
  async report(actor: { account: string; role: Role }, input: ReportInput): Promise<PainReport> {
    if (!ID_RE.test(input.id) || !isBodyArea(input.bodyArea)) {
      throw new PainError('invalid', 'A report needs an id and a body area from the list.');
    }
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, NOTE_MAX) || null : null;
    const before = (await this.store.list()).find((r) => r.id === input.id);
    const stored = await this.store.create({
      id: input.id,
      bodyArea: input.bodyArea,
      note,
      date: input.date,
      at: this.clock(),
      reportedBy: actor.role,
      clearedAt: null,
      clearedOn: null,
      mistakeAt: null,
      mistakeId: null,
    });
    if (!before) {
      await this.audit.append({
        at: this.clock(),
        action: 'paused',
        actorRole: actor.role,
        actor: actor.account,
        requestId: stored.id,
        kind: 'pause',
        itemId: PAUSE_REF,
        itemVersion: '',
        // The body area only: the note never leaves the report.
        title: `something hurts (${BODY_AREA_LABEL[stored.bodyArea].toLowerCase()})`,
        reason: null,
      });
      await this.notifier.notify({ to: 'parent', ref: PAUSE_REF, title: 'Training paused: something hurts' });
    }
    return stored;
  }

  async status(): Promise<PauseStatus> {
    const open = (await this.store.list()).filter((r) => !r.clearedAt);
    return { paused: open.length > 0, since: open.length ? open.map((r) => r.date).sort()[0] : null, open };
  }

  async isPaused(): Promise<boolean> {
    return (await this.status()).paused;
  }

  /** Only a parent clears the pause. A keeper's attempt is refused and logged. */
  async clear(actor: { account: string; role: Role }, date: string): Promise<PainReport[]> {
    const status = await this.status();
    if (actor.role !== 'parent') {
      await this.audit.append({
        at: this.clock(),
        action: 'refused',
        actorRole: actor.role,
        actor: actor.account,
        requestId: status.open[0]?.id ?? PAUSE_REF,
        kind: 'pause',
        itemId: PAUSE_REF,
        itemVersion: '',
        title: 'the training pause',
        reason: `The ${actor.role} may not clear a pause`,
      });
      throw new PainError('forbidden', 'Only a parent can clear the pause.');
    }
    if (!status.paused) throw new PainError('not_paused', 'Training is not paused.');
    const cleared = await this.store.clearOpen(this.clock(), date);
    await this.audit.append({
      at: this.clock(),
      action: 'cleared',
      actorRole: actor.role,
      actor: actor.account,
      requestId: cleared[0].id,
      kind: 'pause',
      itemId: PAUSE_REF,
      itemVersion: '',
      title: 'the training pause',
      reason: null,
    });
    await this.notifier.withdraw(PAUSE_REF);
    return cleared;
  }

  /**
   * The keeper says "Something hurts" was tapped by mistake (story 104). It is a note for the
   * parent, never a clear: the pause holds until the parent clears it, and nothing clears it on
   * its own. Only the keeper may send it, only while that report's pause is open, and once per
   * pause; anything else is refused and logged. It carries no text: the role and the time only.
   */
  async markMistake(actor: { account: string; role: Role }, input: MistakeInput): Promise<PainReport> {
    const all = await this.store.list();
    const requestId = all.find((r) => r.id === input.reportId)?.id ?? PAUSE_REF;
    const refuse = async (code: PainError['code'], reason: string): Promise<never> => {
      await this.audit.append({
        at: this.clock(),
        action: 'refused',
        actorRole: actor.role,
        actor: actor.account,
        requestId,
        kind: 'pause',
        itemId: MISTAKE_REF,
        itemVersion: '',
        title: 'a mistake note',
        reason,
      });
      throw new PainError(code, reason);
    };
    if (actor.role !== 'keeper') return refuse('forbidden', `The ${actor.role} may not send a mistake note`);
    if (!ID_RE.test(input.id) || !ID_RE.test(input.reportId)) return refuse('invalid', 'A mistake note needs an id and a report');
    // The same note again (a resend from the offline outbox): stored once, logged once.
    const same = all.find((r) => r.mistakeId === input.id);
    if (same) return same;
    const open = all.filter((r) => !r.clearedAt);
    const target = open.find((r) => r.id === input.reportId);
    if (!target) return refuse('not_paused', 'No open pause for this note');
    if (open.some((r) => r.mistakeAt)) return refuse('already_marked', 'This pause already has a mistake note');
    const marked = await this.store.markMistake(target.id, input.id, this.clock());
    if (!marked) return refuse('already_marked', 'This pause already has a mistake note');
    await this.audit.append({
      at: this.clock(),
      action: 'marked',
      actorRole: actor.role,
      actor: actor.account,
      requestId: marked.id,
      kind: 'pause',
      itemId: MISTAKE_REF,
      itemVersion: '',
      // The body area only, as for the report.
      title: `something hurts (${BODY_AREA_LABEL[marked.bodyArea].toLowerCase()})`,
      reason: null,
    });
    // A fresh nudge: the parent checks in, then clears. The clear withdraws it.
    await this.notifier.notify({ to: 'parent', ref: PAUSE_REF, title: 'Training paused: marked as a mistake' });
    return marked;
  }

  /**
   * Tell the parent again about an open pause (startup, story 118): the in-app inbox and badge
   * are in memory, the pause is in the store, so a restart never leaves it silent.
   */
  async renotify(): Promise<void> {
    const { open } = await this.status();
    if (!open.length) return;
    const marked = open.some((r) => r.mistakeAt);
    await this.notifier.notify({
      to: 'parent',
      ref: PAUSE_REF,
      title: marked ? 'Training paused: marked as a mistake' : 'Training paused: something hurts',
    });
  }

  /** For streaks: each report pauses from its date to the clear date, both included. */
  async spans(): Promise<{ from: string; to: string | null }[]> {
    return (await this.store.list()).map((r) => ({ from: r.date, to: r.clearedOn }));
  }
}
