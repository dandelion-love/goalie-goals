import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { creditLine, type CardSource, type CreditEntry, type Dossier, type DossierSource, type ExerciseCard } from './content.js';
import { dossierSnapshot } from './dossiers.js';
import { cardSnapshot } from './training.js';

type Entry = { rung: string; dose: string; predecessor?: string; card: string; cardSha256: string; spec: string; specSha256: string; figure: string; figureSha256: string; itemVersion: string; dossier?: string; dossierSha256?: string; dossierVersion?: string };
export type ArchivedProgressionVersion = { rung: string; dose: string; predecessor?: string; card: CardSource; itemVersion: string; spec: string; dossier?: DossierSource; dossierVersion?: string };
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const within = (root: string, path: string) => { const r = relative(realpathSync(root), realpathSync(path)); return r !== '' && !r.startsWith('..') && !isAbsolute(r); };

/**
 * Verify an explicitly named archive's bytes and effective versions. A matching manifest
 * alone is not owner approval; a caller must independently enforce the recorded decision.
 * This never proposes, approves, schedules or changes the active content library.
 */
export function loadProgressionArchive(contentRoot: string, archiveName: string): ArchivedProgressionVersion[] {
  if (!/^[a-z0-9-]+$/.test(archiveName)) throw new Error('Invalid progression archive');
  const archive = resolve(contentRoot, 'progression-versions', archiveName);
  const repo = dirname(contentRoot);
  if (!within(contentRoot, archive)) throw new Error('Invalid progression archive');
  const manifest = JSON.parse(readFileSync(resolve(archive, 'manifest.json'), 'utf8')) as { format?: unknown; versions?: unknown };
  if (manifest.format !== 1 || !Array.isArray(manifest.versions)) throw new Error('Invalid progression manifest');
  const credits = JSON.parse(readFileSync(resolve(contentRoot, 'credits.json'), 'utf8')) as { entries: CreditEntry[] };
  const read = (path: string, expected: string, isContent = false) => {
    if (typeof path !== 'string' || typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) throw new Error('Invalid archive entry');
    if (!isContent && (basename(path) !== path || path === '.' || path === '..')) throw new Error('Invalid archive path');
    if (isContent && (!path.startsWith('content/') || path.includes('..'))) throw new Error('Invalid content path');
    const root = isContent ? contentRoot : archive;
    const full = resolve(isContent ? repo : archive, path);
    if (!within(root, full)) throw new Error('Invalid archive path');
    const text = readFileSync(full, 'utf8');
    if (sha(text) !== expected) throw new Error('Progression artifact hash mismatch');
    return text;
  };
  const seen = new Set<string>();
  return (manifest.versions as Entry[]).map((entry) => {
    if (!entry || typeof entry.rung !== 'string' || typeof entry.dose !== 'string' || typeof entry.itemVersion !== 'string' || seen.has(entry.itemVersion)) throw new Error('Invalid progression entry');
    seen.add(entry.itemVersion);
    const raw = JSON.parse(read(entry.card, entry.cardSha256)) as ExerciseCard & { approved?: unknown; spec?: string };
    if (raw.approved !== false || raw.id !== entry.rung || raw.spec !== `content/exercises/${entry.spec}`) throw new Error('Progression card does not match manifest');
    const { approved: _static, ...card } = raw;
    const amount = card.dose.kind === 'hold' ? `${card.dose.seconds} s` : `${card.dose.reps}`;
    const dose = `${card.dose.sets} x ${amount}${card.dose.per_side ? ' per side' : ''}`;
    if (entry.dose !== dose || (entry.predecessor !== undefined && (typeof entry.predecessor !== 'string' || !/^[a-z0-9-]+$/.test(entry.predecessor)))) throw new Error('Progression dose or prerequisite mismatch');
    const spec = read(entry.spec, entry.specSha256);
    const isContent = entry.figure.startsWith('content/');
    const figureSvg = read(entry.figure, entry.figureSha256, isContent);
    if (basename(card.media.figure) !== basename(entry.figure)) throw new Error('Progression figure does not match card');
    const creditPath = isContent ? entry.figure : `content/progression-versions/${archiveName}/${entry.figure}`;
    const credit = credits.entries.find((item) => item.path === creditPath);
    if (!credit) throw new Error('Progression figure is not credited');
    const cardSource: CardSource = { card, figureSvg, credit: creditLine(credit), contentHash: sha(`${JSON.stringify(card)}\0${figureSvg}`) };
    if (cardSnapshot(cardSource).itemVersion !== entry.itemVersion) throw new Error('Progression version mismatch');
    let dossier: DossierSource | undefined;
    if (entry.dossier !== undefined) {
      const rawDossier = JSON.parse(read(entry.dossier, entry.dossierSha256 ?? '')) as Dossier & { approved?: unknown };
      if (rawDossier.approved !== false || rawDossier.id !== card.id || rawDossier.card !== `content/exercises/${card.id}.json`) throw new Error('Progression dossier does not match card');
      const { approved: _ignored, ...data } = rawDossier;
      dossier = { dossier: data, contentHash: sha(JSON.stringify(data)) };
      if (dossierSnapshot(dossier, card.name).itemVersion !== entry.dossierVersion) throw new Error('Progression dossier version mismatch');
    }
    return { rung: entry.rung, dose: entry.dose, ...(entry.predecessor ? { predecessor: entry.predecessor } : {}), card: cardSource, itemVersion: entry.itemVersion, spec, ...(dossier ? { dossier, dossierVersion: entry.dossierVersion } : {}) };
  });
}
