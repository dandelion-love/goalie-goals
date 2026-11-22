import { useEffect, useRef, useState } from 'react';
import { TradingCard } from './CardTile';
import { DossierView } from './DossierScreens';
import { isDossier, type Dossier } from './dossier';
import { equipmentIds, equipmentName, relationship, type EquipmentExercise } from './equipmentModel';
import { RUNGS } from './ladders';
import { collectionArtwork } from './collectionArtwork';

type Exercise = EquipmentExercise & { itemVersion: string; figureUrl: string };
type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; exercises: Exercise[] };
type Place = { item: string | null; exercise: string | null };
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
function validExercise(value: unknown): value is Exercise {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  const n = e.needs as Record<string, unknown> | null;
  return typeof e.id === 'string' && typeof e.itemVersion === 'string' && typeof e.name === 'string' && typeof e.why === 'string'
    && strings(e.setup) && strings(e.cautions) && typeof e.figureUrl === 'string' && e.figureUrl.startsWith('/api/training/cards/')
    && (n === null || (typeof n === 'object' && strings(n.all) && Array.isArray(n.any) && n.any.every(strings)))
    && (e.dossier === null || isDossier(e.dossier));
}
const readPlace = (): Place => { const p = new URL(location.href).searchParams; return { item: p.get('collectionItem'), exercise: p.get('collectionExercise') }; };
const keyOf = (p: Place) => `${p.item ?? ''}|${p.exercise ?? ''}`;

