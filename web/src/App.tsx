import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMe, reconnect, type MeResult, type Role } from './api';
import { useLayout, type Layout } from './layout';
import { ApprovedTraining, History, ParentInbox } from './ApprovalScreens';
import { TodayPanel } from './LessonPath';
import { SessionPlayer } from './SessionPlayer';
import { ProgressPanel } from './ProgressPanel';
import { PainReportForm, PausedPanel } from './PainScreens';
import { TrainingDays } from './TrainingDays';
import { fetchProgress, isDoneForToday, recordSession, type FinishProgress } from './progress';
import { flushPause, LocalPauseStore, startPause, syncPause, type BodyArea, type LocalPause, type PauseStore } from './pain';
import { markStarted, type Session, type SessionResult } from './training';
import { createWakeLock, type WakeLockController } from './wakeLock';
import { LocalOfflineStore, useOnline, type OfflineStore } from './offline';
import { Reveal } from './Loading';

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
}

export function App({
  fetchImpl,
  onReconnect = () => reconnect(),
  wakeLock,
  onSessionFinish,
  pauseStore,
  now,
  offlineStore,
}: AppProps) {
  const layout = useLayout();
  const wake = useMemo(() => wakeLock ?? createWakeLock(), [wakeLock]);
  const store = useMemo(() => pauseStore ?? new LocalPauseStore(), [pauseStore]);
  const cache = useMemo(() => offlineStore ?? new LocalOfflineStore(), [offlineStore]);
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [epoch, setEpoch] = useState(0);
  const online = useOnline();

  const load = useCallback(async () => {
    setView((v) => (v.kind === 'offline' ? v : { kind: 'loading' }));
    const me = await fetchMe(fetchImpl);
    if (me.kind === 'signed-in') {
      cache.writeRole(me.role);
      // Panels already on screen (an offline start) load again; a session in progress stays.
      setEpoch((n) => n + 1);
    }
    // Unreachable, but this device has been signed in before: open its home from what it saved.
    const role = me.kind === 'error' ? cache.readRole() : null;
    setView(role ? { kind: 'offline', role } : me);
  }, [fetchImpl, cache]);

  useEffect(() => {
    void load();
  }, [load]);

  // Back online after an offline start: check the sign-in and load the home afresh.
  useEffect(() => {
    if (online && view.kind === 'offline') void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const offline = view.kind === 'offline' || (!online && view.kind === 'signed-in');
  const role = view.kind === 'offline' ? view.role : view.kind === 'signed-in' ? view.role : null;

  return (
    <div className="app" data-layout={layout}>
      <header className="app-bar">
        <span className="brand">Goalie Goals</span>
      </header>
      <main className="app-main">
        {offline && <OfflineNotice role={role} onRetry={load} />}
        <Screen
          view={view.kind === 'offline' ? { kind: 'signed-in', role: view.role } : view}
          layout={layout}
          fetchImpl={fetchImpl}
          onReconnect={onReconnect}
          onRetry={load}
          wakeLock={wake}
          onSessionFinish={onSessionFinish}
          pauseStore={store}
          offlineStore={cache}
          epoch={epoch}
          now={now}
        />
      </main>
    </div>
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
  epoch: number;
  now?: () => Date;
}) {
  switch (view.kind) {
    case 'offline':
      return null;
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
  offlineStore,
  epoch = 0,
  now = () => new Date(),
}: {
  layout: Layout;
  fetchImpl?: typeof fetch;
  wakeLock: WakeLockController;
  onSessionFinish?: (result: SessionResult) => void;
  pauseStore: PauseStore;
  offlineStore?: OfflineStore;
  /** Changes when the app reconnects: every panel loads again. */
  epoch?: number;
  now?: () => Date;
}) {
  const [playing, setPlaying] = useState<Session | null>(null);
  const [finishedHere, setDoneToday] = useState(false);
  const [recordedToday, setRecordedToday] = useState(false);
  const [progress, setProgress] = useState<FinishProgress | 'saving' | 'unsaved' | null>(null);
  const [recorded, setRecorded] = useState(0);
  const [reporting, setReporting] = useState(false);
  const [changed, setChanged] = useState(0);
  const [settled, setSettled] = useState({ today: false, progress: false, training: false });
  const { pause, start, send, flush, sent } = usePause(pauseStore, fetchImpl);
  const doneToday = finishedHere || recordedToday;
  const settle = useCallback((panel: keyof typeof settled) => () => setSettled((s) => ({ ...s, [panel]: true })), []);
  const onToday = useMemo(() => settle('today'), [settle]);
  const onProgress = useMemo(() => settle('progress'), [settle]);
  const onTraining = useMemo(() => settle('training'), [settle]);

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
  }, [fetchImpl, recorded, epoch]);

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
    if (pauseStore.read()) return;
    setPlaying(session);
    // Tell the server, so the parent can no longer undo this approval. If the parent undid it
    // a moment ago, the server refuses: the session closes before the first set and today
    // loads again. Offline, the session runs as approved when it was loaded.
    void markStarted(session, fetchImpl).then((answer) => {
      if (answer !== 'refused') return;
      setPlaying((p) => (p === session ? null : p));
      setChanged((n) => n + 1);
    });
  };

  // Each panel shows once every panel above it has settled, so nothing on screen moves as
  // the home fills in (story #80 AC1).
  const todaySettled = !!pause || settled.today;
  const progressSettled = todaySettled && settled.progress;
  const trainingSettled = progressSettled && (!!pause || settled.training);

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
      {changed > 0 && !pause && (
        <p className="meta" role="status">
          Today's session changed. Check it again.
        </p>
      )}
      {pause ? (
        <PausedPanel />
      ) : (
        <TodayPanel
          fetchImpl={fetchImpl}
          onStart={tryStart}
          doneToday={doneToday}
          cache={offlineStore}
          refresh={changed + epoch}
          onSettled={onToday}
          now={now}
        />
      )}
      <Reveal open={todaySettled}>
        <ProgressPanel fetchImpl={fetchImpl} refresh={recorded + epoch} onSettled={onProgress} />
      </Reveal>
      <Reveal open={progressSettled}>
        <div className={layout === 'expanded' ? 'panes' : 'stack'}>
          {!pause && <ApprovedTraining fetchImpl={fetchImpl} refresh={changed + epoch} onSettled={onTraining} />}
          <Reveal open={trainingSettled}>
            <History fetchImpl={fetchImpl} refresh={recorded + sent + epoch} />
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}

