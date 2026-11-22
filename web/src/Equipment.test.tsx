import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Equipment } from './Equipment';

afterEach(cleanup);

describe('parent equipment setting', () => {
  it.each([
    ['available', 'Owned. Show ownership details', 'CheckCircleOutlinedIcon'],
    ['unavailable', 'Not owned. Show ownership details', 'NotInterestedOutlinedIcon'],
    ['unknown', 'Ownership unknown. Show ownership details', 'HelpOutlineOutlinedIcon'],
  ])('identifies %s by icon shape and accessible label', async (gloves, label, icon) => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ gloves }), { status: 200 })) as unknown as typeof fetch;
    render(<Equipment fetchImpl={fetchImpl} />);
    expect((await screen.findByRole('button', { name: label })).querySelector(`[data-testid="${icon}"]`)).toBeTruthy();
    expect(screen.queryByText(/Ownership recorded/)).toBeNull();
  });
  it('cancels without writing and saves a confirmed parent choice', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => new Response(
      JSON.stringify({ gloves: init?.method === 'PUT' ? 'available' : 'unknown', acquiredAt: init?.method === 'PUT' ? '2026-01-01T12:00:00.000Z' : null }), { status: 200 },
    )) as unknown as typeof fetch;
    const changed = vi.fn();
    render(<Equipment fetchImpl={fetchImpl} onChange={changed} />);
    const control = await screen.findByRole('button', { name: /Show ownership details/ });
    await waitFor(() => expect((control as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(control);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change' })));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    await waitFor(() => expect(document.activeElement).toBe(control));
    expect(screen.queryByText('Owned')).toBeNull();
    expect(screen.queryByText(/Ownership recorded/)).toBeNull();
    expect(control.getAttribute('aria-label')).toContain('Owned');
    fireEvent.click(control);
    expect(screen.getByText(/Ownership recorded/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(document.activeElement).toBe(control));
  });
  it('retries a failed load and can explicitly clear ownership to unknown', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      if (fetchImpl.mock.calls.length === 1) return new Response('', { status: 503 });
      return new Response(JSON.stringify(init?.method === 'PUT' ? { gloves: 'unknown', acquiredAt: null } : { gloves: 'available', acquiredAt: null }), { status: 200 });
    });
    render(<Equipment fetchImpl={fetchImpl as unknown as typeof fetch} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry ownership' }));
    const control = await screen.findByRole('button', { name: 'Owned. Show ownership details' });
    fireEvent.click(control);
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not sure' }));
    expect(await screen.findByRole('button', { name: 'Ownership unknown. Show ownership details' })).toBeTruthy();
    expect(JSON.parse(fetchImpl.mock.calls.at(-1)![1]!.body as string)).toEqual({ gloves: 'unknown' });
  });
  it('preserves legacy ownership without inventing a date', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ gloves: 'available' }), { status: 200 })) as unknown as typeof fetch;
    render(<Equipment fetchImpl={fetchImpl} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Owned. Show ownership details' }));
    expect(screen.getByText('Ownership date unavailable')).toBeTruthy();
  });
});
