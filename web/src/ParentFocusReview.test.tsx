import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ParentFocusReview } from './ParentFocusReview';

afterEach(cleanup);
it('shows the exact preview before a separate parent decision', async () => {
  const focus = { claims: [], note: { text: 'Adult evidence only.', evidence: 'adult', sources: [] } };
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => ({ ok: true, json: async () => init?.method === 'POST' ? { ok: true } : { itemVersion: 'version-1', focus } }));
  const changed = vi.fn();
  render(<ParentFocusReview fetchImpl={fetcher as unknown as typeof fetch} onChanged={changed} />);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Review squat focus' }));
  expect(await screen.findByText(/Adult evidence only/)).toBeTruthy();
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Approve training focus' }));
  expect(await screen.findByText('Training focus approved.')).toBeTruthy();
  expect(JSON.parse(fetcher.mock.calls[1][1]!.body as string)).toEqual({ itemVersion: 'version-1' });
  expect(changed).toHaveBeenCalledOnce();
});
