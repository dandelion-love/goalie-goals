import { MuscleMap } from './MuscleMap';

type Source = { id: string; url: string; title: string; kind: string; population: string; band: string; year: number };
type Claim = { key: string; plain: string; role: 'main' | 'helping'; evidence: string; sources: Source[] };
export type FocusReviewData = { claims: Claim[]; note: { text: string; evidence: string; sources: Source[] } };

function Sources({ sources }: { sources: Source[] }) {
  return <ul>{sources.map((source) => <li key={source.id}>{source.url.startsWith('https://') ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title} ({source.year}; {source.kind}; {source.population}; {source.band})</li>)}</ul>;
}

/** Exact parent review material; this component neither requests nor records a decision. */
export function FocusReview({ name, focus }: { name: string; focus: FocusReviewData }) {
  return <section aria-label={`${name} training focus review`}><h2>{name}: training focus</h2><p>Review the regions and evidence before deciding.</p><MuscleMap focus={{ primary: focus.claims.filter((claim) => claim.role === 'main').map((claim) => claim.key), secondary: focus.claims.filter((claim) => claim.role === 'helping').map((claim) => claim.key) }} /><h3>Documented regions</h3><ul>{focus.claims.map((claim, index) => <li key={`${claim.key}:${index}`}><strong>{claim.plain}</strong> — {claim.role === 'main' ? 'Primary' : 'Secondary'}; evidence: {claim.evidence}.<Sources sources={claim.sources} /></li>)}</ul><h3>Evidence limits</h3><p>{focus.note.text} Evidence: {focus.note.evidence}.</p><Sources sources={focus.note.sources} /></section>;
}
