import Button from '@mui/material/Button';
import type { DossierClaim, DossierSource } from './dossier';
import { equipmentName, relationship, type EquipmentExercise } from './equipmentModel';

type Contribution = { exercise: EquipmentExercise; sources: DossierSource[] };
type Group = { claim: DossierClaim; contributors: Contribution[] };

/** Group by reviewed identity, or identical keep-up guidance with matching canonical sources. */
export function groupedBenefits(exercises: EquipmentExercise[]): Group[] {
  const groups: Group[] = [];
  const byIdentity = new Map<string, Group>();
  for (const exercise of new Map(exercises.map((e) => [e.id, e])).values()) {
    const dossier = exercise.dossier;
    if (!dossier) continue;
    for (const [section, claim] of [...dossier.why.map((c) => ['why', c] as const), ...dossier.expect.map((c) => ['expect', c] as const)]) {
      if (!claim.sources.length) continue;
      const sources = dossier.sources.filter((s) => claim.sources.includes(s.n));
      if (sources.length !== new Set(claim.sources).size) continue;
      const qualifiers = [section, claim.text, claim.label, claim.evidence ?? null, claim.detail ?? null];
      const canonical = section === 'expect' && claim.label === 'Keep it up' && claim.evidence && sources.every((source) => source.url) ? sources.map((source) => source.url).sort() : null;
      const identity = claim.groupId ? ['reviewed', claim.groupId] : canonical ? ['identical', canonical] : null;
      const signature = identity ? JSON.stringify([identity, ...qualifiers]) : null;
      const existing = signature ? byIdentity.get(signature) : undefined;
      const group = existing ?? { claim, contributors: [] };
      if (!existing) { groups.push(group); if (signature) byIdentity.set(signature, group); }
      if (!group.contributors.some((c) => c.exercise.id === exercise.id)) group.contributors.push({ exercise, sources });
    }
  }
  return groups;
}

function Sources({ sources }: { sources: DossierSource[] }) {
  return <ul>{sources.map((source) => <li key={source.n}>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title}</li>)}</ul>;
}

export function EquipmentSummary({ item, exercises, open }: { item: string; exercises: EquipmentExercise[]; open: (id: string, origin: string) => void }) {
  const linked = [...new Map(exercises.filter((e) => relationship(e, item)).map((e) => [e.id, e])).values()];
  const benefits = groupedBenefits(linked);
  if (!linked.length) return <p>No linked exercises are known, so their gains and requirements are unknown.</p>;
  return <section aria-label="Exercise evidence summary">
    <h3>What linked exercises may add</h3>
    <p>These are exercise effects, not facts about the equipment. Dossiers are approved separately from exercise versions.</p>
    {benefits.length ? benefits.map((group, i) => <div key={i}>
      <p><strong>{group.claim.label}:</strong> {group.claim.text} {group.claim.evidence && <span>Evidence: {group.claim.evidence}.</span>} {group.claim.detail}</p>
      {group.contributors.map(({ exercise, sources }) => <div key={exercise.id}><Button data-evidence-origin={`${i}:${exercise.id}`} onClick={() => open(exercise.id, `${i}:${exercise.id}`)}>{exercise.name}</Button><Sources sources={sources} /></div>)}
    </div>) : <p>No sourced exercise benefits are available.</p>}
    {linked.filter((e) => !e.dossier).map((e) => <p key={e.id}>Evidence for {e.name} is unavailable; its benefits and limitations are unknown.</p>)}
    <h3>Trade-offs and what is still needed</h3>
    {linked.map((e) => <section key={e.id} aria-label={`${e.name} requirements`}>
      <h4>{e.name}</h4>
      <p>{relationship(e, item) === 'required' ? `This exercise requires ${equipmentName(item)}.` : `One declared option: ${equipmentName(item)}.`} Availability, approval and readiness still need checking.</p>
      {e.needs ? <>
        {e.needs.all.filter((id) => id !== item && id !== 'body only').length > 0 && <p>Also required: {e.needs.all.filter((id) => id !== item && id !== 'body only').map(equipmentName).join(', ')}.</p>}
        {e.needs.any.map((group, i) => <p key={i}>One of: {group.map(equipmentName).join(' or ')}{group.includes(item) && group.length > 1 ? '; another option may be used if available' : ''}.</p>)}
      </> : <p>Other requirements are unknown.</p>}
      {e.setup.length ? <><p>Setup and space:</p><ul>{e.setup.map((s, i) => <li key={i}>{s}</li>)}</ul></> : <p>Setup and space are unknown.</p>}
      {e.cautions.length ? <><p>Cautions:</p><ul>{e.cautions.map((c, i) => <li key={i}>{c}</li>)}</ul></> : <p>Cautions are not recorded.</p>}
      {e.dossier?.limits?.length ? <><p>Evidence limitations:</p>{e.dossier.limits.map((c, i) => <div key={i}><p>{c.text} {c.evidence && <span>Evidence: {c.evidence}.</span>} {c.detail}</p><Sources sources={e.dossier!.sources.filter((s) => c.sources.includes(s.n))} /></div>)}</> : <p>Additional evidence limitations are unavailable.</p>}
    </section>)}
  </section>;
}
