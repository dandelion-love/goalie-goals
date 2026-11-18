import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Layout } from './layout';
import { ApprovedTraining as ApprovedTrainingPanel, History as HistoryPanel } from './ApprovalScreens';
import { TodayPanel as TodayPanelBody } from './LessonPath';
import { sound, useWarmCues } from './sound';
import { ProgressPanel as ProgressPanelBody } from './ProgressPanel';
import { SessionHistory as SessionHistoryPanel } from './SessionHistory';
import { WeekPanel as WeekPanelBody } from './WeekPanel';
import type { NextSession, WeekView } from './week';
import { PainReportForm, PausedPanel, STOP_AND_REST } from './PainScreens';
import { fetchProgress, isDoneForToday, type FinishProgressState } from './progress';
import {
  cancel,
  enqueue,
  finishEvent,
  flushOutbox,
  prepareOnLaunch,
  release,
  startEvent,
  type FlushResult,
  type OutboxStore,
} from './outbox';
import {
  flushPause,
  markMistake,
  startPause,
  syncPause,
  type BodyArea,
  type LocalPause,
  type PauseStore,
} from './pain';
import type { Session, SessionResult } from './training';
import type { WakeLockController } from './wakeLock';
import type { OfflineStore } from './offline';
import { Reveal } from './Loading';
import { chunk } from './chunks';
import { afterPaint } from './defer';
import { warmPainReport } from './warmPain';

// The keeper's home, in its own chunk (story 101 AC2): the parent's device never loads it.

/** The session player, in its own chunk: fetched while the home is idle, before the Start tap. */
export const player = chunk(() => import('./SessionPlayer').then((m) => m.SessionPlayer));
const SessionPlayer = player.Screen;

/** How long after the home is up the player's code starts to load, so the panels load first. */
const LOAD_PLAYER_AFTER_MS = 500;
/**
 * How long after today's panel settles (Start on screen) the pain report's warm-up may start
 * (story 106): never in the first second after Start appears, where a quick Start lands.
 */
export const WARM_PAIN_AFTER_MS = 1200;

// A tap on the home (Something hurts, Start) re-renders only the panels whose props it changes
// (story 101 AC1): the history and progress don't draw again for a tap that leaves them as
// they are.
const TodayPanel = memo(TodayPanelBody);
const ProgressPanel = memo(ProgressPanelBody);
const ApprovedTraining = memo(ApprovedTrainingPanel);
const History = memo(HistoryPanel);
const SessionHistory = memo(SessionHistoryPanel);
const WeekPanel = memo(WeekPanelBody);
const deviceNow = () => new Date();

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

  /** Show the pause the device holds: after a tap that wrote it and painted first (stories 105, 106). */
  const refresh = useCallback(() => setPause(store.read()), [store]);

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

  /**
   * "Tapped by mistake" (story 104): noted on the device at once and kept in the outbox, then
   * sent after the report. The area chosen so far goes with the report; the report's typed text
   * does not. The pause holds: only the parent's clear lifts it. No sound is touched.
   */
  const mistake = useCallback(
    (area: BodyArea | null) => {
      const current = store.read() ?? startPause(store);
      if (area && !current.sent && !current.report) store.write({ ...current, report: { bodyArea: area, note: '' } });
      markMistake(store);
      setPause(store.read());
      void flushPause(store, fetchImpl).then((ok) => {
        setPause(store.read());
        if (ok) setSent((n) => n + 1);
      });
    },
    [store, fetchImpl],
  );

  return { pause, refresh, send, flush, sent, mistake };
}

/**
 * The outbox of session starts and finishes on this device (story #94): sent at once when it
 * can be, and again whenever the app opens, reconnects or comes back online. `onAnswers` hears
 * every event the server answered.
 */
