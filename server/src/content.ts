// The exercise cards and figures in `content/`, read once at startup. Content is validated in
// CI by tools/content_check.py; this module only reads it, binds each card to a version and
// builds the credit line the same way the checker does.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type DoseKind = 'reps' | 'contacts' | 'efforts' | 'hold';

export interface Dose {
  kind: DoseKind;
  sets: number;
  reps?: number;
  seconds?: number;
  distance_m?: number;
  per_side: boolean;
  rest_s: number;
  tempo?: string;
}

/** The fields of an exercise card the app uses (content/README.md has the full shape). */
export interface ExerciseCard {
  id: string;
  name: string;
  category: string;
  why: string;
  risk: string;
  needs?: { all: string[]; any: string[][] };
  setup: Record<string, string>;
  steps: string[];
  cues: string[];
  mistakes: { mistake: string; fix: string }[];
  parent_check: string[];
  stop_if: string[];
  easier: { variant: string; use_when: string };
  dose: Dose;
  timer: 'reps' | 'interval' | 'countdown' | 'none';
  media: { figure: string };
}

/** One card as read from disk, with its figure and credit line. */
export interface CardSource {
  card: ExerciseCard;
  figureSvg: string;
  credit: string;
  /** Hash of the card (minus the static `approved` flag) and its figure. */
  contentHash: string;
}

export interface ContentLibrary {
  cards: ReadonlyMap<string, CardSource>;
  /** Each card's dossier (story 115), by card id; absent for a card that has none yet. */
  dossiers?: ReadonlyMap<string, DossierSource>;
}

/** Story 115: the evidence label of a claim, computed by tools/content_check.py from its sources. */
export type Evidence = 'youth' | 'adult' | 'mixed' | 'app';
export type GameAction = 'dive' | 'set-position' | 'jump' | 'distribution' | 'recovery';

export interface DossierSourceRef {
  id: string;
  url: string;
  title: string;
  kind: string;
  population: Evidence;
  band: string;
  year: number;
}

export interface DossierClaim {
  text: string;
  /** Optional reviewed identity shared only by equivalent, qualified claims. */
  groupId?: string;
  sources: string[];
  evidence: Evidence;
  detail?: string;
  action?: GameAction;
  negates?: boolean;
  outcome?: {
    measure: string;
    change_pct: [number, number];
    weeks: [number, number];
    sessions_per_week: [number, number];
    band: string;
  };
}

/**
 * An exercise dossier, `content/exercises/<id>.dossier.json` (exercise-dossier Decision). The
 * content check holds it to the Decision's shape and the claim rules; the app reads it.
 */
export interface Dossier {
  id: string;
  card: string;
  sources: DossierSourceRef[];
  why: { headline: string; claims: DossierClaim[]; unavailable?: string };
  expect: { claims: DossierClaim[]; keep_up?: DossierClaim; unavailable?: string };
  muscles: unknown;
  clips: unknown[];
  science: { claims: DossierClaim[]; limits: DossierClaim[] };
}

/** One dossier as read from disk. */
export interface DossierSource {
  dossier: Dossier;
  /** Hash of the dossier file (minus the static `approved` flag): its version. */
  contentHash: string;
}

const DOSSIER_SUFFIX = '.dossier.json';

interface CreditEntry {
  path: string;
  author: string;
  licence: string;
  source?: string;
  adapted?: boolean;
  changes?: string;
}

const LICENCE_NAMES: Record<string, string> = {
  'CC0-1.0': 'CC0 1.0',
  'CC-BY-4.0': 'CC BY 4.0',
  'CC-BY-SA-3.0': 'CC BY-SA 3.0',
  'CC-BY-SA-4.0': 'CC BY-SA 4.0',
  MIT: 'MIT',
  'Apache-2.0': 'Apache 2.0',
};

/** The card's credit line, from the credits manifest entry of its figure (as content_check.py builds it). */
export function creditLine(entry: CreditEntry): string {
  let line = `Figure: ${entry.author}, ${LICENCE_NAMES[entry.licence] ?? entry.licence}`;
  if (entry.source) line += `, ${entry.source}`;
  if (entry.adapted && entry.changes) line += ` (${entry.changes})`;
  return `${line}.`;
}

