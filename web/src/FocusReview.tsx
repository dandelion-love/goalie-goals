import { MuscleMap } from './MuscleMap';

type Source = { id: string; url: string; title: string; kind: string; population: string; band: string; year: number };
type Claim = { key: string; plain: string; role: 'main' | 'helping'; evidence: string; sources: Source[] };
export type FocusReviewData = { claims: Claim[]; note: { text: string; evidence: string; sources: Source[] } };

export function isFocusReviewData(value: unknown): value is FocusReviewData {
  if (!value || typeof value !== 'object') return false;
  const data = value as FocusReviewData;
  const sources = (items: unknown): items is Source[] => Array.isArray(items) && items.every((s) => s && typeof s.id === 'string' && typeof s.url === 'string' && typeof s.title === 'string' && typeof s.kind === 'string' && typeof s.population === 'string' && typeof s.band === 'string' && typeof s.year === 'number');
  return Array.isArray(data.claims) && data.claims.every((c) => c && typeof c.key === 'string' && typeof c.plain === 'string' && (c.role === 'main' || c.role === 'helping') && typeof c.evidence === 'string' && sources(c.sources)) && !!data.note && typeof data.note.text === 'string' && typeof data.note.evidence === 'string' && sources(data.note.sources);
}

function Sources({ sources }: { sources: Source[] }) {
  return <ul>{sources.map((source) => <li key={source.id}>{source.url.startsWith('https://') ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title} ({source.year}; {source.kind}; {source.population}; {source.band})</li>)}</ul>;
}

/** Exact parent review material; this component neither requests nor records a decision. */
export function FocusReview({ name, focus, review = true }: { name: string; focus: FocusReviewData; review?: boolean }) {
  return <section aria-label={`${name} training focus${review ? ' review' : ''}`}><h2>{name}: training focus</h2>{review && <p>Review the regions and evidence before deciding.</p>}<MuscleMap measured focus={{ primary: focus.claims.filter((claim) => claim.role === 'main').map((claim) => claim.key), secondary: focus.claims.filter((claim) => claim.role === 'helping').map((claim) => claim.key) }} /><h3>Documented regions</h3><ul>{focus.claims.map((claim, index) => <li key={`${claim.key}:${index}`}><strong>{claim.plain}</strong> — dossier label: {claim.role}; evidence: {claim.evidence}.<Sources sources={claim.sources} /></li>)}</ul><h3>Evidence limits</h3><p>{focus.note.text} Evidence: {focus.note.evidence}.</p><Sources sources={focus.note.sources} /></section>;
}
