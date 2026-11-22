import { useState } from 'react';
import { TradingCard } from './CardTile';
import { collectionArtwork } from './collectionArtwork';
import { RUNGS, type Rung } from './ladders';
import { rankForRung } from './cardRank';

const families = [
  { name: 'Strength', ladders: ['Squat', 'Hinge', 'Single-leg', 'Push', 'Pull'] },
  { name: 'Trunk', ladders: ['Anti-extension', 'Anti-rotation', 'Lateral flexion'] },
  { name: 'Movement and jumps', ladders: ['Lateral movement', 'Jump and land', 'Reactive ankle'] },
  { name: 'Goalkeeper actions', ladders: ['Set position', 'Footwork', 'Collapse and low dive', 'High catch', 'Punch'] },
] as const;
type AvailableCard = { id: string; figureUrl?: string; headline?: string };
export type RungState = 'unknown' | 'held' | 'one-qualifying' | 'ready-for-parent';

/** Read-only tree. Only the caller's role-authorized card projection can open a rung. */
export function ProgressionTree({ cards, states = {}, onOpen }: { cards: readonly AvailableCard[]; states?: Readonly<Record<string, RungState>>; onOpen: (id: string) => void }) {
  const [family, setFamily] = useState<string | null>(null);
  const [ladder, setLadder] = useState<string | null>(null);
  const selected = families.find((entry) => entry.name === family);
  const openRung = (rung: Rung) => { const next = families.find((entry) => (entry.ladders as readonly string[]).includes(rung.ladder)); if (next) { setFamily(next.name); setLadder(rung.ladder); } };
  return <section aria-label="Progression library"><h2>Progression library</h2>
    {!selected ? <><p>Choose a movement family.</p><div className="tree-choices">{families.map((entry) => <button key={entry.name} type="button" onClick={() => setFamily(entry.name)}>{entry.name}</button>)}</div></> : !ladder ? <><button className="secondary" type="button" onClick={() => setFamily(null)}>Back to families</button><h3>{selected.name}</h3><p>Choose a ladder.</p><div className="tree-choices">{selected.ladders.map((name) => <button key={name} type="button" onClick={() => setLadder(name)}>{name}</button>)}</div></> : <><button className="secondary" type="button" onClick={() => setLadder(null)}>Back to {selected.name}</button><h3>{ladder}</h3><p>Browsing does not change a plan or grant approval.</p><div className="collection-grid">{RUNGS.filter((rung) => rung.ladder === ladder).sort((a, b) => a.rung - b.rung).map((rung) => {
      const card = cards.find((item) => item.id === rung.id);
      const status = states[rung.id];
      const state = !card ? 'Unavailable' : status === 'held' ? 'On hold' : status === 'ready-for-parent' ? 'Ready for parent consideration' : status === 'one-qualifying' ? 'One qualifying session' : 'Approved; readiness unknown';
      const rank = rankForRung(rung.rung)?.name ?? `Rung ${rung.rung}`;
      return <div key={rung.id}><TradingCard kind="Exercise" name={rung.name} level={rung.rung} series={rung.ladder} footer={`${rung.ladder} · ${rank}`} state={state} locked={!card} summary={card?.headline} artwork={collectionArtwork[rung.id]} fallbackArtwork={card?.figureUrl} onOpen={card ? () => onOpen(rung.id) : undefined} />{rung.needs.length > 0 && <p>Prerequisites: {rung.needs.map((id) => { const prerequisite = RUNGS.find((entry) => entry.id === id); return prerequisite ? <button type="button" className="secondary" key={id} onClick={() => openRung(prerequisite)}>{prerequisite.name}</button> : <span key={id}>{id} (unavailable)</span>; })}</p>}</div>;
    })}</div></>}
  </section>;
}
