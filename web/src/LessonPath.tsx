import { useEffect, useState } from 'react';
import { fetchToday, type Session, type Today } from './training';

type Load = { kind: 'loading' } | { kind: 'ready'; data: Today } | { kind: 'error' };

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
}: {
  fetchImpl?: typeof fetch;
  onStart: (session: Session) => void;
  doneToday?: boolean;
}) {
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [resting, setResting] = useState(false);

  useEffect(() => {
    let live = true;
    fetchToday(fetchImpl)
      .then((data) => live && setState({ kind: 'ready', data }))
      .catch(() => live && setState({ kind: 'error' }));
    return () => {
      live = false;
    };
  }, [fetchImpl]);

  return (
    <article className="card today" aria-labelledby="today-title">
      <h2 id="today-title">Today</h2>
      {state.kind === 'loading' && <p role="status">Loading…</p>}
      {state.kind === 'error' && <p>Couldn't load today's session. Rest is always a fine choice.</p>}
      {state.kind === 'ready' && <TodayBody today={state.data} doneToday={doneToday} resting={resting} onRest={() => setResting(true)} onStart={onStart} />}
    </article>
  );
}

function TodayBody({
  today,
  doneToday,
  resting,
  onRest,
  onStart,
}: {
  today: Today;
  doneToday: boolean;
  resting: boolean;
  onRest: () => void;
  onStart: (session: Session) => void;
}) {
  if (doneToday) return <p className="done-today">Today's session is done. See you next time.</p>;
  if (resting) return <p className="done-today">Rest day chosen. Recovery is part of training.</p>;
  if (!today.planned) return <p>Rest day. Recovery is part of training.</p>;

  if (today.today) {
    const session = today.today;
    return (
      <>
        <LessonPath session={session} label="Today's session" />
        <button type="button" className="primary session-control wide" onClick={() => onStart(session)}>
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
          <button type="button" className="primary session-control" onClick={() => onStart(last)}>
            Do the last approved version
          </button>
        )}
        <button type="button" className="secondary session-control" onClick={onRest}>
          Rest today
        </button>
      </div>
    </div>
  );
}
