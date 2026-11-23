import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { defaultContentRoot, loadContent } from '../src/content.js';

it('keeps the 14-repetition bridge candidate separate from the live 12-repetition card', () => {
  const root = defaultContentRoot();
  const candidate = JSON.parse(readFileSync(resolve(root, 'progression-candidates/bridge/glute-bridge-14.json'), 'utf8'));
  const live = loadContent(root).cards.get('glute-bridge')!.card;
  expect(candidate.approved).toBe(false);
  expect(candidate.dose).toMatchObject({ kind: 'reps', sets: 2, reps: 14, rest_s: 45 });
  expect(live.dose).toMatchObject({ kind: 'reps', sets: 2, reps: 12, rest_s: 45 });
  expect(candidate.stop_if).toEqual(live.stop_if);
  expect(candidate.media.figure).toBe(live.media.figure);
});
