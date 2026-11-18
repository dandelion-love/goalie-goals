// Today's session for the keeper, built only from approved item versions.
//
// Two kinds of item go through parent approval (src/approvals.ts):
// - each exercise card (`card-<id>`, kind `exercise`), bound to a hash of the card and its figure;
// - each session (`session-<id>`, kind `plan`), bound to its warm-up, its cards with their
//   doses, and the exact card versions it uses.
// A session is playable only when its version and every card version it names are approved.
// Fallback when today's session is not (parent-approval Decision, section 6): the last
// approved version of that session, or rest. A pending, declined or expired version is never
// offered. The "approved maintenance session" rung is not built yet; the keeper is offered
// rest instead.

import type { ApprovalService, ItemContent } from './approvals.js';
import { itemVersion } from './approvals.js';
import { cardSeconds, doseText, type CardSource, type ContentLibrary, type ExerciseCard } from './content.js';

/** A timed, low-risk move in a warm-up or cool-down (no equipment, no jumping). */
export interface Move {
  name: string;
  seconds: number;
  cue: string;
}

export interface SessionTemplate {
  id: string;
  title: string;
  warmUp: Move[];
  cardIds: string[];
  coolDown: Move[];
}

/** Which session is planned for a date (YYYY-MM-DD); null is a planned rest day. */
export interface TrainingPlan {
  sessionFor(date: string): SessionTemplate | null;
}

/**
 * The starter session: a 5-minute dynamic warm-up (training rules: 5 to 10 minutes), two
 * low-risk cards at their card doses, and a light cool-down. About 10 minutes in all.
 */
export const STARTER_SESSION: SessionTemplate = {
  id: 'starter',
  title: 'Strong middle',
  warmUp: [
    { name: 'March on the spot', seconds: 60, cue: 'Knees up, arms swing' },
    { name: 'Arm circles', seconds: 45, cue: 'Small circles, then big' },
    { name: 'Side steps', seconds: 60, cue: 'Stay low, feet apart' },
    { name: 'Leg swings, one hand on a wall', seconds: 60, cue: 'Tall body, easy swing' },
    { name: 'Knee hugs while walking', seconds: 45, cue: 'Stand tall on the standing leg' },
    { name: 'Toe taps on the spot', seconds: 30, cue: 'Light and quick' },
  ],
  cardIds: ['plank', 'glute-bridge'],
  coolDown: [{ name: 'Easy walk and slow breaths', seconds: 60, cue: 'Breathe out slowly' }],
};

/** Every day offers the same session until plans and weekly scheduling arrive (a later story). */
export class SingleSessionPlan implements TrainingPlan {
  constructor(private readonly template: SessionTemplate = STARTER_SESSION) {}
  sessionFor(): SessionTemplate | null {
    return this.template;
  }
}

/** A card as the keeper's player sees it. */
export interface ClientCard {
  id: string;
  itemVersion: string;
  name: string;
  why: string;
  setup: Record<string, string>;
  steps: string[];
  cues: string[];
  mistakes: { mistake: string; fix: string }[];
  stopIf: string[];
  easier: { variant: string; useWhen: string };
  dose: ExerciseCard['dose'];
  doseText: string;
  timer: ExerciseCard['timer'];
  figureUrl: string;
  credit: string;
}

export interface ClientSession {
  itemId: string;
  itemVersion: string;
  title: string;
  minutes: number;
  warmUp: Move[];
  cards: ClientCard[];
  coolDown: Move[];
}

export interface TodayResponse {
  date: string;
  /** False on a planned rest day. */
  planned: boolean;
  /** Today's session, only when it and all its cards are approved. */
  today: ClientSession | null;
  /** When today's is not approved: the last approved version of it, or null (then rest). */
  lastApproved: ClientSession | null;
  /** How many requests wait for the parent; never their content. */
  waiting: number;
}

/** A card version as proposed: kept so an older approved version can still be shown. */
interface CardSnapshot {
  source: CardSource;
  itemId: string;
  itemVersion: string;
  content: ItemContent;
}

