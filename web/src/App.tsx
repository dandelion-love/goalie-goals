import { useCallback, useEffect, useState } from 'react';
import { fetchMe, reconnect, type MeResult } from './api';
import { useLayout, type Layout } from './layout';

type View = { kind: 'loading' } | MeResult;

export interface AppProps {
  /** Injected in tests; the browser's fetch otherwise. */
  fetchImpl?: typeof fetch;
  onReconnect?: () => void;
}

export function App({ fetchImpl, onReconnect = () => reconnect() }: AppProps) {
  const layout = useLayout();
  const [view, setView] = useState<View>({ kind: 'loading' });

  const load = useCallback(async () => {
    setView({ kind: 'loading' });
    setView(await fetchMe(fetchImpl));
  }, [fetchImpl]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="app" data-layout={layout}>
      <header className="app-bar">
        <span className="brand">Goalie Goals</span>
      </header>
      <main className="app-main">
        <Screen view={view} layout={layout} onReconnect={onReconnect} onRetry={load} />
      </main>
    </div>
  );
}

function Screen({
  view,
  layout,
  onReconnect,
  onRetry,
}: {
  view: View;
  layout: Layout;
  onReconnect: () => void;
  onRetry: () => void;
}) {
  switch (view.kind) {
    case 'loading':
      return <p className="status" role="status">Loading…</p>;
    case 'expired':
      return (
        <section className="notice" aria-labelledby="expired-title">
          <h1 id="expired-title">Session expired</h1>
          <p>Your sign-in has run out. Reconnect to carry on where you left off.</p>
          <button type="button" className="primary" onClick={onReconnect}>
            Reconnect
          </button>
        </section>
      );
    case 'error':
      return (
        <section className="notice" aria-labelledby="error-title">
          <h1 id="error-title">Can't reach the app</h1>
          <p>Check the connection and try again.</p>
          <button type="button" className="primary" onClick={onRetry}>
            Try again
          </button>
        </section>
      );
    case 'signed-in':
      if (view.role === 'keeper') return <KeeperHome layout={layout} />;
      if (view.role === 'parent') return <ParentHome layout={layout} />;
      return <NotSetUp />;
  }
}

function NotSetUp() {
  return (
    <section className="notice" aria-labelledby="not-set-up-title">
      <h1 id="not-set-up-title">Not set up yet</h1>
      <p>This account is signed in but has no place in the app yet. Ask the parent who runs it to add you.</p>
    </section>
  );
}

function KeeperHome({ layout }: { layout: Layout }) {
  return (
    <section className="home" aria-labelledby="home-title">
      <h1 id="home-title">Keeper home</h1>
      <div className={layout === 'expanded' ? 'panes' : 'stack'}>
        <article className="card">
          <h2>Today's session</h2>
          <p>No session planned yet.</p>
        </article>
        <article className="card">
          <h2>Progress</h2>
          <p>Streaks and XP will show here.</p>
        </article>
      </div>
    </section>
  );
}

function ParentHome({ layout }: { layout: Layout }) {
  return (
    <section className="home" aria-labelledby="home-title">
      <h1 id="home-title">Parent home</h1>
      <div className={layout === 'expanded' ? 'panes' : 'stack'}>
        <article className="card">
          <h2>Waiting for you</h2>
          <p>Nothing to approve.</p>
        </article>
        <article className="card">
          <h2>This week</h2>
          <p>Sessions done together will show here.</p>
        </article>
      </div>
    </section>
  );
}
