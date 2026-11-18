import { useEffect, useState } from 'react';
import { fetchToday, localDate, type Session, type Today } from './training';
import { LoadError, Skeleton, useSettled } from './Loading';
import type { OfflineStore } from './offline';
import { precacheFigures } from './figures';
import { nextText, type NextSession } from './week';

type Load = { kind: 'loading' } | { kind: 'ready'; data: Today; saved?: boolean } | { kind: 'error' };

/** Today's session as a path of steps: warm-up, each card, cool-down, finish. */
export function LessonPath({ session, label }: { session: Session; label: string }) {
  const warmUp = Math.round(session.warmUp.reduce((s, m) => s + m.seconds, 0) / 60);
  const coolDown = Math.round(session.coolDown.reduce((s, m) => s + m.seconds, 0) / 60);
  return (
    <div className="lesson">
      <p className="kind">{label}</p>
      <h3 className="lesson-title">{session.title}</h3>
      <p className="meta">About {session.minutes} minutes</p>
      <ol className="path" aria-label={`Steps in ${session.title}`}>
        {session.warmUp.length > 0 && (
          <li className="path-step">
            <span className="path-node" aria-hidden="true" />
            <span>Warm-up, {Math.max(1, warmUp)} min</span>
          </li>
        )}
        {session.cards.map((c) => (
          <li key={c.id} className="path-step">
            <span className="path-node" aria-hidden="true" />
            <span>
              {c.name}
              <span className="meta"> · {c.doseText}</span>
            </span>
          </li>
        ))}
        {session.coolDown.length > 0 && (
          <li className="path-step">
            <span className="path-node" aria-hidden="true" />
            <span>Cool-down, {Math.max(1, coolDown)} min</span>
          </li>
        )}
        <li className="path-step finish-node">
          <span className="path-node" aria-hidden="true" />
          <span>Finish</span>
        </li>
      </ol>
    </div>
  );
}

/**
 * The top of the keeper's home: today's approved session, or, when today's is not approved,
 * the last approved version or rest (parent-approval Decision, section 6). A session the
 * server did not send as approved is never shown.
 */
export function TodayPanel({
  fetchImpl,
  onStart,
  doneToday = false,
  cache,
  refresh = 0,
  onSettled,
  now = () => new Date(),
  next = null,
}: {
  fetchImpl?: typeof fetch;
  onStart: (session: Session) => void;
  doneToday?: boolean;
  /** The next planned session after today (story 114), shown once today is done. */
  next?: NextSession | null;
  /** The device's copy of today's approved session: shown offline, and while loading. */
  cache?: OfflineStore;
  /** Load again when this changes. */
  refresh?: number;
  onSettled?: () => void;
  now?: () => Date;
}) {
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [resting, setResting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const date = localDate(now());
  const saved = cache?.readToday(date) ?? null;
  useSettled(state.kind !== 'loading', onSettled);

  useEffect(() => {
    let live = true;
    fetchToday(fetchImpl, now())
      .then((data) => {
        cache?.writeToday(data);
        // Today's approved figures, for an offline session (story #94 AC5).
        void precacheFigures(data, fetchImpl ? { fetchImpl } : {});
        if (live) setState({ kind: 'ready', data });
      })
      .catch(() => {
        if (!live) return;
        // Offline or the server is down: the device's copy of today's approved session.
        const copy = cache?.readToday(localDate(now()));
        setState(copy ? { kind: 'ready', data: copy, saved: true } : { kind: 'error' });
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchImpl, cache, refresh, attempt]);

  return (
    <article className="card today" aria-labelledby="today-title" aria-busy={state.kind === 'loading'}>
      <h2 id="today-title">Today</h2>
      {state.kind === 'loading' &&
        (saved ? (
          // The saved copy holds the panel's final size; Start waits for the fresh answer.
          <TodayBody today={saved} doneToday={doneToday} next={next} resting={resting} onRest={() => {}} onStart={() => {}} disabled />
        ) : (
          <Skeleton lines={6} className="skeleton-today" />
        ))}
      {state.kind === 'error' && (
        <LoadError
          message="Couldn't load today's session. Rest is always a fine choice."
          onRetry={() => {
            setState({ kind: 'loading' });
            setAttempt((n) => n + 1);
          }}
        />
      )}
      {state.kind === 'ready' && (
        <>
          <TodayBody today={state.data} doneToday={doneToday} next={next} resting={resting} onRest={() => setResting(true)} onStart={onStart} />
          {state.saved && <p className="meta">Saved on this device.</p>}
        </>
      )}
    </article>
  );
}

function TodayBody({
  today,
  doneToday,
  next,
  resting,
  onRest,
  onStart,
  disabled = false,
}: {
  today: Today;
  doneToday: boolean;
  next: NextSession | null;
  resting: boolean;
  onRest: () => void;
  onStart: (session: Session) => void;
  disabled?: boolean;
}) {
  if (today.paused) return <p className="done-today">Training is paused until your parent clears it. Rest today.</p>;
  if (doneToday)
    return (
      <div className="done-today" role="status">
        <p className="done-title">Done for today</p>
        <p>Today's session is done. See you next time.</p>
        {/* Story 114: what comes next, in a line kept for it so nothing moves when it loads. */}
        <p className="done-next">{next ? nextText(next) : ''}</p>
      </div>
    );
  if (resting) return <p className="done-today">Rest day chosen. Recovery is part of training.</p>;
  if (!today.planned) return <p>Rest day. Recovery is part of training.</p>;

  if (today.today) {
    const session = today.today;
    return (
      <>
        <LessonPath session={session} label="Today's session" />
        <button type="button" className="primary session-control wide" disabled={disabled} onClick={() => onStart(session)}>
          Start session
        </button>
      </>
    );
  }

  const last = today.lastApproved;
  return (
    <div className="fallback">
      <p>
        {today.waiting > 0
          ? "Today's session is waiting for your parent."
          : "Today's session isn't approved yet."}{' '}
        {last ? 'You can do the last approved version, or rest.' : 'Rest today: recovery counts too.'}
      </p>
      {last && <LessonPath session={last} label="Last approved version" />}
      <div className="actions">
        {last && (
          <button type="button" className="primary session-control" disabled={disabled} onClick={() => onStart(last)}>
            Do last version
          </button>
        )}
        <button type="button" className="secondary session-control" disabled={disabled} onClick={onRest}>
          Rest today
        </button>
      </div>
    </div>
  );
}
