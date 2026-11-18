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

import type { ApprovalRequest, ApprovalService, ItemContent } from './approvals.js';
import type { Role } from './roles.js';
import { itemVersion } from './approvals.js';
import { asObject, type FsDb } from './firestoreDb.js';
import { cardSeconds, doseText, type CardSource, type ContentLibrary, type ExerciseCard } from './content.js';
import { DossierService, type ClientDossier } from './dossiers.js';

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
  /**
   * Every session the plan can offer, when it is a set pack (src/weeklyPlan.ts). The app then
   * proposes the whole pack at startup, so the parent approves it in one sitting.
   */
  sessions?(): readonly SessionTemplate[];
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
  /** What the parent watches for in a set (story 112): shown before set 1 and when rating form. */
  parentCheck: string[];
  stopIf: string[];
  easier: { variant: string; useWhen: string };
  dose: ExerciseCard['dose'];
  doseText: string;
  timer: ExerciseCard['timer'];
  figureUrl: string;
  credit: string;
  /** The card's dossier (story 115), only when its version is approved; absent otherwise. */
  dossier?: ClientDossier;
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

/** A card of a session version, as a session record (story 113) checks it. */
export interface SessionCardShape {
  cardId: string;
  itemVersion: string;
  name: string;
  dose: ExerciseCard['dose'];
  cues: string[];
}

export const cardItemId = (cardId: string) => `card-${cardId}`;
export const sessionItemId = (templateId: string) => `session-${templateId}`;

/** The rubric's limit for a sentence the parent reads (quality rubric, CT1). */
export const DETAIL_SENTENCE_WORDS = 20;

const words = (sentence: string) => sentence.split(/\s+/).filter(Boolean).length;

/** True when every sentence of `text` is within the rubric's word limit. */
export function withinWordLimit(text: string, limit = DETAIL_SENTENCE_WORDS): boolean {
  return text.split(/(?<=[.!?])\s+/).every((s) => words(s) <= limit);
}

/**
 * What the parent reads about a card: why it helps, when that is short enough, and its dose,
 * in plain words. The card's hash binds the version without being shown.
 */
function cardSnapshot(source: CardSource): CardSnapshot {
  const { card } = source;
  const dose = `Dose: ${doseText(card.dose)}.`;
  const content: ItemContent = {
    title: card.name,
    detail: withinWordLimit(card.why) ? `${card.why} ${dose}` : dose,
    binding: `card ${card.id} ${source.contentHash}`,
  };
  return { source, itemId: cardItemId(card.id), itemVersion: itemVersion(content), content };
}

/** "6 moves, 5 min": the exact moves are bound to the version, not listed for the parent. */
function movesText(moves: Move[]): string {
  const minutes = Math.max(1, Math.round(moves.reduce((s, m) => s + m.seconds, 0) / 60));
  return `${moves.length} ${moves.length === 1 ? 'move' : 'moves'}, ${minutes} min`;
}

function sessionMinutes(template: SessionTemplate, cards: CardSnapshot[]): number {
  const moves = [...template.warmUp, ...template.coolDown].reduce((s, m) => s + m.seconds, 0);
  const work = cards.reduce((s, c) => s + cardSeconds(c.source.card.dose), 0);
  return Math.max(1, Math.round((moves + work) / 60));
}

/**
 * Versions, rebuilt in memory from the content at startup; the approvals that name them, and the
 * started marker (`StartedStore`, story 118), are stored with the household's data.
 */
export class MemorySnapshotStore {
  readonly cards = new Map<string, CardSnapshot>();
  readonly sessions = new Map<string, SessionSnapshot>();
  /**
   * Item versions a started session used (`itemId@itemVersion`): the session and each of its
   * cards. An approval of one of these can no longer be undone.
   */
  readonly started = new Set<string>();
}

const versionKey = (itemId: string, version: string) => `${itemId}@${version}`;

/**
 * The started-session marker, kept so it outlives a restart (story 118): the item versions a
 * started session used (`itemId@itemVersion`), the same keys as `MemorySnapshotStore.started`.
 * After a restart, a session started before it still cannot have its approval undone, still keeps
 * its stars cap, and can still have its history record accepted once (story 113).
 */
export interface StartedStore {
  list(): Promise<string[]>;
  /** Add these keys; a key that is there already stays once. */
  add(keys: string[]): Promise<void>;
}

