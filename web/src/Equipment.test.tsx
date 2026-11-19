import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Equipment } from './Equipment';

afterEach(cleanup);

describe('parent equipment setting', () => {
  it('explains missing gloves and saves the parent choice', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => new Response(
      JSON.stringify({ gloves: init?.method === 'PUT' ? 'available' : 'unknown' }), { status: 200 },
    )) as unknown as typeof fetch;
    const changed = vi.fn();
    render(<Equipment fetchImpl={fetchImpl} onChange={changed} />);
    const select = await screen.findByLabelText('Are goalkeeper gloves available?') as HTMLSelectElement;
    await waitFor(() => expect(select.disabled).toBe(false));
    expect(screen.getByText(/need goalkeeper gloves/)).toBeTruthy();
    fireEvent.change(select, { target: { value: 'available' } });
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(select.value).toBe('available');
    expect(screen.queryByText(/need goalkeeper gloves/)).toBeNull();
  });
});
