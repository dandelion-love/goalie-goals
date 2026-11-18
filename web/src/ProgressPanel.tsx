import { useEffect, useState } from 'react';
import { fetchProgress, type FinishProgress, type ProgressSummary, type Run } from './progress';

// Gain framing only (progression Decision): what the pair has built, never what they could
// lose. A run that ended is shown as a completed run; there is no repair offer.

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const days = (n: number) => `${n} training ${n === 1 ? 'day' : 'days'}`;

function Streaks({ summary }: { summary: ProgressSummary }) {
  return (
    <dl className="streaks">
      <div className="streak team">
        <dt>Team streak</dt>
        <dd>{days(summary.team.current)}</dd>
      </div>
      <div className="streak">
        <dt>Keeper's streak</dt>
        <dd>{days(summary.keeper.current)}</dd>
      </div>
      <div className="streak">
        <dt>Parent's streak</dt>
        <dd>{days(summary.parent.current)}</dd>
      </div>
      <div className="streak">
        <dt>Team XP</dt>
        <dd>{summary.xp.total} XP</dd>
      </div>
    </dl>
  );
}

function RunLine({ run }: { run: Run }) {
  return (
    <li>
      {formatDay(run.start)} to {formatDay(run.end)}: {days(run.days)} kept
    </li>
  );
}

/** XP and streaks on both homes. Rest and pause days hold every streak. */
export function ProgressPanel({ fetchImpl, refresh = 0 }: { fetchImpl?: typeof fetch; refresh?: number }) {
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ready'; data: ProgressSummary } | { kind: 'error' }>({
    kind: 'loading',
  });

  useEffect(() => {
    let live = true;
    fetchProgress(fetchImpl)
      .then((data) => live && setState({ kind: 'ready', data }))
      .catch(() => live && setState({ kind: 'error' }));
    return () => {
      live = false;
    };
  }, [fetchImpl, refresh]);

  return (
    <article className="card progress" aria-labelledby="progress-title">
      <h2 id="progress-title">Together so far</h2>
      {state.kind === 'loading' && <p role="status">Loading…</p>}
      {state.kind === 'error' && <p>Progress will show here after your next session.</p>}
      {state.kind === 'ready' && (
        <>
          <Streaks summary={state.data} />
          <p className="meta">Rest days and pauses never break a streak.</p>
          {state.data.team.current === 0 && state.data.runs.length > 0 && (
            <p>A new run starts with your next session.</p>
          )}
          {state.data.runs.length > 0 && (
            <>
              <h3>Completed runs</h3>
              <ul className="runs">
                {state.data.runs.map((r) => (
                  <RunLine key={`${r.start}:${r.end}`} run={r} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </article>
  );
}

/** This session's XP and the streaks after it, on the finish screen. */
export function FinishProgressView({ progress }: { progress: FinishProgress | 'saving' | 'unsaved' | null | undefined }) {
  if (!progress) return null;
  if (progress === 'saving') return <p className="meta" role="status">Adding up today's XP…</p>;
  if (progress === 'unsaved') return <p className="meta">Couldn't reach the app to add up today's XP.</p>;
  const { credit, summary } = progress;
  if (credit.total === 0) {
    return (
      <section className="earned" aria-label="Earned today">
        <p className="meta">Today's XP was already counted. Extra sessions add nothing: rest is training too.</p>
        <Streaks summary={summary} />
      </section>
    );
  }
  return (
    <section className="earned" aria-label="Earned today">
      <p className="xp-earned">+{credit.total} XP</p>
      <p className="meta">
        {credit.session} for showing up
        {credit.stars > 0 ? `, ${credit.form} for ${credit.stars} good-form ${credit.stars === 1 ? 'set' : 'sets'}` : ''}
      </p>
      <Streaks summary={summary} />
    </section>
  );
}
