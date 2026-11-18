import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMe, reconnect, type MeResult } from './api';
import { useLayout, type Layout } from './layout';
import { ApprovedTraining, History, ParentInbox } from './ApprovalScreens';
import { TodayPanel } from './LessonPath';
import { SessionPlayer } from './SessionPlayer';
import { ProgressPanel } from './ProgressPanel';
import { PainReportForm, PausedPanel } from './PainScreens';
import { fetchProgress, isDoneForToday, recordSession, type FinishProgress } from './progress';
import { flushPause, LocalPauseStore, startPause, syncPause, type BodyArea, type LocalPause, type PauseStore } from './pain';
import type { Session, SessionResult } from './training';
import { createWakeLock, type WakeLockController } from './wakeLock';

type View = { kind: 'loading' } | MeResult;

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
}

export function App({ fetchImpl, onReconnect = () => reconnect(), wakeLock, onSessionFinish, pauseStore, now }: AppProps) {
  const layout = useLayout();
  const wake = useMemo(() => wakeLock ?? createWakeLock(), [wakeLock]);
  const store = useMemo(() => pauseStore ?? new LocalPauseStore(), [pauseStore]);
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
        <Screen
          view={view}
          layout={layout}
          fetchImpl={fetchImpl}
          onReconnect={onReconnect}
          onRetry={load}
          wakeLock={wake}
          onSessionFinish={onSessionFinish}
          pauseStore={store}
          now={now}
        />
      </main>
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
  now?: () => Date;
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
        <>
          {/* The pause holds without the network: the device's own copy is shown. */}
          {pauseStore.read() && <PausedPanel />}
          <section className="notice" aria-labelledby="error-title">
            <h1 id="error-title">Can't reach the app</h1>
            <p>Check the connection and try again.</p>
            <button type="button" className="primary" onClick={onRetry}>
              Try again
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
            now={now}
          />
        );
      if (view.role === 'parent') return <ParentHome layout={layout} fetchImpl={fetchImpl} />;
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

/** The training pause on this device: set at once, kept offline, synced when online. */
function usePause(store: PauseStore, fetchImpl?: typeof fetch) {
  const [pause, setPause] = useState<LocalPause | null>(() => store.read());
  /** Counts sends that reached the server, so the history can show the report at once. */
  const [sent, setSent] = useState(0);

  useEffect(() => {
    let live = true;
    const sync = () => void syncPause(store, fetchImpl).then((p) => live && setPause(p));
    sync();
    window.addEventListener('online', sync);
    return () => {
      live = false;
      window.removeEventListener('online', sync);
    };
  }, [store, fetchImpl]);

  const start = useCallback(() => setPause(startPause(store)), [store]);

  /** Put the report in the outbox and send it; false when it waits for the network. */
  const send = useCallback(
    async (bodyArea: BodyArea, note: string) => {
      const current = store.read() ?? startPause(store);
      store.write({ ...current, report: { bodyArea, note } });
      setPause(store.read());
      const ok = await flushPause(store, fetchImpl);
      setPause(store.read());
      if (ok) setSent((n) => n + 1);
      return ok;
    },
    [store, fetchImpl],
  );

  /** Send whatever is waiting (a report left without details goes as "not said"). */
  const flush = useCallback(() => {
    void flushPause(store, fetchImpl).then((ok) => {
      setPause(store.read());
      if (ok) setSent((n) => n + 1);
    });
  }, [store, fetchImpl]);

  return { pause, start, send, flush, sent };
}

function KeeperHome({
  layout,
  fetchImpl,
  wakeLock,
  onSessionFinish,
  pauseStore,
  now = () => new Date(),
}: {
  layout: Layout;
  fetchImpl?: typeof fetch;
  wakeLock: WakeLockController;
  onSessionFinish?: (result: SessionResult) => void;
  pauseStore: PauseStore;
  now?: () => Date;
}) {
  const [playing, setPlaying] = useState<Session | null>(null);
  const [finishedHere, setDoneToday] = useState(false);
  const [recordedToday, setRecordedToday] = useState(false);
  const [progress, setProgress] = useState<FinishProgress | 'saving' | 'unsaved' | null>(null);
  const [recorded, setRecorded] = useState(0);
  const [reporting, setReporting] = useState(false);
  const { pause, start, send, flush, sent } = usePause(pauseStore, fetchImpl);
  const doneToday = finishedHere || recordedToday;

  // A session already recorded today (on this device or another, before a reload) means
  // today is done: the home offers nothing more to train until tomorrow.
  useEffect(() => {
    let live = true;
    fetchProgress(fetchImpl, now())
      .then((s) => live && setRecordedToday(isDoneForToday(s)))
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchImpl, recorded]);

  const finish = useCallback(
    (result: SessionResult) => {
      // Pause first, on the device, before anything goes over the network.
      if (result.outcome === 'hurt') start();
      setDoneToday(true);
      setProgress('saving');
      recordSession(result, fetchImpl)
        .then((p) => setProgress(p))
        .catch(() => setProgress('unsaved'))
        .finally(() => setRecorded((n) => n + 1));
      onSessionFinish?.(result);
    },
    [fetchImpl, onSessionFinish, start],
  );

  if (playing) {
    return (
      <SessionPlayer
        session={playing}
        layout={layout}
        wakeLock={wakeLock}
        onFinish={finish}
        progress={progress}
        hurtForm={<PainReportForm onSend={send} />}
        onExit={() => {
          setPlaying(null);
          setProgress(null);
          flush();
        }}
      />
    );
  }

  // Paused: show the pause, and offer nothing to train.
  const tryStart = (session: Session) => {
    if (!pauseStore.read()) setPlaying(session);
  };

  return (
    <section className="home" aria-labelledby="home-title">
      <div className="home-bar">
        <h1 id="home-title">Keeper home</h1>
        {!pause && (
          <button
            type="button"
            className="danger session-control"
            onClick={() => {
              start();
              setReporting(true);
            }}
          >
            Something hurts
          </button>
        )}
      </div>
      {reporting && (
        <article className="card" aria-labelledby="report-title">
          <h2 id="report-title">Something hurts</h2>
          <p>Stop and rest. Tell an adult now. If someone collapses, call the local emergency number.</p>
          <PainReportForm onSend={send} />
        </article>
      )}
      {pause ? <PausedPanel /> : <TodayPanel fetchImpl={fetchImpl} onStart={tryStart} doneToday={doneToday} />}
      <ProgressPanel fetchImpl={fetchImpl} refresh={recorded} />
      <div className={layout === 'expanded' ? 'panes' : 'stack'}>
        {!pause && <ApprovedTraining fetchImpl={fetchImpl} />}
        <History fetchImpl={fetchImpl} refresh={recorded + sent} />
      </div>
    </section>
  );
}

function ParentHome({ layout, fetchImpl }: { layout: Layout; fetchImpl?: typeof fetch }) {
  // Answering a request adds to the history, so the history reloads after each answer.
  const [answered, setAnswered] = useState(0);
  return (
    <section className="home" aria-labelledby="home-title">
      <h1 id="home-title">Parent home</h1>
      <ProgressPanel fetchImpl={fetchImpl} refresh={answered} />
      <div className={layout === 'expanded' ? 'panes' : 'stack'}>
        <ParentInbox fetchImpl={fetchImpl} onChange={() => setAnswered((n) => n + 1)} />
        <History fetchImpl={fetchImpl} refresh={answered} />
      </div>
    </section>
  );
}