/** `content/` next to the server: `server/src` or `server/dist` both sit two levels below the repo root. */
export function defaultContentRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
}

/**
 * Read every card in `<root>/exercises`, its figure and its credits. `root` is the `content`
 * folder; figure and credits paths in the files are relative to its parent (the repo root).
 * A card without a figure or a credits entry is left out: it cannot be shown properly.
 */
export function loadContent(root: string = defaultContentRoot()): ContentLibrary {
  const cards = new Map<string, CardSource>();
  const dossiers = new Map<string, DossierSource>();
  const exercises = join(root, 'exercises');
  if (!existsSync(exercises)) return { cards, dossiers };
  const base = dirname(root);
  const credits = JSON.parse(readFileSync(join(root, 'credits.json'), 'utf8')) as { entries: CreditEntry[] };
  const byPath = new Map(credits.entries.map((e) => [e.path, e]));

  for (const file of readdirSync(exercises).sort()) {
    if (file.endsWith(DOSSIER_SUFFIX)) {
      const text = readFileSync(join(exercises, file), 'utf8');
      const { approved: _static, ...dossier } = JSON.parse(text) as Dossier & { approved?: unknown };
      // Like a card's, the `approved` flag in the file is a static default: approval lives in
      // the approvals service, bound to this hash, so any other edit needs a new approval.
      const contentHash = createHash('sha256').update(JSON.stringify(dossier)).digest('hex');
      dossiers.set(dossier.id, { dossier, contentHash });
      continue;
    }
    if (!file.endsWith('.json')) continue;
    const raw = JSON.parse(readFileSync(join(exercises, file), 'utf8')) as ExerciseCard & { approved?: unknown };
    const figurePath = raw.media?.figure;
    const entry = figurePath ? byPath.get(figurePath) : undefined;
    if (!figurePath || !entry || !existsSync(join(base, figurePath))) continue;
    const figureSvg = readFileSync(join(base, figurePath), 'utf8');
    // `approved` in the file is a static default; approval lives in the approvals service.
    const { approved: _ignored, ...card } = raw;
    const contentHash = createHash('sha256').update(JSON.stringify(card)).update('\0').update(figureSvg).digest('hex');
    cards.set(card.id, { card, figureSvg, credit: creditLine(entry), contentHash });
  }
  // A dossier whose card is not in the library is left out: it has nothing to explain.
  for (const id of [...dossiers.keys()]) if (!cards.has(id)) dossiers.delete(id);
  return { cards, dossiers };
}

/** Plain-language dose, as the parent reads it in a request and the keeper on the card. */
export function doseText(d: Dose): string {
  const side = d.per_side ? ' each side' : '';
  let work: string;
  switch (d.kind) {
    case 'hold':
      work = `${d.seconds} s hold${side}`;
      break;
    case 'contacts':
      work = `${d.reps} contacts${side}`;
      break;
    case 'efforts':
      work = `${d.reps} efforts${d.distance_m ? ` over ${d.distance_m} m` : ''}${side}`;
      break;
    default:
      work = `${d.reps} reps${side}`;
  }
  return `${d.sets} ${d.sets === 1 ? 'set' : 'sets'} of ${work}, rest ${d.rest_s} s`;
}

/** The estimate's pace for counted work (reps, contacts, efforts), in seconds a rep. */
export const SECONDS_PER_REP = 4;

/**
 * Rough seconds a card takes: work at about 4 s a rep, or the hold time, plus rests between sets.
 * Part of the one session estimate (`sessionSeconds` in src/training.ts, story 120).
 */
export function cardSeconds(d: Dose): number {
  const sides = d.per_side ? 2 : 1;
  const perSet = d.kind === 'hold' ? (d.seconds ?? 0) * sides : (d.reps ?? 0) * SECONDS_PER_REP * sides;
  return d.sets * perSet + Math.max(0, d.sets - 1) * d.rest_s;
}
