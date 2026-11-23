import type { Dossier, DossierSourceRef, Evidence } from './content.js';

const keys: Record<string, string> = {
  quadriceps: 'quads', hamstrings: 'hamstrings', calves: 'calves',
  'gluteus-maximus': 'glutes', 'gluteus-medius': 'side-glutes',
  'erector-spinae': 'lower-back', 'external-oblique': 'obliques',
  pectorals: 'chest', 'rectus-abdominis': 'abs', 'serratus-anterior': 'serratus',
  'tibialis-anterior': 'shins', triceps: 'triceps',
};
export type FocusClaim = { key: string; plain: string; role: 'main' | 'helping'; evidence: Evidence; sources: DossierSourceRef[] };
export type FocusDraft = { claims: FocusClaim[]; note: { text: string; evidence: Evidence; sources: DossierSourceRef[] } };
const evidence = (value: unknown): value is Evidence => typeof value === 'string' && ['youth', 'adult', 'mixed', 'app'].includes(value);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function matchesEvidence(label: Evidence, sources: DossierSourceRef[]): boolean {
  const populations = sources.map((item) => item.population).filter((value) => value !== 'app');
  const expected = !populations.length ? 'app' : populations.every((value) => value === 'youth') ? 'youth' : populations.every((value) => value === 'adult') ? 'adult' : 'mixed';
  return label === expected;
}

/** Prepare review material only. This function grants no approval and exposes no route. */
export function prepareFocusDraft(dossier: Dossier): FocusDraft | null {
  const source = dossier.muscles;
  if (!object(source) || !Array.isArray(source.map) || !source.map.length || !object(source.note)) return null;
  const byId = new Map(dossier.sources.map((item) => [item.id, item]));
  const refs = (value: unknown): DossierSourceRef[] | null => {
    if (!Array.isArray(value) || !value.length || !value.every((id) => typeof id === 'string' && byId.has(id))) return null;
    return value.map((id) => byId.get(id)!);
  };
  const claims: FocusClaim[] = [];
  for (const raw of source.map) {
    if (!object(raw) || typeof raw.muscle !== 'string' || !raw.muscle || typeof raw.plain !== 'string' || !raw.plain || (raw.role !== 'main' && raw.role !== 'helping') || !evidence(raw.evidence)) return null;
    const sources = refs(raw.sources);
    if (!sources || !matchesEvidence(raw.evidence, sources)) return null;
    claims.push({ key: keys[raw.muscle] ?? raw.muscle, plain: raw.plain, role: raw.role, evidence: raw.evidence, sources });
  }
  const noteSources = refs(source.note.sources);
  if (typeof source.note.text !== 'string' || !source.note.text || !evidence(source.note.evidence) || !noteSources || !matchesEvidence(source.note.evidence, noteSources)) return null;
  const text = dossier.id === 'squat-to-box' && noteSources.some((source) => source.id === 'slater-2017')
    ? `${source.note.text} The cited study measured general squats, not this box variation. The map is not a measure of individual strength.`
    : source.note.text;
  return { claims, note: { text, evidence: source.note.evidence, sources: noteSources } };
}
