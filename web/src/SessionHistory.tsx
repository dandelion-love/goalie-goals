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

function SquatSetForm({ session, card, set, fetchImpl, onSaved }: { session: HistorySession; card: HistoryCard; set: number; fetchImpl?: typeof fetch; onSaved: () => void }) {
  const saved = card.squatSets?.[set];
  const [reps, setReps] = useState(saved ? String(saved.actualReps) : '');
  const [clean, setClean] = useState(saved ? (saved.clean ? 'yes' : 'no') : '');
  const [message, setMessage] = useState('');
  async function save() {
    setMessage('Saving…');
    try {
      const response = await (fetchImpl ?? fetch)('/api/history/squat-set', {
        method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ id: session.id, version: card.itemVersion, set, actualReps: Number(reps), clean: clean === 'yes', previous: saved ?? null }),
      });
      if (!response.ok) throw new Error('save failed');
      setMessage('Saved.');
      onSaved();
    } catch { setMessage('Could not save. Check the reps and try again.'); }
  }
  return <div className="squat-set">
    <p>Set {set + 1}</p>
    <label>Reps completed <input type="number" min="1" step="1" value={reps} onChange={(e) => setReps(e.target.value)} /></label>{' '}
    <label>Every rep clean? <select value={clean} onChange={(e) => setClean(e.target.value)}><option value="">Choose</option><option value="yes">Yes</option><option value="no">No</option></select></label>{' '}
    <button type="button" disabled={!reps || !clean} onClick={save}>Save set</button>
    <span role="status">{message}</span>
  </div>;
}

export function SquatEvidenceStatus({ fetchImpl, refresh = 0 }: { fetchImpl?: typeof fetch; refresh?: number }) {
  const [evidence, setEvidence] = useState<{ status: 'unknown' | 'held'; detail?: string }>({ status: 'unknown' });
  useEffect(() => {
    let live = true;
    (fetchImpl ?? fetch)('/api/history/squat-evidence', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then((r) => r.ok ? r.json() : Promise.reject()).then((v: { status?: string; detail?: string }) => { if (live) setEvidence({ status: v.status === 'held' ? 'held' : 'unknown', detail: v.detail }); })
      .catch(() => { if (live) setEvidence({ status: 'unknown' }); });
    return () => { live = false; };
  }, [fetchImpl, refresh]);
  const details: Record<string, string> = {
    'no-record': ' No squat session is recorded yet.',
    ambiguous: ' The order of recorded sessions is unclear.',
    incomplete: ' A recorded squat has incomplete evidence.',
    'missing-confirmation': ' A recorded squat needs parent confirmation for each set.',
    'not-clean': ' A recorded squat was not all clean.',
    'below-target': ' A recorded squat is below the ladder goal.',
    'safety-unknown': ' Safety and session order still need checking.',
  };
  return <p className="meta">{evidence.status === 'held' ? 'Squat progress is on hold.' : `Squat readiness: evidence incomplete or unknown.${details[evidence.detail ?? ''] ?? ''}`} Paused box squat needs its own approval.</p>;
}

function SessionLine({ session, parent, fetchImpl, onSaved }: { session: HistorySession; parent: boolean; fetchImpl?: typeof fetch; onSaved: () => void }) {
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
                {c.cardId === 'squat-to-box' && c.squatSets?.map((s, index) => s &&
                  <span className="meta" key={index}>Set {index + 1}: {s.actualReps} reps, {s.clean ? 'all clean' : 'not all clean'} (parent confirmed).</span>)}
                {parent && c.cardId === 'squat-to-box' && c.itemVersion && Array.from({ length: c.setsDone }, (_, set) =>
                  <SquatSetForm key={`${c.itemVersion}:${set}`} session={session} card={c} set={set} fetchImpl={fetchImpl} onSaved={onSaved} />)}
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
  parent = false,
}: {
  fetchImpl?: typeof fetch;
  /** Reload when this changes (a session recorded, the app reconnected). */
  refresh?: number;
  onSettled?: () => void;
  parent?: boolean;
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
      <SquatEvidenceStatus fetchImpl={fetchImpl} refresh={refresh + attempt} />
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
            <SessionLine key={s.id} session={s} parent={parent} fetchImpl={fetchImpl} onSaved={() => setAttempt((n) => n + 1)} />
          ))}
        </ol>
      )}
    </article>
  );
}