export class MemoryStartedStore implements StartedStore {
  #keys = new Set<string>();
  async list(): Promise<string[]> {
    return [...this.#keys];
  }
  async add(keys: string[]): Promise<void> {
    for (const k of keys) this.#keys.add(k);
  }
  async deleteAll(): Promise<void> {
    this.#keys.clear();
  }
}

export const STARTED_COLLECTION = 'startedSessions';
/** The household's one marker document. */
export const STARTED_DOC = 'household';

/**
 * The marker in Firestore: one document, `startedSessions/household`, holding only the list of
 * keys. A key names a version, and versions change only when content does, so the list stays
 * short. An add is a transaction, so a key is never lost to another writer.
 */
export class FirestoreStartedStore implements StartedStore {
  constructor(
    private readonly db: FsDb,
    private readonly collection = STARTED_COLLECTION,
  ) {}

  private ref() {
    return this.db.collection(this.collection).doc(STARTED_DOC);
  }

  private static read(snap: { exists: boolean; data(): unknown }): string[] {
    const keys = snap.exists ? asObject(snap.data())?.keys : [];
    return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === 'string') : [];
  }

  async list(): Promise<string[]> {
    return FirestoreStartedStore.read(await this.ref().get());
  }

  async add(keys: string[]): Promise<void> {
    const ref = this.ref();
    await this.db.runTransaction(async (tx) => {
      const have = FirestoreStartedStore.read(await tx.get(ref));
      const next = [...new Set([...have, ...keys])];
      if (next.length !== have.length) tx.set(ref, { keys: next });
    });
  }

  /** Delete the marker with the household. */
  async deleteAll(): Promise<void> {
    await this.ref().delete();
  }
}

export interface TrainingServiceDeps {
  approvals: ApprovalService;
  content: ContentLibrary;
  plan?: TrainingPlan;
  snapshots?: MemorySnapshotStore;
  /** Where the started marker outlives a restart (story 118); in memory only when not given. */
  started?: StartedStore;
}

/** A client session with each card's approved dossier attached (story 115). */
function withDossiers(session: ClientSession, dossiers: Map<string, ClientDossier>): ClientSession {
  return {
    ...session,
    cards: session.cards.map((c) => {
      const dossier = dossiers.get(c.id);
      return dossier ? { ...c, dossier } : c;
    }),
  };
}

export class TrainingService {
  readonly approvals: ApprovalService;
  private content: ContentLibrary;
  readonly plan: TrainingPlan;
  private readonly snapshots: MemorySnapshotStore;
  private readonly startedStore: StartedStore | undefined;
  /** Exercise dossiers (story 115), approved like the cards they explain. */
  readonly dossiers: DossierService;

  constructor({
    approvals,
    content,
    plan = new SingleSessionPlan(),
    snapshots = new MemorySnapshotStore(),
    started,
  }: TrainingServiceDeps) {
    this.approvals = approvals;
    this.content = content;
    this.plan = plan;
    this.snapshots = snapshots;
    this.startedStore = started;
    this.dossiers = new DossierService({ approvals, content: () => this.content });
  }

  /** Read the stored started marker (startup, story 118). The server runs as one instance. */
  async loadStarted(): Promise<void> {
    if (!this.startedStore) return;
    for (const k of await this.startedStore.list()) this.snapshots.started.add(k);
  }

  /** Mark a session and its cards started: the store first, so a start is never only in memory. */
  private async rememberStarted(snap: SessionSnapshot): Promise<void> {
    const keys = [versionKey(snap.itemId, snap.itemVersion), ...snap.cards.map((c) => versionKey(c.itemId, c.itemVersion))];
    await this.startedStore?.add(keys);
    for (const k of keys) this.snapshots.started.add(k);
  }

