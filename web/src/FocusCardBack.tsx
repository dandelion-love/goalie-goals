import { useRef } from 'react';
import { MuscleMap } from './MuscleMap';
import type { FocusReviewData } from './FocusReview';

/** A compact projection of the separately approved evidence, never an eligibility decision. */
export function FocusCardBack({ name, focus }: { name: string; focus: FocusReviewData | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (!focus) return <p>Training focus is not available for this card.</p>;
  const sources = [...new Map([...focus.claims.flatMap((claim) => claim.sources), ...focus.note.sources].map((source) => [source.id, source])).values()];
  return <><MuscleMap compact measured focus={{ primary: focus.claims.map((claim) => claim.key), secondary: [] }} /><p className="focus-qualification">Adult general-squat evidence; not a measure of individual strength.</p><button type="button" className="secondary" onClick={() => dialog.current?.showModal()}>Evidence and sources</button><dialog ref={dialog} aria-label={`${name} focus evidence`} className="focus-evidence-dialog"><h2>Evidence and sources</h2><p>{focus.note.text}</p><ul>{sources.map((source) => <li key={source.id}>{source.url.startsWith('https://') ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title} ({source.year}; {source.population}; {source.band})</li>)}</ul><button type="button" onClick={() => dialog.current?.close()}>Close</button></dialog></>;
}
