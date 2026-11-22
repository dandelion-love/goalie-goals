import { expect, it } from 'vitest';
import { loadContent } from '../src/content.js';
import { prepareFocusDraft } from '../src/muscleEvidence.js';
it('retains documented focus, source details and qualification for review', () => {
  const dossier = loadContent().dossiers!.get('squat-to-box')!.dossier;
  const draft = prepareFocusDraft(dossier)!;
  expect(draft.claims.map((claim) => [claim.key, claim.role])).toEqual([['quads', 'main'], ['hamstrings', 'helping'], ['calves', 'helping']]);
  expect(draft.claims[0].sources[0].id).toBe('slater-2017');
  expect(draft.note.evidence).toBe('adult');
  expect(draft.note.text).toContain('adults');
});
it('rejects missing citations rather than inventing evidence', () => {
  const dossier = structuredClone(loadContent().dossiers!.get('squat-to-box')!.dossier);
  const muscles = dossier.muscles as { map: { sources: string[] }[] };
  muscles.map[0].sources = ['missing-source'];
  expect(prepareFocusDraft(dossier)).toBeNull();
});
it('rejects an evidence label that does not match its cited population', () => {
  const dossier = structuredClone(loadContent().dossiers!.get('squat-to-box')!.dossier);
  const muscles = dossier.muscles as { map: { evidence: string }[] };
  muscles.map[0].evidence = 'youth';
  expect(prepareFocusDraft(dossier)).toBeNull();
});
