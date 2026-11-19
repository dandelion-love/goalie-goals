import { startTransition, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMe, reconnect, type MeResult, type Role } from './api';
import { useLayout, type Layout } from './layout';
import { PausedPanel } from './PainScreens';
import { LocalOutboxStore, type OutboxStore } from './outbox';
import { LocalPauseStore, type PauseStore } from './pain';
import type { SessionResult } from './training';
import { createWakeLock, type WakeLockController } from './wakeLock';
import { LocalOfflineStore, useOnline, type OfflineStore } from './offline';
import { MotionRoot } from './motion';
import { chunk, ChunkBoundary } from './chunks';
import { LocalGenerationStore, withGeneration, type GenerationStore } from './generation';

// Each role's home is its own chunk (story 101 AC2): the first script holds only this shell,
// and a device loads the home of the role it is signed in as, never the other one.
export const keeperHome = chunk(() => import('./KeeperHome').then((m) => m.KeeperHome));
export const parentHome = chunk(() => import('./ParentHome').then((m) => m.ParentHome));
const KeeperHome = keeperHome.Screen;
const ParentHome = parentHome.Screen;

/** Start fetching a role's home. */
function preloadHome(role: Role | null) {
  const home = role === 'keeper' ? keeperHome : role === 'parent' ? parentHome : null;
  void home?.preload().catch(() => {});
}

/** What the screen shows while it loads (and while a home's code arrives). */
const LOADING = (
  <p className="status" role="status">
    Loading…
  </p>
);

/** `offline`: the server could not be reached, so the home shows what this device has saved. */
type View = { kind: 'loading' } | MeResult | { kind: 'offline'; role: Role };

export interface AppProps {
  /** Injected in tests; the browser's fetch otherwise. */
  fetchImpl?: typeof fetch;
  onReconnect?: () => void;
  /** Injected in tests; the browser's Screen Wake Lock otherwise. */
  wakeLock?: WakeLockController;
  /** Hook for a finished session, called after the app sends it for XP and streaks. */
  onSessionFinish?: (result: SessionResult) => void;
  /** Where the device keeps the training pause; localStorage otherwise. */
  pauseStore?: PauseStore;
  /** Injected in tests; the device clock otherwise. */
  now?: () => Date;
  /** What the device keeps for an offline start (role, today's approved session); localStorage otherwise. */
  offlineStore?: OfflineStore;
  /** The outbox of session starts and finishes (story #94); localStorage otherwise. */
  outboxStore?: OutboxStore;
  /** The household's reset generation this device last saw (story 121); localStorage otherwise. */
  generationStore?: GenerationStore;
}

