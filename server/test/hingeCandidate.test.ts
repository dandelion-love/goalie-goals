import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { defaultContentRoot, loadContent } from '../src/content.js';

it('keeps the reviewed hinge candidate out of the live exercise library', () => {
  const root = defaultContentRoot();
  const candidate = resolve(root, 'progression-candidates', 'hinge');
  const card = JSON.parse(readFileSync(resolve(candidate, 'hip-hinge-wall-tap.json'), 'utf8'));
  const dossier = JSON.parse(readFileSync(resolve(candidate, 'hip-hinge-wall-tap.dossier.json'), 'utf8'));
  expect(card.approved).toBe(false);
  expect(dossier.approved).toBe(false);
  expect(dossier.id).toBe(card.id);
  expect(dossier.muscles.map).toEqual([]);
  expect(card.dose).toMatchObject({ kind: 'reps', sets: 2, reps: 10, rest_s: 60 });
  const live = loadContent(root);
  expect(live.cards.has(card.id)).toBe(false);
  expect(live.dossiers?.has(card.id)).toBe(false);
});
