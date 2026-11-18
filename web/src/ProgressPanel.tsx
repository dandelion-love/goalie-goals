import { useEffect, useState } from 'react';
import { useSettled } from './Loading';
import { useOnline } from './offline';
import { fetchProgress, OfflineError, type FinishProgressState, type ProgressSummary, type Run } from './progress';

// Gain framing only (progression Decision): what the pair has built, never what they could
// lose. A run that ended is shown as a completed run; there is no repair offer.

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** The panel's text when the summary can't be fetched because the device is offline (story #94 AC4). */
export const PROGRESS_OFFLINE_TEXT = "You're offline. Progress will update here when you're back online.";
/** Saved on the device, waiting for the network: the finish screen's line (story #94 AC3). */
export const QUEUED_TEXT = 'Saved on this device; it will sync.';

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

/** The streak tiles at their final size, values not yet known. */
function StreaksSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <dl className="streaks skeleton">
        {['Team streak', "Keeper's streak", "Parent's streak", 'Team XP'].map((label, i) => (
          <div key={label} className={i === 0 ? 'streak team' : 'streak'}>
            <dt>{label}</dt>
            <dd>
              <span className="skeleton-line" aria-hidden="true" />
            </dd>
          </div>
        ))}
      </dl>
    </div>
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
export function ProgressPanel({
  fetchImpl,
  refresh = 0,
  onSettled,
}: {
  fetchImpl?: typeof fetch;
  refresh?: number;
  onSettled?: () => void;
}) {
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'ready'; data: ProgressSummary } | { kind: 'error' } | { kind: 'offline' }
  >({
    kind: 'loading',
  });
  const online = useOnline();
  useSettled(state.kind !== 'loading', onSettled);

  // Back online: load again, so sessions synced from the device show.
  useEffect(() => {
    let live = true;
    fetchProgress(fetchImpl)
      .then((data) => live && setState({ kind: 'ready', data }))
      .catch((e: unknown) => live && setState({ kind: e instanceof OfflineError || !online ? 'offline' : 'error' }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchImpl, refresh, online]);

  return (
    <article className="card progress" aria-labelledby="progress-title" aria-busy={state.kind === 'loading'}>
      <h2 id="progress-title">Together so far</h2>
      {state.kind === 'loading' && (
        <>
          <StreaksSkeleton />
          <p className="meta">Rest days and pauses never break a streak.</p>
        </>
      )}
      {state.kind === 'error' && <p>Progress will show here after your next session.</p>}
      {state.kind === 'offline' && <p>{PROGRESS_OFFLINE_TEXT}</p>}
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
export function FinishProgressView({ progress }: { progress: FinishProgressState | undefined }) {
  if (!progress) return null;
  if (progress === 'saving') return <p className="meta" role="status">Adding up today's XP…</p>;
  if (progress === 'queued') {
    return (
      <p className="meta queued" role="status">
        {QUEUED_TEXT}
      </p>
    );
  }
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
