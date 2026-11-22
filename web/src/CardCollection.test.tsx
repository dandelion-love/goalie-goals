import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CardCollection } from './CardCollection';

const exercise = { id: 'wall-chest-pass', itemVersion: 'v1', name: 'Wall pass', why: 'Practise passing', setup: ['Find a wall'], cautions: ['Stop if sore'], needs: { all: ['other:goalkeeper-gloves', 'ball'], any: [] }, figureUrl: '/api/training/cards/pass/figure', dossier: null };
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
it('uses the keeper projection and navigates between equipment and approved exercise cards', async () => {
  window.history.replaceState(null, '', '/?view=library');
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ exercises: [exercise] }), { status: 200 })) as unknown as typeof fetch;
  render(<CardCollection fetchImpl={fetcher} />);
  const gloves = await screen.findByRole('button', { name: /Equipment: Goalkeeper gloves/ });
  expect(screen.getByText('Benefits not available')).toBeTruthy();
  expect(fetcher).toHaveBeenCalledWith('/api/training/collection', expect.objectContaining({ cache: 'no-store' }));
  fireEvent.click(gloves);
  fireEvent.click(screen.getByRole('button', { name: /Exercise: Wall pass/ }));
  expect(screen.getByText('Find a wall')).toBeTruthy();
  expect(screen.getByText(/readiness and other requirements/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  const link = await screen.findByRole('button', { name: /Exercise: Wall pass/ });
  await waitFor(() => expect(document.activeElement).toBe(link));
});
it('shows a retry when the collection cannot be loaded', async () => {
  const fetcher = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch;
  render(<CardCollection fetchImpl={fetcher} />);
  expect(await screen.findByRole('heading', { name: 'Collection unavailable' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
});
it('uses the approved dossier headline on the card face', async () => {
  const dossier = { cardId: exercise.id, itemVersion: 'd1', name: exercise.name, headline: 'Practice with control', why: [], expect: [], sources: [] };
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ exercises: [{ ...exercise, dossier }] }), { status: 200 })) as unknown as typeof fetch;
  render(<CardCollection fetchImpl={fetcher} />);
  expect(await screen.findByText('Practice with control')).toBeTruthy();
});
