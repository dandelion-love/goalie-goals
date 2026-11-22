import { useCallback, useEffect, useRef, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { Equipment } from './Equipment';
import { TradingCard } from './CardTile';
import { collectionArtwork } from './collectionArtwork';
import { DossierView } from './DossierScreens';
import { isDossier } from './dossier';
import { EquipmentSummary } from './EquipmentSummary';
import { cardRequirements, equipmentAlsoNeeds, equipmentEnables, equipmentIds, equipmentName, relationship, type EquipmentExercise } from './equipmentModel';
export { equipmentIds, relationship, type EquipmentExercise } from './equipmentModel';

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; exercises: EquipmentExercise[] };
type Place = { item: string | null; exercise: string | null };

function isEquipmentExercise(value: unknown): value is EquipmentExercise {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');
  const claim = (v: unknown) => !!v && typeof v === 'object' && typeof (v as Record<string, unknown>).text === 'string' && typeof (v as Record<string, unknown>).label === 'string' && Array.isArray((v as Record<string, unknown>).sources) && ((v as Record<string, unknown>).sources as unknown[]).every(Number.isInteger);
  const dossier = e.dossier;
  const validDossier = isDossier(dossier) && dossier.why.every(claim) && dossier.expect.every(claim)
    && (dossier.limits === undefined || (Array.isArray(dossier.limits) && dossier.limits.every(claim)))
    && dossier.sources.every((s) => !!s && Number.isInteger(s.n) && typeof s.title === 'string' && (s.url === null || (typeof s.url === 'string' && s.url.startsWith('https://'))));
  const needs = e.needs as Record<string, unknown> | null;
  return typeof e.id === 'string' && typeof e.name === 'string' && typeof e.why === 'string'
    && strings(e.setup) && strings(e.cautions)
    && (needs === null || (typeof needs === 'object' && strings(needs.all) && Array.isArray(needs.any) && needs.any.every(strings)))
    && (dossier === null || validDossier);
}

function requirements(ids: string[]): string {
  const equipment = ids.filter((id) => id !== 'body only');
  return (equipment.length ? equipment : ids).map(equipmentName).join(', ') || 'none recorded';
}

function readPlace(): Place {
  const params = new URL(window.location.href).searchParams;
  return { item: params.get('equipment'), exercise: params.get('exercise') };
}

