import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { App } from './App';
import { fetchMe, reconnect, START_URL } from './api';
import { layoutFor } from './layout';

function respond(status: number, body?: unknown): typeof fetch {
  return vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })) as unknown as typeof fetch;
}

afterEach(cleanup);

describe('App', () => {
  it('shows Keeper home for the keeper', async () => {
    render(<App fetchImpl={respond(200, { role: 'keeper' })} />);
    expect(await screen.findByRole('heading', { name: 'Today', level: 1 })).toBeTruthy();
  });

  it('shows Parent home for the parent', async () => {
    render(<App fetchImpl={respond(200, { role: 'parent' })} />);
    expect(await screen.findByRole('heading', { name: 'Progress', level: 1 })).toBeTruthy();
  });

  it('shows "not set up" and no home data for an account with no role', async () => {
    render(<App fetchImpl={respond(200, { role: null })} />);
    expect(await screen.findByRole('heading', { name: 'Not set up yet' })).toBeTruthy();
    expect(screen.queryByText(/home/i)).toBeNull();
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('shows Reconnect on 401, and Reconnect reloads the start URL', async () => {
    const onReconnect = vi.fn();
    render(<App fetchImpl={respond(401, { error: 'unauthenticated' })} onReconnect={onReconnect} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reconnect' }));
    expect(onReconnect).toHaveBeenCalledOnce();
  });
});

describe('api', () => {
  it('sends same-origin credentials and X-Requested-With', async () => {
    const f = respond(200, { role: 'keeper' });
    await fetchMe(f);
    const init = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('same-origin');
    expect((init.headers as Record<string, string>)['X-Requested-With']).toBe('XMLHttpRequest');
  });

  it('treats a network failure as an error, not an expired session', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    expect(await fetchMe(f)).toEqual({ kind: 'error' });
  });

  it('reconnect navigates the window to the start URL', () => {
    const assign = vi.fn();
    reconnect({ assign });
    expect(assign).toHaveBeenCalledWith(START_URL);
    expect(START_URL).toBe('/');
  });
});

describe('layoutFor', () => {
  it.each([
    [375, 'compact'],
    [599, 'compact'],
    [600, 'medium'],
    [820, 'medium'],
    [899, 'medium'],
    [900, 'expanded'],
    [1180, 'expanded'],
  ])('%i px is %s', (width, layout) => {
    expect(layoutFor(width)).toBe(layout);
  });
});
