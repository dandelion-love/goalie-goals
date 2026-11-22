import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Equipment } from './Equipment';

afterEach(cleanup);

describe('parent equipment setting', () => {
  it('cancels without writing and saves a confirmed parent choice', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => new Response(
      JSON.stringify({ gloves: init?.method === 'PUT' ? 'available' : 'unknown', acquiredAt: init?.method === 'PUT' ? '2026-01-01T12:00:00.000Z' : null }), { status: 200 },
    )) as unknown as typeof fetch;
    const changed = vi.fn();
    render(<Equipment fetchImpl={fetchImpl} onChange={changed} />);
    const control = await screen.findByRole('button', { name: 'Change glove ownership' });
    await waitFor(() => expect((control as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(control);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    fireEvent.click(control);
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(screen.getByText('Owned')).toBeTruthy();
    expect(screen.getByText(/Ownership recorded/)).toBeTruthy();
  });
  it('preserves legacy ownership without inventing a date', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ gloves: 'available' }), { status: 200 })) as unknown as typeof fetch;
    render(<Equipment fetchImpl={fetchImpl} />);
    expect(await screen.findByText('Ownership date unavailable')).toBeTruthy();
  });
});
