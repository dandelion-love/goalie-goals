import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ProgressionLibrary } from './ProgressionLibrary';

afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
it('opens only an approved projection, returns focus, and performs reads only', async () => {
  window.history.replaceState(null, '', '/?view=tree');
  const exercise = { id: 'squat-to-box', itemVersion: 'v1', name: 'Squat to box', why: 'Practise squatting', setup: ['Use a stable box'], cautions: ['Stop if sore'], needs: { all: ['other:step'], any: [] }, figureUrl: '/api/training/cards/squat-to-box/figure.svg?v=v1', dossier: { cardId: 'squat-to-box', itemVersion: 'd1', name: 'Squat to box', headline: 'Practice with control', why: [], expect: [], sources: [] } };
  const fetcher = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(String(url).includes('squat-evidence') ? { status: 'unknown' } : { exercises: [exercise] }), { status: 200 }));
  render(<ProgressionLibrary held fetchImpl={fetcher as unknown as typeof fetch} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Strength' }));
  fireEvent.click(screen.getByRole('button', { name: 'Squat' }));
  const card = screen.getByRole('button', { name: /Exercise: Squat to box/ });
  expect(screen.getByText('On hold')).toBeTruthy();
  fireEvent.click(card);
  expect(screen.getByText('Use a stable box')).toBeTruthy();
  const summary = screen.getByText('Dossier and sources');
  fireEvent.click(summary);
  expect(within(summary.closest('details')!).getByText('Practice with control')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  const returned = await screen.findByRole('button', { name: /Exercise: Squat to box/ });
  await waitFor(() => expect(document.activeElement).toBe(returned));
  expect(fetcher.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
});

it('reveals the approved squat transition with explicitly unavailable focus', async () => {
  const exercise = { id: 'squat-to-box', itemVersion: 'v1', name: 'Squat to box', why: 'Practice', setup: [], cautions: [], needs: null, figureUrl: '/api/training/cards/a', dossier: null };
  const next = { ...exercise, id: 'squat-to-box-pause', itemVersion: 'v2', name: 'Paused squat', figureUrl: '/api/training/cards/b' };
  const fetcher = vi.fn(async (url: string | URL | Request) => new Response(JSON.stringify(String(url).includes('squat-evidence') ? { status: 'ready-for-parent' } : { exercises: [exercise, next] }), { status: 200 }));
  render(<ProgressionLibrary fetchImpl={fetcher as unknown as typeof fetch} />);
  expect(await screen.findByText('Bronze to Silver earned.')).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Bronze, level 1' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Silver, level 2' })).toBeTruthy();
  expect(screen.getByText('Training focus is not available for the previous card.')).toBeTruthy();
  expect(screen.getByText('Training focus is not available for the next card.')).toBeTruthy();
  const button = screen.getByRole('button', { name: /Exercise: Paused squat/ });
  fireEvent.click(button);
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  await waitFor(() => expect(document.activeElement).toBe(button));
});
