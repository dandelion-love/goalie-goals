import { useEffect, useRef, useState } from 'react';
import { ApprovedExerciseDetail } from './ApprovedExerciseDetail';
import { validExercise, type CollectionExercise } from './CardCollection';
import { ProgressionTree, type RungState } from './ProgressionTree';
import { ParentProgressionReview } from './ParentProgressionReview';
import { TradingCard } from './CardTile';
import { collectionArtwork } from './collectionArtwork';
import { isFocusReviewData, type FocusReviewData } from './FocusReview';
import { ParentFocusReview } from './ParentFocusReview';
import { FocusCardBack } from './FocusCardBack';

/** Role-authorized projections only; browsing does not post or change any household state. */
export function ProgressionLibrary({ fetchImpl = fetch, refresh = 0, held = false, parent = false }: { fetchImpl?: typeof fetch; refresh?: number; held?: boolean; parent?: boolean }) {
  const [cards, setCards] = useState<CollectionExercise[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [readiness, setReadiness] = useState<RungState>('unknown');
  const [focus, setFocus] = useState<FocusReviewData | null>(null);
  const [rank, setRank] = useState(0);
  const [current, setCurrent] = useState<string | null>(() => new URL(location.href).searchParams.get('progressionExercise'));
  const origin = useRef<HTMLButtonElement | null>(null);
  const seriesButtons = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    let active = true;
    setFailed(false); setReadiness('unknown'); setFocus(null);
    fetchImpl('/api/training/collection', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: { exercises?: unknown }) => { if (!Array.isArray(data.exercises) || !data.exercises.every(validExercise)) throw new Error(); if (active) setCards(data.exercises); })
      .catch(() => { if (active) setFailed(true); });
    fetchImpl('/api/history/squat-evidence', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(async (r) => r.ok ? r.json() : Promise.reject()).then((data: { status?: string }) => { if (active && (data.status === 'held' || data.status === 'one-qualifying' || data.status === 'ready-for-parent')) setReadiness(data.status); }).catch(() => {});
    fetchImpl('/api/focus/squat-to-box', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(async (r) => r.ok ? r.json() : Promise.reject()).then((data: { focus?: unknown }) => { if (active && isFocusReviewData(data.focus)) setFocus(data.focus); }).catch(() => {});
    return () => { active = false; };
  }, [fetchImpl, refresh, attempt]);
  useEffect(() => {
    const pop = () => { const next = new URL(location.href).searchParams.get('progressionExercise'); setCurrent(next); if (!next) requestAnimationFrame(() => origin.current?.focus()); };
    window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop);
  }, []);
  const open = (id: string, button: HTMLButtonElement | null) => { origin.current = button; const url = new URL(location.href); url.searchParams.set('progressionExercise', id); window.history.pushState({ ...window.history.state, progressionStep: true }, '', url); setCurrent(id); };
  const back = () => { if (window.history.state?.progressionStep) window.history.back(); else { const url = new URL(location.href); url.searchParams.delete('progressionExercise'); window.history.replaceState(window.history.state, '', url); setCurrent(null); requestAnimationFrame(() => origin.current?.focus()); } };
  if (failed) return <article className="card"><p>Progression cards could not be loaded.</p><button onClick={() => setAttempt((n) => n + 1)}>Try again</button></article>;
  if (!cards) return <p role="status">Loading progression cards…</p>;
  const selected = current ? cards.find((card) => card.id === current) : undefined;
  const before = cards.find((card) => card.id === 'squat-to-box');
  const after = cards.find((card) => card.id === 'squat-to-box-pause');
  const comparison = rank === 0 ? before : after;
  return <><div hidden={!!current}>
    {before && after && !held && comparison && <section aria-label="Squat progression"><h2>Squat progression</h2><p role="status">Bronze to Silver earned.</p>
      <div className="rank-selector" aria-label="Choose squat rank"><button type="button" aria-pressed={rank === 0} onClick={() => setRank(0)}>Bronze</button><button type="button" aria-pressed={rank === 1} onClick={() => setRank(1)}>Silver</button></div>
      <div className="comparison-card"><TradingCard key={comparison.id} kind="Exercise" name={comparison.name} level={rank + 1} series="Squat" footer={`Squat · ${rank ? 'Silver' : 'Bronze'}`} state={rank ? 'Earned' : 'Previous'} summary={comparison.dossier?.headline} artwork={collectionArtwork[comparison.id]} fallbackArtwork={comparison.figureUrl} buttonRef={(node) => { if (node) seriesButtons.current.set(comparison.id, node); else seriesButtons.current.delete(comparison.id); }} onOpen={() => open(comparison.id, seriesButtons.current.get(comparison.id) ?? null)} backFace={<FocusCardBack name={comparison.name} focus={rank === 0 ? focus : null} />} /></div>
    </section>}
    <ProgressionTree cards={cards.map((card) => ({ id: card.id, figureUrl: card.figureUrl, headline: card.dossier?.headline }))} states={{ 'squat-to-box': held ? 'held' : readiness }} onOpen={open} />
    {parent && <><ParentProgressionReview fetchImpl={fetchImpl} onChanged={() => setAttempt((n) => n + 1)} /><ParentFocusReview fetchImpl={fetchImpl} onChanged={() => setAttempt((n) => n + 1)} /></>}
  </div>{current && (selected ? <ApprovedExerciseDetail exercise={selected} fetchImpl={fetchImpl} onBack={back} /> : <article className="card"><p>This exercise is not available.</p><button onClick={back}>Back</button></article>)}</>;
}