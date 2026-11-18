import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { chunk, ChunkBoundary } from './chunks';
import { shortDate } from './dates';

// Story 101 AC2: screens a role doesn't use are lazy chunks. The app's own tests preload them
// (src/test-setup.ts); these cover a chunk that is still on its way, or fails to arrive.

afterEach(cleanup);

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('a screen in its own chunk', () => {
  it('shows the fallback until its code arrives, then the screen; once loaded it never suspends again', async () => {
    const code = deferred<(p: { name: string }) => React.ReactNode>();
    const load = vi.fn(() => code.promise);
    const home = chunk(load);
    render(
      <Suspense fallback={<p>Loading…</p>}>
        <home.Screen name="Keeper home" />
      </Suspense>,
    );
    expect(screen.getByText('Loading…')).toBeTruthy();
    await act(async () => code.resolve(({ name }) => <h1>{name}</h1>));
    expect(screen.getByRole('heading', { name: 'Keeper home' })).toBeTruthy();

    // Loaded: drawn at once, with no fallback, and fetched only once.
    cleanup();
    render(
      <Suspense fallback={<p>Loading…</p>}>
        <home.Screen name="Again" />
      </Suspense>,
    );
    expect(screen.getByRole('heading', { name: 'Again' })).toBeTruthy();
    await home.preload();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('says the app can’t be reached when the code fails to load, and can try the fetch again', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const load = vi
      .fn<() => Promise<() => React.ReactNode>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
      .mockResolvedValue(() => <h1>Parent home</h1>);
    const home = chunk(load);
    render(
      <ChunkBoundary>
        <Suspense fallback={<p>Loading…</p>}>
          <home.Screen />
        </Suspense>
      </ChunkBoundary>,
    );
    expect(await screen.findByRole('heading', { name: "Can't reach the app" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    // A failed fetch is not kept: the next try fetches again.
    await home.preload();
    expect(load).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it('passes on any error that is not a failed chunk', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): React.ReactNode {
      throw new Error('a bug');
    }
    expect(() =>
      render(
        <ChunkBoundary>
          <Broken />
        </ChunkBoundary>,
      ),
    ).toThrow('a bug');
    error.mockRestore();
  });
});

describe('the short date (story 101 AC1)', () => {
  it('reads as the month’s short name and the day, with no Intl formatter', () => {
    const intl = vi.spyOn(Intl, 'DateTimeFormat');
    expect(shortDate(new Date(2026, 10, 18))).toBe('Nov 18');
    expect(shortDate(new Date(2027, 0, 5, 23, 59))).toBe('Jan 5');
    expect(intl).not.toHaveBeenCalled();
    intl.mockRestore();
  });
});
