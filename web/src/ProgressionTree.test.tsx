import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProgressionTree } from './ProgressionTree';
import { RUNGS } from './ladders';
afterEach(cleanup);
it('focuses one family and ladder, opens only authorized cards, and follows prerequisites', () => {
  const open = vi.fn();
  render(<ProgressionTree cards={[{ id: 'squat-to-box' }]} onOpen={open} />);
  fireEvent.click(screen.getByRole('button', { name: 'Strength' }));
  fireEvent.click(screen.getByRole('button', { name: 'Squat' }));
  expect(screen.getAllByText('Unavailable')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: /Exercise: Squat to box/ }));
  expect(open).toHaveBeenCalledWith('squat-to-box', expect.any(HTMLButtonElement));
  fireEvent.click(screen.getByRole('button', { name: 'Back to Strength' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back to families' }));
  fireEvent.click(screen.getByRole('button', { name: 'Movement and jumps' }));
  fireEvent.click(screen.getByRole('button', { name: 'Jump and land' }));
  fireEvent.click(screen.getByRole('button', { name: 'Free squat' }));
  expect(screen.getByRole('heading', { name: 'Squat', level: 3 })).toBeTruthy();
});
it('places every documented ladder under exactly one family', () => {
  render(<ProgressionTree cards={[]} onOpen={() => {}} />);
  const seen = new Map<string, number>();
  for (const family of ['Strength', 'Trunk', 'Movement and jumps', 'Goalkeeper actions']) {
    fireEvent.click(screen.getByRole('button', { name: family }));
    for (const name of new Set(RUNGS.map((rung) => rung.ladder))) if (screen.queryByRole('button', { name })) seen.set(name, (seen.get(name) ?? 0) + 1);
    fireEvent.click(screen.getByRole('button', { name: 'Back to families' }));
  }
  expect([...seen.keys()].sort()).toEqual([...new Set(RUNGS.map((rung) => rung.ladder))].sort());
  expect([...seen.values()].every((count) => count === 1)).toBe(true);
});
