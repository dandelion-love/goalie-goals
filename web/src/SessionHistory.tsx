import { useEffect, useState } from 'react';
import { LoadSpace, useSettled } from './Loading';
import { shortDate } from './dates';
import { ENDING_TEXT, fetchHistory, setsLine, type HistoryCard, type HistorySession } from './history';

// Recent sessions on both homes (story 113), in a panel of their own so approvals never bury
// them (the approvals History stays its own list). Newest first; opening a session shows each
// card's sets and the cues rated good. Plain words about the session, never about a person.

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? date : shortDate(d);
}

function cardLine(c: HistoryCard): string {
  return `${c.name}: ${c.setsDone} of ${c.setsPlanned} ${c.setsPlanned === 1 ? 'set' : 'sets'}, ${c.work}`;
}

function goodLine(c: HistoryCard): string | null {
  if (c.goodCues.length) return `Looked good: ${c.goodCues.join(', ')}.`;
  if (c.goodCount) return `${c.goodCount} good-form ${c.goodCount === 1 ? 'cue' : 'cues'}.`;
  return null;
}

function SessionLine({ session }: { session: HistorySession }) {
  return (
    <li>
      <details className="session-record">
        <summary>
          <span className="session-head">{`${formatDay(session.date)}: ${session.title}, ${ENDING_TEXT[session.outcome]}`}</span>
          <span className="meta">{setsLine(session)}</span>
        </summary>
        <ul className="session-cards">
          {session.cards.map((c) => {
            const good = goodLine(c);
            return (
              <li key={c.cardId}>
                <span>{cardLine(c)}</span>
                {good && <span className="meta">{good}</span>}
              </li>
            );
          })}
        </ul>
      </details>
    </li>
  );
}

export function SessionHistory({
  fetchImpl,
  refresh = 0,
  onSettled,
}: {
  fetchImpl?: typeof fetch;
  /** Reload when this changes (a session recorded, the app reconnected). */
  refresh?: number;
  onSettled?: () => void;
}) {
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ready'; data: HistorySession[] } | { kind: 'error' }>({
    kind: 'loading',
  });
  const [attempt, setAttempt] = useState(0);
  useSettled(state.kind !== 'loading', onSettled);

  useEffect(() => {
    let live = true;
    fetchHistory(fetchImpl)
      .then((data) => live && setState({ kind: 'ready', data }))
      .catch(() => live && setState({ kind: 'error' }));
    return () => {
      live = false;
    };
  }, [fetchImpl, refresh, attempt]);

  return (
    <article className="card sessions" aria-labelledby="sessions-title" aria-busy={state.kind === 'loading'}>
      <h2 id="sessions-title">Recent sessions</h2>
      {state.kind !== 'ready' && (
        <LoadSpace
          failed={state.kind === 'error'}
          lines={2}
          message="Couldn't load recent sessions."
          onRetry={() => {
            setState({ kind: 'loading' });
            setAttempt((n) => n + 1);
          }}
        />
      )}
      {state.kind === 'ready' && state.data.length === 0 && <p>No sessions yet.</p>}
      {state.kind === 'ready' && state.data.length > 0 && (
        <ol className="session-list">
          {state.data.map((s) => (
            <SessionLine key={s.id} session={s} />
          ))}
        </ol>
      )}
    </article>
  );
}
