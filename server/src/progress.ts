// Recording finished sessions and reading XP and streaks. The rules are the pure functions in
// progression.ts; this service only gathers their inputs. Records sit behind `ProgressStore`
// with an in-memory implementation, as approvals do; a later story persists them.

import { randomUUID } from 'node:crypto';
import type { Role } from './roles.js';
import type { TrainingPlan } from './training.js';
import {
  NO_CREDIT,
  PEOPLE,
  classifyDay,
  computeStreaks,
  datesBetween,
  sessionCredit,
  type Day,
  type DayKind,
  type Outcome,
  type Person,
  type Run,
  type SessionCredit,
  type Streak,
} from './progression.js';

export interface SessionRecord {
  id: string;
  /** The keeper's local date (YYYY-MM-DD). */
  date: string;
  itemId: string;
  itemVersion: string;
  outcome: Outcome;
  warmUpLogged: boolean;
  /** Count of sets the parent rated well. The cue text is not kept. */
  praisedSets: number;
  /** Planned sets of the approved session version, as the server knows it. */
  plannedSets: number;
  present: Person[];
  recordedBy: Role;
  at: Date;
  /** What this record earned: zero for an extra session or a rest-day session. */
  credit: SessionCredit;
}

export interface ProgressStore {
  add(record: SessionRecord): Promise<void>;
  /** All records, oldest first. */
  list(): Promise<SessionRecord[]>;
}

export class MemoryProgressStore implements ProgressStore {
  private readonly records: SessionRecord[] = [];

  async add(record: SessionRecord): Promise<void> {
    this.records.push(structuredClone(record));
  }

  async list(): Promise<SessionRecord[]> {
    return this.records.map((r) => structuredClone(r));
  }

  /** Dev-only demo reset (src/demo.ts). */
  clear(): void {
    this.records.length = 0;
  }
}

/** Dates on which training was paused for the keeper (both ends included; `to` null: still paused). */
export interface PauseSource {
  spans(): Promise<{ from: string; to: string | null }[]>;
}

export const NO_PAUSES: PauseSource = { spans: async () => [] };

export interface RecordInput {
  date: string;
  itemId: string;
  itemVersion: string;
  outcome: Outcome;
  warmUpLogged: boolean;
  praisedSets: number;
  /** Who trained. The player is a together session (the parent supervises and rates form). */
  present?: Person[];
}

export interface StreakView {
  current: number;
  best: number;
}

export interface ProgressSummary {
  date: string;
  xp: { total: number; today: number };
  team: StreakView;
  keeper: StreakView;
  parent: StreakView;
  /** Today's state, or null while today is still open. */
  today: DayKind | null;
  /** Team runs that ended, newest first: shown as completed runs. */
  runs: Run[];
}

export interface ProgressServiceDeps {
  store: ProgressStore;
  plan: TrainingPlan;
  /** Planned sets of an approved session version; null when the server does not know it. */
  plannedSets: (itemVersion: string) => Promise<number | null>;
  pauses?: PauseSource;
  clock?: () => Date;
}

function view(s: Streak): StreakView {
  return { current: s.current, best: s.best };
}

export class ProgressService {
  private readonly store: ProgressStore;
  private readonly plan: TrainingPlan;
  private readonly plannedSets: (itemVersion: string) => Promise<number | null>;
  readonly pauses: PauseSource;
  private readonly clock: () => Date;

  constructor({ store, plan, plannedSets, pauses = NO_PAUSES, clock = () => new Date() }: ProgressServiceDeps) {
    this.store = store;
    this.plan = plan;
    this.plannedSets = plannedSets;
    this.pauses = pauses;
    this.clock = clock;
  }

  /** Record a finished session (however it ended) and return what it earned. */
  async record(input: RecordInput, recordedBy: Role): Promise<SessionRecord> {
    const records = await this.store.list();
    const planned = this.plan.sessionFor(input.date) !== null;
    const first = !records.some((r) => r.date === input.date);
    // Unknown versions get no stars: the cap is the server's own plan, never the client's.
    const plannedSets = (await this.plannedSets(input.itemVersion)) ?? 0;
    const present = input.present?.length ? [...new Set(input.present)] : [...PEOPLE];
    const credit =
      planned && first
        ? sessionCredit({ outcome: input.outcome, warmUpLogged: input.warmUpLogged, praisedSets: input.praisedSets, plannedSets })
        : { ...NO_CREDIT };
    const record: SessionRecord = {
      id: randomUUID(),
      date: input.date,
      itemId: input.itemId,
      itemVersion: input.itemVersion,
      outcome: input.outcome,
      warmUpLogged: input.warmUpLogged,
      praisedSets: Math.max(0, Math.floor(input.praisedSets)),
      plannedSets,
      present,
      recordedBy,
      at: this.clock(),
      credit,
    };
    await this.store.add(record);
    return record;
  }

  /** The calendar from the first record or pause to `today`, one state per day. */
  async days(today: string): Promise<Day[]> {
    const records = await this.store.list();
    const spans = await this.pauses.spans();
    const starts = [...records.map((r) => r.date), ...spans.map((s) => s.from)].filter((d) => d <= today).sort();
    if (!starts.length) return [];
    const firstByDate = new Map<string, SessionRecord>();
    for (const r of records) if (!firstByDate.has(r.date)) firstByDate.set(r.date, r);
    const days: Day[] = [];
    for (const date of datesBetween(starts[0], today)) {
      const session = firstByDate.get(date) ?? null;
      const kind = classifyDay({
        date,
        planned: this.plan.sessionFor(date) !== null,
        session: session && { outcome: session.outcome, present: session.present },
        paused: spans.some((s) => s.from <= date && (s.to === null || date <= s.to)),
        isToday: date === today,
      });
      if (kind) days.push({ date, kind, present: session?.present });
    }
    return days;
  }

  async summary(today: string): Promise<ProgressSummary> {
    const records = await this.store.list();
    const days = await this.days(today);
    const streaks = computeStreaks(days);
    const total = records.reduce((s, r) => s + r.credit.total, 0);
    const todayXp = records.filter((r) => r.date === today).reduce((s, r) => s + r.credit.total, 0);
    const last = days[days.length - 1];
    return {
      date: today,
      xp: { total, today: todayXp },
      team: view(streaks.team),
      keeper: view(streaks.keeper),
      parent: view(streaks.parent),
      today: last && last.date === today ? last.kind : null,
      runs: [...streaks.team.completed].reverse(),
    };
  }
}
