// "Something hurts": a pain report pauses all training for the keeper until a parent clears it
// (parent-approval Decision, section 7; training-rules Decision, warning signs).
//
// The report is stored in the app's data only. Nothing here logs it, and the audit log keeps
// the roles and the body area, never the note. The store sits behind an interface, with an
// in-memory implementation, as approvals do.

import type { AuditLog } from './approvals.js';
import type { Notifier } from './notifier.js';
import type { PauseSource } from './progress.js';
import type { Role } from './roles.js';

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
}

export interface PainStore {
  /** Store a new report; returns the stored one, or the existing one with the same id. */
  create(report: PainReport): Promise<PainReport>;
  list(): Promise<PainReport[]>;
  /** Mark every open report cleared; returns the ones it cleared. */
  clearOpen(at: Date, on: string): Promise<PainReport[]>;
}

function copy(r: PainReport): PainReport {
  return { ...r, at: new Date(r.at), clearedAt: r.clearedAt ? new Date(r.clearedAt) : null };
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
}

export class PainError extends Error {
  constructor(
    readonly code: 'forbidden' | 'invalid' | 'not_paused',
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
    if (!/^[A-Za-z0-9-]{8,64}$/.test(input.id) || !isBodyArea(input.bodyArea)) {
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

  /** For streaks: each report pauses from its date to the clear date, both included. */
  async spans(): Promise<{ from: string; to: string | null }[]> {
    return (await this.store.list()).map((r) => ({ from: r.date, to: r.clearedOn }));
  }
}