export function EquipmentCatalog({ fetchImpl = fetch, onChange }: { fetchImpl?: typeof fetch; onChange?: () => void }) {
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [place, setPlace] = useState<Place>(readPlace);
  const itemButtons = useRef(new Map<string, HTMLButtonElement>());
  const exerciseButtons = useRef(new Map<string, HTMLButtonElement>());
  const exerciseItemButtons = useRef(new Map<string, HTMLButtonElement>());
  const summaryOrigin = useRef<{ item: string; exercise: string; token: string } | null>(null);
  const prior = useRef(place);
  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    fetchImpl('/api/equipment/exercises', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: { exercises?: unknown }) => { if (!Array.isArray(data.exercises) || !data.exercises.every(isEquipmentExercise)) throw new Error(); if (live) setState({ kind: 'ready', exercises: data.exercises }); })
      .catch(() => { if (live) setState({ kind: 'error' }); });
    return () => { live = false; };
  }, [fetchImpl, attempt]);
  useEffect(() => {
    const onPop = () => {
      const old = prior.current;
      const next = readPlace();
      prior.current = next;
      setPlace(next);
      if (new URL(window.location.href).searchParams.get('view') !== 'equipment') return;
      requestAnimationFrame(() => {
        if (!old.exercise && old.item && next.exercise) exerciseItemButtons.current.get(old.item)?.focus();
        else if (old.exercise && next.item && !next.exercise) {
          const origin = summaryOrigin.current;
          const target = origin?.item === next.item && origin.exercise === old.exercise
            ? [...document.querySelectorAll<HTMLButtonElement>('[data-evidence-origin]')].find((button) => button.dataset.evidenceOrigin === origin.token)
            : undefined;
          (target ?? exerciseButtons.current.get(old.exercise))?.focus();
          summaryOrigin.current = null;
        }
        else if (old.item && !next.item) itemButtons.current.get(old.item)?.focus();
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = useCallback((next: Place) => {
    const url = new URL(window.location.href);
    if (next.item) url.searchParams.set('equipment', next.item); else url.searchParams.delete('equipment');
    if (next.exercise) url.searchParams.set('exercise', next.exercise); else url.searchParams.delete('exercise');
    window.history.pushState({ ...window.history.state, equipmentStep: true }, '', url);
    prior.current = next;
    setPlace(next);
  }, []);
  const back = (fallback: Place) => {
    if (window.history.state?.equipmentStep) window.history.back(); else go(fallback);
  };

  if (state.kind === 'loading') return <p role="status">Loading equipment…</p>;
  if (state.kind === 'error') return <Card component="article" className="card"><CardContent><p>Could not load equipment relationships.</p><Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button></CardContent></Card>;
  const ids = equipmentIds(state.exercises);
  const item = place.item && ids.includes(place.item) ? place.item : null;
  const exercise = item && place.exercise ? state.exercises.find((e) => e.id === place.exercise && relationship(e, item)) : null;
  if (place.item && !item) return <Card component="article" className="card"><CardContent><h2>Equipment unavailable</h2><p>This item could not be found.</p><Button onClick={() => back({ item: null, exercise: null })}>Back to equipment</Button></CardContent></Card>;
  if (item && place.exercise && !exercise) return <Card component="article" className="card"><CardContent><h2>Exercise unavailable</h2><p>This link is no longer available.</p><Button onClick={() => back({ item, exercise: null })}>Back to item</Button></CardContent></Card>;
  if (exercise && item) return <Card component="article" className="card"><CardContent>
    <h2>{exercise.name}</h2><div className="trading-card-hero"><TradingCard kind="Exercise" name={exercise.name} state="Approval needs checking" summary={exercise.dossier?.headline ?? 'Benefits not available'} requirements={cardRequirements(exercise)} artwork={collectionArtwork[exercise.id]} /></div><p>{exercise.why}</p>
    {exercise.setup.length ? <><h3>Setup</h3><ul>{exercise.setup.map((s, i) => <li key={i}>{s}</li>)}</ul></> : <p>Setup is not recorded.</p>}
    {exercise.cautions.length ? <><h3>Cautions</h3><ul>{exercise.cautions.map((s, i) => <li key={i}>{s}</li>)}</ul></> : <p>Cautions are not recorded.</p>}
    {exercise.needs ? <><p>All required: {requirements(exercise.needs.all)}.</p>{exercise.needs.any.map((group, i) => <p key={i}>One of: {group.map(equipmentName).join(' or ')}.</p>)}<p>Availability, approval and readiness may still need checking.</p></> : <p>Requirements are not recorded.</p>}
    <h3>Equipment</h3><List>{equipmentIds([exercise]).filter((id) => relationship(exercise, id)).map((id) => <ListItemButton component="button" key={id} ref={(node) => { if (node) exerciseItemButtons.current.set(id, node); else exerciseItemButtons.current.delete(id); }} onClick={() => go({ item: id, exercise: null })}><ListItemText primary={`${equipmentName(id)} (${relationship(exercise, id)})`} /></ListItemButton>)}</List>
    {exercise.dossier ? <details><summary>Dossier and sources</summary><p>This approved dossier is versioned separately from the exercise.</p><DossierView dossier={exercise.dossier} level={3} /></details> : <p>An approved dossier is not available.</p>}
    <Button onClick={() => back({ item, exercise: null })}>Back to item</Button>
  </CardContent></Card>;
  if (item) {
    const linked = state.exercises.filter((e) => relationship(e, item));
    return <Card component="article" className="card"><CardContent>
      <h2>{equipmentName(item)}</h2><div className="trading-card-hero"><TradingCard kind="Equipment" name={equipmentName(item)} state="Availability needs checking" summary={equipmentEnables(item, state.exercises)} requirements={equipmentAlsoNeeds(item, state.exercises)} artwork={collectionArtwork[item]} /></div><p>The item's training role, fit and restrictions are not recorded. Alternatives are shown where an exercise declares them.</p>
      {item === 'other:goalkeeper-gloves' && <Equipment fetchImpl={fetchImpl} onChange={onChange} />}
      <h3>Exercises using this item</h3>
      {linked.length ? <List>{linked.map((e) => <ListItemButton component="button" key={e.id} ref={(node) => { if (node) exerciseButtons.current.set(e.id, node); else exerciseButtons.current.delete(e.id); }} onClick={() => { summaryOrigin.current = null; go({ item, exercise: e.id }); }}><ListItemText primary={e.name} secondary={`${relationship(e, item)}; other approvals and requirements still apply`} /></ListItemButton>)}</List> : <p>No known linked exercises.</p>}
      <EquipmentSummary item={item} exercises={linked} open={(id, token) => { summaryOrigin.current = { item, exercise: id, token }; go({ item, exercise: id }); }} />
      <Button onClick={() => back({ item: null, exercise: null })}>Back to equipment</Button>
    </CardContent></Card>;
  }
  return <Card component="article" className="card"><CardContent><h2>Equipment items</h2><p>Choose an item to see where it is used.</p><div className="collection-grid">{ids.map((id) => <TradingCard key={id} kind="Equipment" name={equipmentName(id)} state="Availability needs checking" summary={equipmentEnables(id, state.exercises)} requirements={equipmentAlsoNeeds(id, state.exercises)} artwork={collectionArtwork[id]} buttonRef={(node) => { if (node) itemButtons.current.set(id, node); else itemButtons.current.delete(id); }} onOpen={() => go({ item: id, exercise: null })} />)}</div></CardContent></Card>;
}