export function App({
  fetchImpl,
  onReconnect = () => reconnect(),
  wakeLock,
  onSessionFinish,
  pauseStore,
  now,
  offlineStore,
  outboxStore,
  generationStore,
}: AppProps) {
  const layout = useLayout();
  const wake = useMemo(() => wakeLock ?? createWakeLock(), [wakeLock]);
  const store = useMemo(() => pauseStore ?? new LocalPauseStore(), [pauseStore]);
  const cache = useMemo(() => offlineStore ?? new LocalOfflineStore(), [offlineStore]);
  const outbox = useMemo(() => outboxStore ?? new LocalOutboxStore(), [outboxStore]);
  const generations = useMemo(() => generationStore ?? new LocalGenerationStore(), [generationStore]);
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [epoch, setEpoch] = useState(0);
  /** Resets this device has seen (story 121): the home starts again from the server's data. */
  const [fresh, setFresh] = useState(0);
  const online = useOnline();
  // Story 121: every request names this device's generation, and an answer from after a reset
  // drops the device's copies from before it.
  const api = useMemo(
    () =>
      withGeneration(
        fetchImpl ?? ((input, init) => fetch(input, init)),
        generations,
        { outbox, pause: store, cache },
        () => setFresh((n) => n + 1),
      ),
    [fetchImpl, generations, outbox, store, cache],
  );

  const load = useCallback(async () => {
    setView((v) => (v.kind === 'offline' ? v : { kind: 'loading' }));
    const me = await fetchMe(api);
    if (me.kind === 'signed-in') preloadHome(me.role);
    // Unreachable, but this device has been signed in before: open its home from what it saved.
    const role = me.kind === 'error' ? cache.readRole() : null;
    // A transition (story 101 AC2): the home's first render is done in slices, never as one
    // long task, and "Loading…" stays until the home's code is here.
    startTransition(() => {
      if (me.kind === 'signed-in') {
        cache.writeRole(me.role);
        // Panels already on screen (an offline start) load again; a session in progress stays.
        setEpoch((n) => n + 1);
      }
      setView(role ? { kind: 'offline', role } : me);
    });
  }, [api, cache]);

  useEffect(() => {
    void load();
  }, [load]);

  // The home this device last opened starts to load with the sign-in check, not after it.
  useEffect(() => preloadHome(cache.readRole()), [cache]);

  // Back online after an offline start: check the sign-in and load the home afresh.
  useEffect(() => {
    if (online && view.kind === 'offline') void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const offline = view.kind === 'offline' || (!online && view.kind === 'signed-in');
  const role = view.kind === 'offline' ? view.role : view.kind === 'signed-in' ? view.role : null;

  return (
    <MotionRoot>
      <div className="app" data-layout={layout}>
        <header className="app-bar">
          <span className="brand">Goalie Goals</span>
        </header>
        <main className="app-main">
          {offline && <OfflineNotice role={role} onRetry={load} />}
          {fresh > 0 && (
            <p className="fresh-notice" role="status">
              Training data was cleared. Starting fresh.
            </p>
          )}
          <ChunkBoundary>
            <Suspense fallback={LOADING}>
              <Screen
                // A reset seen: the home draws again from the server, nothing kept from before.
                key={fresh}
                view={view.kind === 'offline' ? { kind: 'signed-in', role: view.role } : view}
                layout={layout}
                fetchImpl={api}
                onReconnect={onReconnect}
                onRetry={load}
                wakeLock={wake}
                onSessionFinish={onSessionFinish}
                pauseStore={store}
                offlineStore={cache}
                outboxStore={outbox}
                epoch={epoch}
                now={now}
              />
            </Suspense>
          </ChunkBoundary>
        </main>
      </div>
    </MotionRoot>
  );
}

/** Shown while the app runs from the device: what still works, and a way to check again. */
function OfflineNotice({ role, onRetry }: { role: Role | null; onRetry: () => void }) {
  return (
    <div className="offline-notice" role="status">
      <p>
        {role === 'parent'
          ? "You're offline. Approvals need a connection."
          : "You're offline. Today's session and the pause still work on this device."}
      </p>
      <button type="button" className="secondary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function Screen({
  view,
  layout,
  fetchImpl,
  onReconnect,
  onRetry,
  wakeLock,
  onSessionFinish,
  pauseStore,
  offlineStore,
  outboxStore,
  epoch,
  now,
}: {
  view: View;
  layout: Layout;
  fetchImpl?: typeof fetch;
  onReconnect: () => void;
  onRetry: () => void;
  wakeLock: WakeLockController;
  onSessionFinish?: (result: SessionResult) => void;
  pauseStore: PauseStore;
  offlineStore: OfflineStore;
  outboxStore: OutboxStore;
  epoch: number;
  now?: () => Date;
}) {
  switch (view.kind) {
    case 'offline':
      return null;
    case 'loading':
      return LOADING;
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
        <>
          {/* The pause holds without the network: the device's own copy is shown. */}
          {pauseStore.read() && <PausedPanel mistake={!!pauseStore.read()?.mistake} />}
          <section className="notice" aria-labelledby="error-title">
            <h1 id="error-title">Can't reach the app</h1>
            <p>Check the connection and try again.</p>
            <button type="button" className="primary" onClick={onRetry}>
              Retry
            </button>
          </section>
        </>
      );
    case 'signed-in':
      if (view.role === 'keeper') return (
          <KeeperHome
            layout={layout}
            fetchImpl={fetchImpl}
            wakeLock={wakeLock}
            onSessionFinish={onSessionFinish}
            pauseStore={pauseStore}
            offlineStore={offlineStore}
            outboxStore={outboxStore}
            epoch={epoch}
            now={now}
          />
        );
      if (view.role === 'parent') return <ParentHome layout={layout} fetchImpl={fetchImpl} epoch={epoch} />;
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