export function CardCollection({ fetchImpl = fetch, refresh = 0 }: { fetchImpl?: typeof fetch; refresh?: number }) {
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [place, setPlace] = useState<Place>(readPlace);
  const prior = useRef(place);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const scroll = useRef(new Map<string, number>());
  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    fetchImpl('/api/training/collection', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((body: { exercises?: unknown }) => { if (!Array.isArray(body.exercises) || !body.exercises.every(validExercise)) throw new Error(); if (live) setState({ kind: 'ready', exercises: body.exercises }); })
      .catch(() => { if (live) setState({ kind: 'error' }); });
    return () => { live = false; };
  }, [fetchImpl, refresh, attempt]);
  useEffect(() => {
    const pop = () => {
      const old = prior.current, next = readPlace();
      prior.current = next; setPlace(next);
      if (new URL(location.href).searchParams.get('view') !== 'library') return;
      requestAnimationFrame(() => {
        const origin = old.exercise && !next.exercise ? `exercise:${old.exercise}` : old.item && !next.item ? `item:${old.item}` : old.item && next.exercise ? `item:${old.item}` : '';
        const button = buttons.current.get(origin);
        const pane = button?.closest<HTMLElement>('.role-content');
        if (pane) pane.scrollTop = scroll.current.get(keyOf(next)) ?? 0;
        button?.focus();
      });
    };
    window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop);
  }, []);
  const go = (next: Place, event: HTMLButtonElement) => {
    scroll.current.set(keyOf(place), event.closest<HTMLElement>('.role-content')?.scrollTop ?? 0);
    const url = new URL(location.href);
    if (next.item) url.searchParams.set('collectionItem', next.item); else url.searchParams.delete('collectionItem');
    if (next.exercise) url.searchParams.set('collectionExercise', next.exercise); else url.searchParams.delete('collectionExercise');
    window.history.pushState({ ...window.history.state, collectionStep: true }, '', url); prior.current = next; setPlace(next);
  };
  const back = (fallback: Place) => {
    if (window.history.state?.collectionStep) { window.history.back(); return; }
    const url = new URL(location.href);
    if (fallback.item) url.searchParams.set('collectionItem', fallback.item); else url.searchParams.delete('collectionItem');
    if (fallback.exercise) url.searchParams.set('collectionExercise', fallback.exercise); else url.searchParams.delete('collectionExercise');
    window.history.replaceState(window.history.state, '', url); prior.current = fallback; setPlace(fallback);
  };
  if (state.kind === 'loading') return <p role="status">Loading collection…</p>;
  if (state.kind === 'error') return <article className="card"><h2>Collection unavailable</h2><p>Cards could not be loaded.</p><button type="button" className="secondary" onClick={() => setAttempt((n) => n + 1)}>Try again</button></article>;
  const exercises = state.exercises;
  const items = equipmentIds(exercises).filter((id) => exercises.some((e) => relationship(e, id)));
  const item = place.item && items.includes(place.item) ? place.item : null;
  const exercise = place.exercise ? exercises.find((e) => e.id === place.exercise && (!item || relationship(e, item))) : null;
  if (place.item && !item) return <article className="card"><h2>Equipment unavailable</h2><p>This card is not available.</p><button className="secondary" onClick={() => back({ item: null, exercise: null })}>Back to collection</button></article>;
  if (place.exercise && !exercise) return <article className="card"><h2>Exercise unavailable</h2><p>This card is not available.</p><button className="secondary" onClick={() => back({ item, exercise: null })}>Back to collection</button></article>;
  const tile = (kind: 'Equipment' | 'Exercise', id: string, name: string, next: Place, artwork?: string) => <TradingCard level={kind === 'Exercise' ? RUNGS.find((r) => r.id === id)?.rung : undefined} key={`${kind}:${id}`} kind={kind} name={name} state={kind === 'Exercise' ? 'Approved; readiness not checked' : 'Availability not shared'} summary={kind === 'Exercise' ? exercises.find((e) => e.id === id)?.why : 'Used by approved exercises'} artwork={collectionArtwork[id]} fallbackArtwork={artwork} buttonRef={(node) => { const k = `${kind === 'Exercise' ? 'exercise' : 'item'}:${id}`; if (node) buttons.current.set(k, node); else buttons.current.delete(k); }} onOpen={() => { const node = buttons.current.get(`${kind === 'Exercise' ? 'exercise' : 'item'}:${id}`); if (node) go(next, node); }} />;
  if (exercise) return <article className="card"><h2>{exercise.name}</h2><div className="trading-card-hero"><TradingCard kind="Exercise" name={exercise.name} level={RUNGS.find((r) => r.id === exercise.id)?.rung} state="Approved; readiness not checked" summary={exercise.why} artwork={collectionArtwork[exercise.id]} fallbackArtwork={exercise.figureUrl} /></div><p>Exercise approved. Session readiness and other requirements still need checking.</p>
    <h3>Setup</h3>{exercise.setup.length ? <ul>{exercise.setup.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>Setup is not recorded.</p>}
    <h3>Cautions</h3>{exercise.cautions.length ? <ul>{exercise.cautions.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>Cautions are not recorded.</p>}
    <h3>Equipment used</h3><div className="collection-grid">{items.filter((id) => relationship(exercise, id)).map((id) => tile('Equipment', id, equipmentName(id), { item: id, exercise: null }))}</div>
    {exercise.dossier ? <details><summary>Dossier and sources</summary><p>This approved dossier is versioned separately from the exercise.</p><DossierView dossier={exercise.dossier as Dossier} level={3} /></details> : <p>An approved dossier is not available.</p>}
    <button className="secondary" onClick={() => back({ item, exercise: null })}>Back</button></article>;
  if (item) return <article className="card"><h2>{equipmentName(item)}</h2><div className="trading-card-hero"><TradingCard kind="Equipment" name={equipmentName(item)} state="Availability not shared" artwork={collectionArtwork[item]} /></div><p>Availability and item-specific fit are not shared here.</p><h3>Exercises using this item</h3><div className="collection-grid">{exercises.filter((e) => relationship(e, item)).map((e) => tile('Exercise', e.id, e.name, { item, exercise: e.id }, e.figureUrl))}</div><button className="secondary" onClick={() => back({ item: null, exercise: null })}>Back to collection</button></article>;
  const groups = new Map<string, Exercise[]>();
  for (const e of exercises) { const series = RUNGS.find((r) => r.id === e.id)?.ladder ?? 'Other exercises'; groups.set(series, [...(groups.get(series) ?? []), e]); }
  return <article className="card"><h2>Card collection</h2><p>Explore approved exercises and the equipment they use. Card views do not change readiness.</p>
    {exercises.length === 0 && <p>No approved exercise cards are available yet.</p>}
    {items.length > 0 && <><h3>Equipment</h3><div className="collection-grid">{items.map((id) => tile('Equipment', id, equipmentName(id), { item: id, exercise: null }))}</div></>}
    {[...groups].map(([name, entries]) => <section key={name}><h3>{name}</h3><div className="collection-grid">{entries.map((e) => tile('Exercise', e.id, e.name, { item: null, exercise: e.id }, e.figureUrl))}</div></section>)}
  </article>;
}