function useOutbox(
  store: OutboxStore,
  fetchImpl: typeof fetch | undefined,
  epoch: number,
  onAnswers: (r: FlushResult) => void,
) {
  const handler = useRef(onAnswers);
  handler.current = onAnswers;
  // Once per launch of the keeper's home: anything left from an earlier run goes out now.
  useState(() => prepareOnLaunch(store));
  const flush = useCallback(
    () =>
      flushOutbox(store, fetchImpl).then((r) => {
        handler.current(r);
        return r;
      }),
    [store, fetchImpl],
  );
  useEffect(() => {
    void flush();
    const online = () => void flush();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [flush, epoch]);
  return flush;
}

export function KeeperHome({
  layout,
  fetchImpl,
  wakeLock,
  onSessionFinish,
  pauseStore,
  offlineStore,
  outboxStore,
  epoch = 0,
  now = deviceNow,
}: {
  layout: Layout;
  fetchImpl?: typeof fetch;
  wakeLock: WakeLockController;
  onSessionFinish?: (result: SessionResult) => void;
  pauseStore: PauseStore;
  offlineStore?: OfflineStore;
  outboxStore: OutboxStore;
  /** Changes when the app reconnects: every panel loads again. */
  epoch?: number;
  now?: () => Date;
}) {
  // The cues are computed only on the keeper's device, once its home is up and idle (story #98),
  // so the first cue is ready by the Start tap. The audio context is made right after the home's
  // first paint (story 107), before Start shows: its long task is then over before the earliest
  // tap, and before the pain report's warm-up, which waits for Start to be up a while. A paused
  // home (even by a "Something hurts" tap quicker than that) offers no Start and makes none.
  const primeUnlessPaused = useCallback(() => !pauseStore.read(), [pauseStore]);
  useWarmCues(sound, { primeAfterPaint: primeUnlessPaused });
  // The player's code, ahead of the Start tap, so Start never waits on the network.
  useEffect(() => {
    const id = setTimeout(() => void player.preload().catch(() => {}), LOAD_PLAYER_AFTER_MS);
    return () => clearTimeout(id);
  }, []);
  const [playing, setPlaying] = useState<Session | null>(null);
  const [finishedHere, setDoneToday] = useState(false);
  const [recordedToday, setRecordedToday] = useState(false);
  const [progress, setProgress] = useState<FinishProgressState>(null);
  const [recorded, setRecorded] = useState(0);
  const [reporting, setReporting] = useState(false);
  const [changed, setChanged] = useState(0);
  const [settled, setSettled] = useState({ today: false, week: false, progress: false, sessions: false, training: false });
  // The next planned session, from This week (story 114): Today says it once today is done.
  const [next, setNext] = useState<NextSession | null>(null);
  const onWeek = useCallback((w: WeekView) => setNext(w.next), []);
  const { pause, refresh, send, flush, sent, mistake } = usePause(pauseStore, fetchImpl);
  // The playing session's start event, the stop kept while Resume is offered, and the finish
  // whose XP the finish screen shows.
  const startSent = useRef<{ id: string; session: Session } | null>(null);
  const stopHeld = useRef<string | null>(null);
  const finishShown = useRef<string | null>(null);
  // The server's answers render as a transition (story 101): they never hold a tap's frame.
  const flushOut = useOutbox(outboxStore, fetchImpl, epoch, ({ answers }) => startTransition(() => {
    let finished = false;
    for (const [id, answer] of Object.entries(answers)) {
      const playingStart = startSent.current;
      if (playingStart && id === playingStart.id) {
        startSent.current = null;
        // The parent undid the approval a moment ago: the session closes before the first
        // set and today loads again.
        if (answer.kind === 'refused') {
          setPlaying((p) => (p === playingStart.session ? null : p));
          setChanged((n) => n + 1);
        }
      }
      if (answer.kind !== 'refused' && id === finishShown.current) {
        setProgress(answer.kind === 'confirmed' && answer.progress ? answer.progress : 'unsaved');
      }
      if (answer.kind === 'confirmed' && answer.progress) finished = true;
    }
    if (finished) setRecorded((n) => n + 1);
  }));
  const doneToday = finishedHere || recordedToday;
  const settle = useCallback((panel: keyof typeof settled) => () => setSettled((s) => ({ ...s, [panel]: true })), []);
  const onToday = useMemo(() => settle('today'), [settle]);
  const onWeekSettled = useMemo(() => settle('week'), [settle]);
  const onProgress = useMemo(() => settle('progress'), [settle]);
  const onSessions = useMemo(() => settle('sessions'), [settle]);
  const onTraining = useMemo(() => settle('training'), [settle]);
  // Each panel shows once every panel above it has settled, so nothing on screen moves as
  // the home fills in (story #80 AC1).
  const todaySettled = !!pause || settled.today;
  const weekSettled = todaySettled && settled.week;
  const progressSettled = weekSettled && settled.progress;
  const sessionsSettled = progressSettled && settled.sessions;
  const trainingSettled = sessionsSettled && (!!pause || settled.training);

  // "Something hurts" lays its report out warm (story 105): once ahead, on idle. It starts only
  // a while after Start appears (story 106), so it never lands on a quick Start, and its steps
  // run in idle periods only, so a later tap is never held behind one.
  useEffect(() => {
    if (!todaySettled) return;
    let cancel = () => {};
    const id = setTimeout(() => {
      cancel = warmPainReport();
    }, WARM_PAIN_AFTER_MS);
    return () => {
      clearTimeout(id);
      cancel();
    };
  }, [todaySettled]);

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
      const hurt = result.outcome === 'hurt';
      // In the tap's own task (story 101 AC4): the pause is written on the device first, before
      // anything goes over the network, and the session's end is kept in the outbox.
      if (hurt) startPause(pauseStore);
      else setDoneToday(true);
      // A stop queued at the Stop tap goes out now. Any other ending is queued here, and a held
      // stop it replaces (Something hurts after Stop) is dropped.
      const held = stopHeld.current;
      stopHeld.current = null;
      let id: string;
      if (held && result.outcome === 'stopped' && release(outboxStore, held)) {
        id = held;
      } else {
        if (held) cancel(outboxStore, held);
        const event = finishEvent(result, now());
        enqueue(outboxStore, event);
        id = event.id;
      }
      finishShown.current = id;
      if (!hurt) setProgress('saving');
      // After the finish screen is painted (story 101 AC1): the send. If it fails, the finish
      // line says so; the finish screen and the pause stay as they are.
      afterPaint(
        () => {
          // "Something hurts" (story 105): the tap's own frame is the pain report form alone.
          // The home's copy of the pause, today's state and the XP line wait for that paint:
          // the finish screen shows none of them in its first frame.
          if (hurt) {
            refresh();
            setDoneToday(true);
            if (finishShown.current === id) setProgress('saving');
          }
          return flushOut().then(() => {
            // Still on the device: offline, so it syncs later and its XP shows then.
            if (finishShown.current === id && outboxStore.read().some((e) => e.id === id)) setProgress('queued');
          });
        },
        () => {
          if (finishShown.current === id) setProgress('unsaved');
        },
      );
      onSessionFinish?.(result);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flushOut, outboxStore, onSessionFinish, pauseStore, refresh],
  );

  // Stop keeps the session's end on the device at once, so it is recorded even if the app
  // closes inside the Resume window. It is sent when the window closes; Resume deletes it.
  const stopTapped = useCallback(
    (result: SessionResult) => {
      if (stopHeld.current) cancel(outboxStore, stopHeld.current);
      const event = finishEvent(result, now(), true);
      enqueue(outboxStore, event);
      stopHeld.current = event.id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outboxStore],
  );
  const resumed = useCallback(() => {
    if (stopHeld.current) cancel(outboxStore, stopHeld.current);
    stopHeld.current = null;
  }, [outboxStore]);

  if (playing) {
    return (
      <SessionPlayer
        session={playing}
        layout={layout}
        wakeLock={wakeLock}
        onFinish={finish}
        onStop={stopTapped}
        onResume={resumed}
        progress={progress}
        hurtForm={<PainReportForm onSend={send} onMistake={mistake} />}
        onExit={() => {
          // A transition (story #98 AC5): the tap paints its response at once, and the home,
          // a large render, follows without holding the tap's frame.
          startTransition(() => {
            setPlaying(null);
            setProgress(null);
          });
          finishShown.current = null;
          startSent.current = null;
          flush();
          void flushOut();
        }}
      />
    );
  }

  // Paused: show the pause, and offer nothing to train.
  const tryStart = (session: Session) => {
    // Paused, or already started (a second tap while the player is still rendering).
    if (pauseStore.read() || startSent.current) return;
    // The Start tap unlocks sound for the session (iPadOS plays audio only after a tap). It
    // resumes the context the home made on idle, or, on a quick Start, makes it here: the one tap
    // that may (story 103).
    sound.unlockForStart();
    // A transition (story #98 AC5): the tap paints its response at once, and the player, a
    // large render, follows without holding the tap's frame. Its start cue plays as it shows.
    startTransition(() => setPlaying(session));
    // Tell the server, so the parent can no longer undo this approval. If the parent undid it
    // a moment ago, the server refuses: the session closes before the first set and today
    // loads again. Offline, the session runs as approved when it was loaded, and the start
    // waits in the outbox; it goes first when the network is back (story #94). The start is
    // kept on the device in the tap and sent after the next paint (story 101 AC1).
    const event = startEvent(session, now());
    enqueue(outboxStore, event);
    startSent.current = { id: event.id, session };
    // A send that fails leaves the start in the outbox, for the next send (reconnecting, back
    // online, the next launch): the session already runs, so nothing on screen changes.
    afterPaint(
      () => flushOut(),
      () => {},
    );
  };

  // "Something hurts" on the home (story 106): the tap's own task writes the pause on the device
  // and shows the report form, "Tapped by mistake" included, with the paused panel in place of
  // Start. The home's copy of the pause, and with it the rest of the home (the training list
  // leaving, the panels below opening), follows after that paint. Nothing here touches audio.
  const hurtTapped = () => {
    startPause(pauseStore);
    setReporting(true);
    afterPaint(
      () => startTransition(refresh),
      () => {},
    );
  };
  const paused = !!pause || reporting;

  return (
    <section className="home" aria-labelledby="home-title">
      <div className="home-bar">
        <h1 id="home-title">Keeper home</h1>
        {!paused && (
          <button type="button" className="danger session-control safety-control" onClick={hurtTapped}>
            Something hurts
          </button>
        )}
      </div>
      {reporting && (
        <article className="card" aria-labelledby="report-title">
          <h2 id="report-title">Something hurts</h2>
          <p>{STOP_AND_REST}</p>
          <PainReportForm
            onSend={send}
            onMistake={(area) => {
              mistake(area);
              // The paused panel below says what happens next.
              setReporting(false);
            }}
          />
        </article>
      )}
      {changed > 0 && !pause && (
        <p className="meta" role="status">
          Today's session changed. Check it again.
        </p>
      )}
      {paused ? (
        <PausedPanel
          mistake={!!pause?.mistake}
          // While the report form above is still open, its own "Tapped by mistake" is the one.
          onMistake={reporting && !pause?.sent && !pause?.report ? undefined : () => mistake(null)}
        />
      ) : (
        <TodayPanel
          fetchImpl={fetchImpl}
          onStart={tryStart}
          doneToday={doneToday}
          cache={offlineStore}
          refresh={changed + epoch}
          onSettled={onToday}
          now={now}
          next={next}
        />
      )}
      {/* This week (story 114): the near goal across the week, under today. */}
      <Reveal open={todaySettled}>
        <WeekPanel fetchImpl={fetchImpl} refresh={recorded + epoch} onSettled={onWeekSettled} onWeek={onWeek} now={now} />
      </Reveal>
      <Reveal open={weekSettled}>
        <ProgressPanel fetchImpl={fetchImpl} refresh={recorded + epoch} onSettled={onProgress} />
      </Reveal>
      {/* Recent sessions (story 113): their own panel, above the approvals. */}
      <Reveal open={progressSettled}>
        <SessionHistory fetchImpl={fetchImpl} refresh={recorded + epoch} onSettled={onSessions} />
      </Reveal>
      <Reveal open={sessionsSettled}>
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
