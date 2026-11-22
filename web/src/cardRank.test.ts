import { expect, it } from 'vitest';
import { rankForRung } from './cardRank';
it('labels only real rungs with the five collection ranks', () => {
  expect([1, 2, 3, 4, 5].map((n) => rankForRung(n)?.name)).toEqual(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']);
  expect(rankForRung(0)).toBeUndefined();
  expect(rankForRung(6)).toBeUndefined();
});
