import type { ReactNode } from 'react';
import { TradingCard } from './CardTile';
import { DossierView } from './DossierScreens';
import { cardRequirements } from './equipmentModel';
import { RUNGS } from './ladders';
import { collectionArtwork } from './collectionArtwork';
import type { CollectionExercise } from './CardCollection';

/** Shared read-only detail for an already authorized collection projection. */
export function ApprovedExerciseDetail({ exercise, equipment, onBack }: { exercise: CollectionExercise; equipment?: ReactNode; onBack: () => void }) {
  const rung = RUNGS.find((entry) => entry.id === exercise.id);
  return <article className="card"><h2>{exercise.name}</h2><div className="trading-card-hero"><TradingCard kind="Exercise" name={exercise.name} level={rung?.rung} series={rung?.ladder} requirements={cardRequirements(exercise)} state="Approved; readiness not checked" summary={exercise.dossier?.headline ?? 'Benefits not available'} artwork={collectionArtwork[exercise.id]} fallbackArtwork={exercise.figureUrl} /></div><p>{exercise.why}</p><p>Exercise approved. Session readiness and other requirements still need checking.</p>
    <h3>Setup</h3>{exercise.setup.length ? <ul>{exercise.setup.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>Setup is not recorded.</p>}
    <h3>Cautions</h3>{exercise.cautions.length ? <ul>{exercise.cautions.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>Cautions are not recorded.</p>}
    {equipment && <><h3>Equipment used</h3>{equipment}</>}
    {exercise.dossier ? <details><summary>Dossier and sources</summary><p>This approved dossier is versioned separately from the exercise.</p><DossierView dossier={exercise.dossier} level={3} /></details> : <p>An approved dossier is not available.</p>}
    <button className="secondary" onClick={onBack}>Back</button></article>;
}
