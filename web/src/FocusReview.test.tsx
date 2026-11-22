import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FocusReview } from './FocusReview';
afterEach(cleanup);
it('shows every region, source and limitation for the parent to review', () => {
  const source = { id: 's', title: 'Example study', url: 'https://example.org/study', kind: 'trial', population: 'adult', band: 'adults', year: 2020 };
  render(<FocusReview name="Example" focus={{ claims: [{ key: 'quads', plain: 'Front thighs', role: 'main', evidence: 'adult', sources: [source] }], note: { text: 'The study involved adults.', evidence: 'adult', sources: [source] } }} />);
  expect(screen.getByText('Front thighs')).toBeTruthy();
  expect(screen.getByText(/The study involved adults/)).toBeTruthy();
  expect(screen.getAllByRole('link', { name: 'Example study' })).toHaveLength(2);
  expect(screen.getAllByText(/2020; trial; adult; adults/)).toHaveLength(2);
  expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
});
