import { Component, lazy, type ComponentType, type ReactNode } from 'react';

// Screens a role doesn't use stay out of the first script (story 101 AC2). Each home, and the
// session player, is its own chunk: the keeper's device never runs the parent's screens and the
// reverse, and the player loads while the keeper's home is idle, before the Start tap. The
// service worker precaches every chunk (src/pwaConfig.ts), so an offline start opens them all.

export interface Chunk<P extends object> {
  /** The screen: drawn at once when its code is here, else it suspends until it arrives. */
  Screen: ComponentType<P>;
  /** Start fetching the code now (safe to call many times). */
  preload: () => Promise<unknown>;
}

/**
 * A screen in its own chunk. Once loaded it renders like any component, so a screen preloaded
 * ahead of its first use (or in tests) never suspends.
 */
export function chunk<P extends object>(load: () => Promise<ComponentType<P>>): Chunk<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const preload = () =>
    (pending ??= load().then(
      (c) => (loaded = c),
      (e: unknown) => {
        // A failed fetch (offline before the worker was installed) can be tried again.
        pending = null;
        throw chunkFailure(e);
      },
    ));
  const Lazy = lazy(async () => ({ default: await preload() }));
  function Screen(props: P) {
    const Loaded = loaded;
    return Loaded ? <Loaded {...props} /> : <Lazy {...props} />;
  }
  return { Screen, preload };
}

/** A chunk's code failed to fetch; marks the error so only these are caught. */
const CHUNK_FAILED = Symbol('chunk-failed');

/** Marks a failed chunk fetch, so `ChunkBoundary` catches it and nothing else. */
function chunkFailure(e: unknown): unknown {
  if (e && typeof e === 'object') (e as { [CHUNK_FAILED]?: true })[CHUNK_FAILED] = true;
  return e;
}

/**
 * When a screen's code can't be fetched: say so, with a way to try again. Any other error is
 * not this boundary's to handle and goes on up.
 */
export class ChunkBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (!(error as { [CHUNK_FAILED]?: true })[CHUNK_FAILED]) throw error;
    return (
      <section className="notice" aria-labelledby="chunk-error-title">
        <h1 id="chunk-error-title">Can't reach the app</h1>
        <p>Check the connection and try again.</p>
        <button type="button" className="primary" onClick={() => location.reload()}>
          Retry
        </button>
      </section>
    );
  }
}