function ParentHome({ layout, fetchImpl, epoch = 0 }: { layout: Layout; fetchImpl?: typeof fetch; epoch?: number }) {
  // Answering a request, or undoing an approval, adds to the history and changes the inbox,
  // so both reload after each.
  const [answered, setAnswered] = useState(0);
  const [settled, setSettled] = useState({ progress: false, days: false, inbox: false });
  const onProgress = useCallback(() => setSettled((s) => ({ ...s, progress: true })), []);
  const onDays = useCallback(() => setSettled((s) => ({ ...s, days: true })), []);
  const onInbox = useCallback(() => setSettled((s) => ({ ...s, inbox: true })), []);
  const changed = useCallback(() => setAnswered((n) => n + 1), []);
  // Each panel shows once every panel above it has settled (story #80 AC1).
  const daysOpen = settled.progress;
  const inboxOpen = daysOpen && settled.days;
  const historyOpen = inboxOpen && settled.inbox;
  return (
    <section className="home" aria-labelledby="home-title">
      <h1 id="home-title">Parent home</h1>
      <ProgressPanel fetchImpl={fetchImpl} refresh={answered + epoch} onSettled={onProgress} />
      <Reveal open={daysOpen}>
        <TrainingDays fetchImpl={fetchImpl} onChange={changed} onSettled={onDays} />
      </Reveal>
      <Reveal open={inboxOpen}>
        <div className={layout === 'expanded' ? 'panes' : 'stack'}>
          <ParentInbox fetchImpl={fetchImpl} onChange={changed} refresh={answered + epoch} onSettled={onInbox} />
          <Reveal open={historyOpen}>
            <History fetchImpl={fetchImpl} refresh={answered + epoch} onChange={changed} />
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}