interface SessionSnapshot {
  template: SessionTemplate;
  itemId: string;
  itemVersion: string;
  content: ItemContent;
  cards: CardSnapshot[];
}

export const cardItemId = (cardId: string) => `card-${cardId}`;
export const sessionItemId = (templateId: string) => `session-${templateId}`;

function shortHash(hex: string): string {
  return hex.slice(0, 8);
}

function cardSnapshot(source: CardSource): CardSnapshot {
  const { card } = source;
  const content: ItemContent = {
    title: `${card.name} (exercise card)`,
    detail: `${card.why} Dose: ${doseText(card.dose)}. Card version ${shortHash(source.contentHash)}.`,
  };
  return { source, itemId: cardItemId(card.id), itemVersion: itemVersion(content), content };
}

function movesText(moves: Move[]): string {
  return moves.map((m) => `${m.name} ${m.seconds} s`).join(', ');
}

function sessionMinutes(template: SessionTemplate, cards: CardSnapshot[]): number {
  const moves = [...template.warmUp, ...template.coolDown].reduce((s, m) => s + m.seconds, 0);
  const work = cards.reduce((s, c) => s + cardSeconds(c.source.card.dose), 0);
  return Math.max(1, Math.round((moves + work) / 60));
}

/** Versions are kept in memory with the in-memory approval store; a later story persists them. */
export class MemorySnapshotStore {
  readonly cards = new Map<string, CardSnapshot>();
  readonly sessions = new Map<string, SessionSnapshot>();
}

export interface TrainingServiceDeps {
  approvals: ApprovalService;
  content: ContentLibrary;
  plan?: TrainingPlan;
  snapshots?: MemorySnapshotStore;
}

export class TrainingService {
  readonly approvals: ApprovalService;
  private content: ContentLibrary;
  readonly plan: TrainingPlan;
  private readonly snapshots: MemorySnapshotStore;

  constructor({ approvals, content, plan = new SingleSessionPlan(), snapshots = new MemorySnapshotStore() }: TrainingServiceDeps) {
    this.approvals = approvals;
    this.content = content;
    this.plan = plan;
    this.snapshots = snapshots;
  }

  /** Swap in new content (an edit on disk, or a test); approvals of old versions stay with them. */
  setContent(content: ContentLibrary): void {
    this.content = content;
  }

  /** The session version the template gives with today's content, or null if a card is missing. */
  currentSession(template: SessionTemplate): SessionSnapshot | null {
    const cards: CardSnapshot[] = [];
    for (const id of template.cardIds) {
      const source = this.content.cards.get(id);
      if (!source) return null;
      const snap = cardSnapshot(source);
      this.snapshots.cards.set(snap.itemVersion, snap);
      cards.push(snap);
    }
    const minutes = sessionMinutes(template, cards);
    const content: ItemContent = {
      title: `Session: ${template.title}`,
      detail:
        `About ${minutes} minutes. Warm-up: ${movesText(template.warmUp)}. ` +
        `Then ${cards.map((c) => `${c.source.card.name}, ${doseText(c.source.card.dose)}`).join('; ')}. ` +
        `Cool-down: ${movesText(template.coolDown)}. ` +
        `Card versions: ${cards.map((c) => `${c.source.card.id} ${shortHash(c.source.contentHash)}`).join(', ')}.`,
    };
    const snap: SessionSnapshot = {
      template: structuredClone(template),
      itemId: sessionItemId(template.id),
      itemVersion: itemVersion(content),
      content,
      cards,
    };
    this.snapshots.sessions.set(snap.itemVersion, snap);
    return snap;
  }

  /**
   * Ask the parent for every card and the session the plan uses today, unless that exact
   * version is already approved or waiting. Called at startup, never on a keeper's read, so
   * a declined version is not asked again by itself.
   */
  async proposeFor(date: string): Promise<void> {
    const template = this.plan.sessionFor(date);
    if (!template) return;
    const session = this.currentSession(template);
    if (!session) return;
    for (const c of session.cards) {
      await this.approvals.propose({ kind: 'exercise', itemId: c.itemId, content: c.content });
    }
    await this.approvals.propose({ kind: 'plan', itemId: session.itemId, content: session.content });
  }

