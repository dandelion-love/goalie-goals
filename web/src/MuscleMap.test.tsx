import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MuscleMap } from './MuscleMap';
afterEach(cleanup);
it('shows documented groups as text alongside front and back views', () => {
  render(<MuscleMap focus={{ primary: ['quads'], secondary: ['hamstrings', 'calves'], note: 'Adult evidence only.' }} />);
  expect(screen.getByText(/Front of thighs/)).toBeTruthy();
  expect(screen.getByText(/Back of thighs, Calves/)).toBeTruthy();
  expect(screen.getByRole('img', { name: /front training focus/ })).toBeTruthy();
  expect(screen.getByRole('img', { name: /back training focus/ })).toBeTruthy();
  expect(screen.getByText('Adult evidence only.')).toBeTruthy();
});
it('shows unavailable or unmapped evidence instead of inventing a claim', () => {
  const { rerender } = render(<MuscleMap focus={null} />);
  expect(screen.getByText(/not available/)).toBeTruthy();
  rerender(<MuscleMap focus={{ primary: ['unknown'], secondary: [] }} />);
  expect(screen.getByText(/cannot be mapped/)).toBeTruthy();
  expect(screen.getByText(/unknown/)).toBeTruthy();
});
