import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { TradingCard } from './CardTile';
import { DossierView } from './DossierScreens';
import { cardRequirements } from './equipmentModel';
import { RUNGS } from './ladders';
import { collectionArtwork } from './collectionArtwork';
import type { CollectionExercise } from './CardCollection';
import { FocusCardBack } from './FocusCardBack';
import { isFocusReviewData, type FocusReviewData } from './FocusReview';

/** Shared read-only detail for an already authorized collection projection. */
export function ApprovedExerciseDetail({ exercise, equipment, onBack, fetchImpl = fetch }: { exercise: CollectionExercise; equipment?: ReactNode; onBack: () => void; fetchImpl?: typeof fetch }) {
  const rung = RUNGS.find((entry) => entry.id === exercise.id);
  const [focus, setFocus] = useState<FocusReviewData | null>(null);
  useEffect(() => {
    let active = true; setFocus(null);
    if (exercise.id === 'squat-to-box') fetchImpl('/api/focus/squat-to-box', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(async (response) => response.ok ? response.json() : Promise.reject()).then((value: { focus?: unknown }) => { if (active && isFocusReviewData(value.focus)) setFocus(value.focus); }).catch(() => {});
    return () => { active = false; };
  }, [exercise.id, fetchImpl]);
  return <article className="card"><div className="trading-card-hero"><TradingCard key={exercise.id} kind="Exercise" name={exercise.name} level={rung?.rung} series={rung?.ladder} requirements={cardRequirements(exercise)} state="Approved; readiness not checked" summary={exercise.dossier?.headline ?? 'Benefits not available'} artwork={collectionArtwork[exercise.id]} fallbackArtwork={exercise.figureUrl} headerAction={<IconButton aria-label="Back" onClick={onBack}><ArrowBackIcon /></IconButton>} backFace={<FocusCardBack name={exercise.name} focus={focus} />} /></div>
    <p>Exercise approved. Session readiness and other requirements still need checking.</p>
    {equipment && <><h3>Equipment used</h3>{equipment}</>}
    <details><summary>Setup and cautions</summary><p>{exercise.why}</p><h3>Setup</h3>{exercise.setup.length ? <ul>{exercise.setup.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>Setup is not recorded.</p>}<h3>Cautions</h3>{exercise.cautions.length ? <ul>{exercise.cautions.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>Cautions are not recorded.</p>}</details>
    {exercise.dossier ? <details><summary>Dossier and sources</summary><p>This approved dossier is versioned separately from the exercise.</p><DossierView dossier={exercise.dossier} level={3} /></details> : <p>An approved dossier is not available.</p>}
  </article>;
}