  private async playable(session: SessionSnapshot): Promise<boolean> {
    if (!(await this.approvals.isApproved(session.itemId, session.itemVersion))) return false;
    for (const c of session.cards) {
      if (!(await this.approvals.isApproved(c.itemId, c.itemVersion))) return false;
    }
    return true;
  }

  async today(date: string): Promise<TodayResponse> {
    await this.approvals.expireDue();
    const waiting = (await this.approvals.pending()).length;
    const template = this.plan.sessionFor(date);
    if (!template) return { date, planned: false, today: null, lastApproved: null, waiting };

    const current = this.currentSession(template);
    if (current && (await this.playable(current))) {
      return { date, planned: true, today: this.toClient(current), lastApproved: null, waiting };
    }

    // The newest approved earlier version whose cards are all approved too.
    const itemId = sessionItemId(template.id);
    const approved = (await this.approvals.store.list({ state: 'approved' }))
      .filter((r) => r.itemId === itemId && r.itemVersion !== current?.itemVersion)
      .sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0));
    for (const r of approved) {
      const snap = this.snapshots.sessions.get(r.itemVersion);
      if (snap && (await this.playable(snap))) {
        return { date, planned: true, today: null, lastApproved: this.toClient(snap), waiting };
      }
    }
    return { date, planned: true, today: null, lastApproved: null, waiting };
  }

  /**
   * Sets planned in an approved session version: the cap on form stars. Null when the version
   * is unknown or not approved, so a client can never raise its own cap.
   */
  async plannedSets(version: string): Promise<number | null> {
    const snap = this.snapshots.sessions.get(version);
    if (!snap || !(await this.playable(snap))) return null;
    return snap.cards.reduce((s, c) => s + c.source.card.dose.sets, 0);
  }

  /** The latest approved version of each card: the keeper's card library. */
  async approvedCards(): Promise<ClientCard[]> {
    const items = await this.approvals.approvedItems();
    const cards: ClientCard[] = [];
    for (const i of items) {
      const snap = this.snapshots.cards.get(i.itemVersion);
      if (snap && snap.itemId === i.itemId) cards.push(this.cardToClient(snap));
    }
    return cards.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** The figure of an approved card version, or null: an unapproved figure is never served. */
  async figure(cardId: string, version: string): Promise<string | null> {
    const snap = this.snapshots.cards.get(version);
    if (!snap || snap.itemId !== cardItemId(cardId)) return null;
    if (!(await this.approvals.isApproved(snap.itemId, snap.itemVersion))) return null;
    return snap.source.figureSvg;
  }

  private toClient(s: SessionSnapshot): ClientSession {
    return {
      itemId: s.itemId,
      itemVersion: s.itemVersion,
      title: s.template.title,
      minutes: sessionMinutes(s.template, s.cards),
      warmUp: s.template.warmUp.map((m) => ({ ...m })),
      cards: s.cards.map((c) => this.cardToClient(c)),
      coolDown: s.template.coolDown.map((m) => ({ ...m })),
    };
  }

  private cardToClient(c: CardSnapshot): ClientCard {
    const { card } = c.source;
    return {
      id: card.id,
      itemVersion: c.itemVersion,
      name: card.name,
      why: card.why,
      setup: { ...card.setup },
      steps: [...card.steps],
      cues: [...card.cues],
      mistakes: card.mistakes.map((m) => ({ ...m })),
      stopIf: [...card.stop_if],
      easier: { variant: card.easier.variant, useWhen: card.easier.use_when },
      dose: { ...card.dose },
      doseText: doseText(card.dose),
      timer: card.timer,
      figureUrl: `/api/training/cards/${encodeURIComponent(card.id)}/figure.svg?v=${encodeURIComponent(c.itemVersion)}`,
      credit: c.source.credit,
    };
  }
}

/** Today's date (YYYY-MM-DD) in UTC; the client sends its own local date when it can. */
export function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
