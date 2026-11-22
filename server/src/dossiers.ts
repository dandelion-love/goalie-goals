// Exercise dossiers (story 115): why a card matters for a goalkeeper and what to expect, from
// `content/exercises/<id>.dossier.json` (exercise-dossier Decision). A dossier goes through
// parent approval like an exercise card: its version is the hash of the file, so any change to
// it waits in the parent's inbox again, and the keeper sees only an approved version.
//
// This first build shows two of the six sections, "Why it matters for a goalkeeper" and "What
// to expect", with the sources they cite. The muscle map, clips and the other sections are
// read from the file and checked by tools/content_check.py, but not shown yet.

import { itemVersion, type ApprovalRequest, type ApprovalService, type ItemContent } from './approvals.js';
import type { ContentLibrary, DossierClaim, DossierSource, GameAction } from './content.js';

export const dossierItemId = (cardId: string) => `dossier-${cardId}`;

/** A claim as the screen shows it: a short label, the text and its source numbers. */
export interface ClientClaim {
  label: string;
  text: string;
  evidence?: string;
  detail?: string;
  /** Numbers into `sources` (1-based), in the order the claim cites them. */
  sources: number[];
}

/** A source the screen lists: its number, title, and link when it has a public one. */
export interface ClientSource {
  n: number;
  title: string;
  url: string | null;
}

/** What the keeper (and the parent, before approving) reads: two sections and their sources. */
export interface ClientDossier {
  cardId: string;
  itemVersion: string;
  name: string;
  headline: string;
  why: ClientClaim[];
  expect: ClientClaim[];
  sources: ClientSource[];
}

/** Each game action in plain words, at most 3 (the rubric's limit for a label). */
export const ACTION_LABEL: Record<GameAction, string> = {
  dive: 'Dives',
  'set-position': 'Set position',
  jump: 'Jumps and landings',
  distribution: 'Throws and kicks',
  recovery: 'Getting up',
};

/** "6 weeks", or "6 to 9 weeks": an expected change's time frame, as its label. */
export function weeksLabel(weeks: [number, number]): string {
  const [lo, hi] = weeks;
  return lo === hi ? `${lo} ${lo === 1 ? 'week' : 'weeks'}` : `${lo} to ${hi} weeks`;
}

interface DossierSnapshot {
  cardId: string;
  itemId: string;
  itemVersion: string;
  content: ItemContent;
  client: ClientDossier;
}

/**
 * The two sections, with only the sources they cite, numbered in the order they are first
 * cited. A source with a repo path (an `app` source) is listed without a link.
 */
function toClient(source: DossierSource, name: string, version: string): ClientDossier {
  const { dossier } = source;
  const byId = new Map(dossier.sources.map((s) => [s.id, s]));
  const numbers = new Map<string, number>();
  const cite = (c: DossierClaim) =>
    c.sources
      .filter((id) => byId.has(id))
      .map((id) => {
        if (!numbers.has(id)) numbers.set(id, numbers.size + 1);
        return numbers.get(id)!;
      });
  const why = dossier.why.claims.map((c) => ({
    label: c.action ? ACTION_LABEL[c.action] : 'Why',
    text: c.text,
    evidence: c.evidence,
    detail: c.detail,
    sources: cite(c),
  }));
  const expect = [
    ...dossier.expect.claims.map((c) => ({
      label: c.outcome ? weeksLabel(c.outcome.weeks) : 'With practice',
      text: c.text,
      evidence: c.evidence,
      detail: c.detail,
      sources: cite(c),
    })),
    { label: 'Keep it up', text: dossier.expect.keep_up.text, evidence: dossier.expect.keep_up.evidence, detail: dossier.expect.keep_up.detail, sources: cite(dossier.expect.keep_up) },
  ];
  const sources = [...numbers].map(([id, n]) => {
    const s = byId.get(id)!;
    return { n, title: s.title, url: s.url.startsWith('https://') ? s.url : null };
  });
  return { cardId: dossier.id, itemVersion: version, name, headline: dossier.why.headline, why, expect, sources };
}

function snapshot(source: DossierSource, name: string): DossierSnapshot {
  const cardId = source.dossier.id;
  const count = source.dossier.sources.length;
  // What the parent reads in the inbox; "Read it" there shows the whole of what the keeper sees.
  const content: ItemContent = {
    title: `${name}: why it matters`,
    detail: `What the keeper reads about this exercise: why it helps a goalkeeper and what to expect. It cites ${count} sources.`,
    binding: `dossier ${cardId} ${source.contentHash}`,
  };
  const version = itemVersion(content);
  return { cardId, itemId: dossierItemId(cardId), itemVersion: version, content, client: toClient(source, name, version) };
}

export interface DossierServiceDeps {
  approvals: ApprovalService;
  /** The content the training service runs on, read at each call (it can be swapped). */
  content: () => ContentLibrary;
}

export class DossierService {
  private readonly approvals: ApprovalService;
  private readonly content: () => ContentLibrary;
  /** Every version built from content since startup, by version: approvals name versions. */
  private readonly versions = new Map<string, DossierSnapshot>();

  constructor({ approvals, content }: DossierServiceDeps) {
    this.approvals = approvals;
    this.content = content;
  }

  /** Today's version of each dossier in the content. */
  private current(): DossierSnapshot[] {
    const library = this.content();
    const out: DossierSnapshot[] = [];
    for (const [cardId, source] of library.dossiers ?? []) {
      const card = library.cards.get(cardId);
      if (!card) continue;
      const snap = snapshot(source, card.card.name);
      this.versions.set(snap.itemVersion, snap);
      out.push(snap);
    }
    return out;
  }

  /**
   * Ask the parent for every dossier, unless that exact version is already approved or waiting.
   * Called at startup, as the cards are: never on a keeper's read.
   */
  async propose(): Promise<void> {
    for (const snap of this.current()) {
      await this.approvals.propose({ kind: 'dossier', itemId: snap.itemId, content: snap.content });
    }
  }

  /**
   * The latest approved version of each dossier, by card id. A version still pending, declined
   * or expired never shows; neither does one this server cannot rebuild from its content.
   */
  async approved(): Promise<Map<string, ClientDossier>> {
    this.current();
    const out = new Map<string, ClientDossier>();
    for (const item of await this.approvals.approvedItems()) {
      if (item.kind !== 'dossier') continue;
      const snap = this.versions.get(item.itemVersion);
      if (snap && snap.itemId === item.itemId) out.set(snap.cardId, snap.client);
    }
    return out;
  }

  /** What a dossier request asks the parent to approve, whatever its state; null for another kind. */
  async forRequest(request: ApprovalRequest | null): Promise<ClientDossier | null> {
    if (!request || request.kind !== 'dossier') return null;
    this.current();
    const snap = this.versions.get(request.itemVersion);
    return snap && snap.itemId === request.itemId ? snap.client : null;
  }

  /** A separately versioned current dossier, for parent-only decision context. */
  currentForCard(cardId: string): ClientDossier | null {
    return this.current().find((snap) => snap.cardId === cardId)?.client ?? null;
  }
}