  /** The exercise cards the sessions are built from. */
  get library(): ContentLibrary {
    return this.content;
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
      detail: [
        `About ${minutes} minutes.`,
        template.warmUp.length > 0 ? `Warm-up: ${movesText(template.warmUp)}.` : '',
        ...cards.map((c) => `${c.source.card.name}: ${doseText(c.source.card.dose)}.`),
        template.coolDown.length > 0 ? `Cool-down: ${movesText(template.coolDown)}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
      // The exact moves and card versions, so any change to them is a new version to approve.
      binding: JSON.stringify({
        warmUp: template.warmUp,
        coolDown: template.coolDown,
        cards: cards.map((c) => c.itemVersion),
      }),
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
   * Ask the parent for every card and session the plan uses, unless that exact version is
   * already approved or waiting: the whole pack when the plan has one, else today's session.
   * Each card goes once, even when several sessions use it, then each session. Called at
   * startup, never on a keeper's read, so a declined version is not asked again by itself.
   */
  async proposeFor(date: string): Promise<void> {
    const templates = this.plan.sessions ? [...this.plan.sessions()] : [this.plan.sessionFor(date)];
    const sessions: SessionSnapshot[] = [];
    for (const t of templates) {
      const s = t && this.currentSession(t);
      if (s) sessions.push(s);
    }
    const asked = new Set<string>();
    for (const c of sessions.flatMap((s) => s.cards)) {
      if (asked.has(c.itemVersion)) continue;
      asked.add(c.itemVersion);
      await this.approvals.propose({ kind: 'exercise', itemId: c.itemId, content: c.content });
    }
    for (const s of sessions) {
      await this.approvals.propose({ kind: 'plan', itemId: s.itemId, content: s.content });
    }
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
      return { date, planned: true, today: await this.sessionToClient(current), lastApproved: null, waiting };
    }

    // The newest approved earlier version whose cards are all approved too.
    const itemId = sessionItemId(template.id);
    const approved = (await this.approvals.store.list({ state: 'approved' }))
      .filter((r) => r.itemId === itemId && r.itemVersion !== current?.itemVersion)
      .sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0));
    for (const r of approved) {
      const snap = this.snapshots.sessions.get(r.itemVersion);
      if (snap && (await this.playable(snap))) {
        return { date, planned: true, today: null, lastApproved: await this.sessionToClient(snap), waiting };
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
    // A started session keeps its cap even if an approval it used was undone after the start
    // was queued on the device (story #94 AC2): the keeper's XP stands.
    if (!snap || !(this.hasStarted(snap) || (await this.playable(snap)))) return null;
    return snap.cards.reduce((s, c) => s + c.source.card.dose.sets, 0);
  }

  /**
   * The keeper started this session version. Recorded only when it is still playable (every
   * version in it approved); false otherwise, so a session whose approval was just undone does
   * not start.
   */
  async markStarted(itemId: string, version: string): Promise<boolean> {
    const snap = this.snapshots.sessions.get(version);
    if (!snap || snap.itemId !== itemId || !(await this.playable(snap))) return false;
    await this.rememberStarted(snap);
    return true;
  }

  /**
   * A start that was queued on the keeper's device and arrives late (story #94 AC2). When the
   * parent undid an approval this session uses before the start reached the server, the
   * keeper began in good faith: the start is still recorded, each undone item gets its own
   * audit event (`LATE_START_REASON`), and the session's results and XP stand. The undone
   * versions stay out of today's offer until they are approved again. A version that was
   * never approved, or was declined without an undo, is still refused (false). So is a start
   * whose `date` (the device's local date of the session) is not the day of the undo: a stale
   * or crafted start days later never marks an unapproved session as started.
   */
  async markStartedLate(
    itemId: string,
    version: string,
    actor: { account: string; role: Role },
    date: string,
  ): Promise<boolean> {
    const snap = this.snapshots.sessions.get(version);
    if (!snap || snap.itemId !== itemId || !DATE_RE.test(date)) return false;
    const undone: ApprovalRequest[] = [];
    for (const item of [snap, ...snap.cards]) {
      if (await this.approvals.isApproved(item.itemId, item.itemVersion)) continue;
      const request = await this.approvals.undoneRequest(item.itemId, item.itemVersion, date);
      if (!request) return false;
      undone.push(request);
    }
    // A resend of the same start is recorded once.
    const already = this.hasStarted(snap);
    await this.rememberStarted(snap);
    if (!already) for (const r of undone) await this.approvals.logLateStart(r, actor);
    return true;
  }

  /** Whether a started session used this item version (the session itself or one of its cards). */
  hasStarted(item: { itemId: string; itemVersion: string }): boolean {
    return this.snapshots.started.has(versionKey(item.itemId, item.itemVersion));
  }

  /**
   * A session version's title and cards, as a session record (story 113) is checked and kept:
   * each card's id, version, name, dose and cues. Null when the version is unknown.
   */
  sessionCards(itemId: string, version: string): { title: string; cards: SessionCardShape[] } | null {
    const snap = this.snapshots.sessions.get(version);
    if (!snap || snap.itemId !== itemId) return null;
    return {
      title: snap.template.title,
      cards: snap.cards.map((c) => ({
        cardId: c.source.card.id,
        itemVersion: c.itemVersion,
        name: c.source.card.name,
        dose: { ...c.source.card.dose },
        cues: [...c.source.card.cues],
      })),
    };
  }

  /**
   * The cues of a card version, so a record's cue ids (positions in this list, story 113) read
   * back as the cue text. Null when that version is not known to this server.
   */
  cardCues(version: string): string[] | null {
    const snap = this.snapshots.cards.get(version);
    return snap ? [...snap.source.card.cues] : null;
  }

  /** Dev-only demo reset (src/demo.ts): forget which sessions were started. */
  clearStarted(): void {
    this.snapshots.started.clear();
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

  /** A session for the player, each card with its approved dossier when it has one (story 115). */
  private async sessionToClient(s: SessionSnapshot): Promise<ClientSession> {
    return withDossiers(this.toClient(s), await this.dossiers.approved());
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
      parentCheck: [...card.parent_check],
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
