import { useEffect, useState } from 'react';
import { Skeleton, useSettled } from './Loading';
import { countText, fetchWeek, nextText, STATE_LABEL, type WeekView } from './week';

// This week at a glance on both homes (story 114): seven days, Monday first, each in one state,
// the planned sessions kept so far and the next one. A near goal across days, never inside a
// session (progression Decision). Rest, a pause and a safety stop never read as missed.

/** Under the strip on both homes, whatever the week holds. */
export const SAFE_STOP_NOTE = 'A safety stop counts as kept.';

export function WeekPanel({
  fetchImpl,
  refresh = 0,
  onSettled,
  onWeek,
  now = () => new Date(),
}: {
  fetchImpl?: typeof fetch;
  /** Reload when this changes (a session recorded, the days changed, the app reconnected). */
  refresh?: number;
  onSettled?: () => void;
  /** Hears each week loaded, so the keeper's Today panel can say what comes next. */
  onWeek?: (week: WeekView) => void;
  now?: () => Date;
}) {
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ready'; data: WeekView } | { kind: 'error' }>({
    kind: 'loading',
  });
  useSettled(state.kind !== 'loading', onSettled);

  useEffect(() => {
    let live = true;
    fetchWeek(fetchImpl, now())
      .then((data) => {
        if (!live) return;
        setState({ kind: 'ready', data });
        onWeek?.(data);
      })
      .catch(() => live && setState((s) => (s.kind === 'ready' ? s : { kind: 'error' })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchImpl, refresh]);

  return (
    <article className="card week" aria-labelledby="week-title" aria-busy={state.kind === 'loading'}>
      <h2 id="week-title">This week</h2>
      {state.kind === 'loading' && <Skeleton lines={3} className="skeleton-week" />}
      {/* No Retry here: the week loads again with the next session or reconnect. */}
      {state.kind === 'error' && <p>The week will show here after the next session.</p>}
      {state.kind === 'ready' && (
        <>
          <p className="week-count">{countText(state.data)}</p>
          <ol className="week-strip" aria-label="Days this week">
            {state.data.days.map((d) => (
              <li
                key={d.date}
                className={`week-day state-${d.state}${d.isToday ? ' is-today' : ''}`}
                aria-current={d.isToday ? 'date' : undefined}
              >
                <span className="week-day-name">{d.day}</span>
                <span className="week-day-state">{STATE_LABEL[d.state]}</span>
              </li>
            ))}
          </ol>
          <p className="meta">{SAFE_STOP_NOTE}</p>
          {/* Kept one line tall with or without a next session, so nothing below moves. */}
          <p className="week-next">{state.data.next ? nextText(state.data.next) : ''}</p>
        </>
      )}
    </article>
  );
}
