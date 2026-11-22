import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ParentProgressionReview } from './ParentProgressionReview';

it('lets the parent confirm evidence, inspect the candidate and explicitly approve the card', async () => {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input); calls.push(url);
    const data = url.endsWith('review-window') ? { sessions: [{ id: 'one', date: '2026-01-01', title: 'Session one' }, { id: 'two', date: '2026-01-03', title: 'Session two' }] }
      : url.endsWith('squat-attestation') ? { status: 'ready-for-parent' }
      : url.endsWith('review-offer') ? { id: 'offer-one', title: 'Paused squat', dose: '2 x 10', cues: ['Stand tall'], card: { steps: ['Pause'], stop_if: ['Pain'] }, dossier: { cardId: 'paused', itemVersion: 'v1', name: 'Paused squat', headline: 'About this card', why: [], expect: [], sources: [], musclesUnavailable: 'No reviewed muscle map is available.' } }
      : { ok: true };
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  const changed = vi.fn();
  render(<ParentProgressionReview fetchImpl={fetchImpl} onChanged={changed} />);
  expect(calls).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Check recorded sessions' }));
  await screen.findByText('2026-01-01: Session one');
  const selects = screen.getAllByRole('combobox');
  for (const select of selects) fireEvent.change(select, { target: { value: 'yes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm evidence' }));
  await screen.findByText('Ready to review the next card.');
  fireEvent.click(screen.getByRole('button', { name: 'Review next card' }));
  const card = await screen.findByRole('heading', { name: 'Paused squat' });
  const review = card.closest('article')!;
  expect(within(review).getByText('2 x 10')).toBeTruthy();
  expect(within(review).getByText(/separate approvals/)).toBeTruthy();
  fireEvent.click(within(review).getByText('Read the dossier'));
  expect(within(review).getByText('No reviewed muscle map is available.')).toBeTruthy();
  expect(calls.some((url) => url.endsWith('/approve'))).toBe(false);
  fireEvent.click(within(review).getByRole('button', { name: 'Approve this card' }));
  await waitFor(() => expect(calls).toContain('/api/progression/review-offer/offer-one/approve'));
  await screen.findByText('Card approved. The dossier needs its own approval.');
  expect(changed).toHaveBeenCalled();
});
