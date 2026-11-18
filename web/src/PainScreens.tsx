import { useCallback, useEffect, useState } from 'react';
import { BODY_AREAS, bodyAreaLabel, clearPause, fetchPauseStatus, type BodyArea, type PauseStatus } from './pain';

/** Where it hurts (a short fixed list) and an optional note. Nothing else is asked. */
export function PainReportForm({ onSend }: { onSend: (area: BodyArea, note: string) => Promise<boolean> }) {
  const [area, setArea] = useState<BodyArea | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'editing' | 'sending' | 'sent' | 'saved'>('editing');

  if (state === 'sent') return <p className="pain-sent" role="status">Your parent has been told. Training is paused until they clear it.</p>;
  if (state === 'saved') {
    return (
      <p className="pain-sent" role="status">
        Saved on this device. Training is paused, and your parent will be told as soon as the app is back online.
      </p>
    );
  }

  return (
    <form
      className="pain-form"
      aria-label="Pain report"
      onSubmit={(e) => {
        e.preventDefault();
        if (!area) return;
        setState('sending');
        void onSend(area, note.trim()).then((ok) => setState(ok ? 'sent' : 'saved'));
      }}
    >
      <fieldset>
        <legend>Where does it hurt?</legend>
        <div className="area-options">
          {BODY_AREAS.map(([id, label]) => (
            <label key={id} className={area === id ? 'area-option chosen' : 'area-option'}>
              <input type="radio" name="body-area" value={id} checked={area === id} onChange={() => setArea(id)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="pain-note">
        Anything else? (optional)
        <textarea value={note} maxLength={500} rows={3} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button
        type="submit"
        className="primary session-control wide"
        disabled={!area || state === 'sending'}
        aria-describedby={area ? undefined : 'pain-hint'}
      >
        Tell my parent
      </button>
      {!area && (
        <p id="pain-hint" className="meta">
          Choose where it hurts first.
        </p>
      )}
    </form>
  );
}

/** The red flags, in two short sentences (quality rubric CT1: at most 20 words each). */
export const SEE_SOMEONE =
  'See a health professional before training again after a knock to the head, chest pain, fainting or swelling. ' +
  'The same goes for pain that changes how you move.';

/** The keeper's home while paused: rest, and nothing to train. */
export function PausedPanel() {
  return (
    <article className="card paused" aria-labelledby="paused-title">
      <h2 id="paused-title">Training is paused</h2>
      <p>Something hurt, so training stops until your parent clears it. Rest, and tell an adult if it gets worse.</p>
      <p className="meta">{SEE_SOMEONE}</p>
    </article>
  );
}

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * The urgent item at the top of the parent's inbox: what the keeper reported and the only way
 * to clear the pause. The server refuses a clear from anyone but a parent.
 */
export function PauseInboxItem({
  fetchImpl,
  onChange,
  status: given,
  onReload,
}: {
  fetchImpl?: typeof fetch;
  onChange?: () => void;
  /** The pause status when the inbox loads it with the requests; loaded here otherwise. */
  status?: PauseStatus | null;
  onReload?: () => Promise<void>;
}) {
  const controlled = given !== undefined;
  const [own, setOwn] = useState<PauseStatus | null>(null);
  const status = controlled ? given : own;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (controlled) {
      await onReload?.();
      return;
    }
    try {
      setOwn(await fetchPauseStatus(fetchImpl));
    } catch {
      setOwn(null);
    }
  }, [fetchImpl, controlled, onReload]);

  useEffect(() => {
    if (!controlled) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchImpl, controlled]);

  if (!status?.paused) return null;

  async function clear() {
    setBusy(true);
    setFailed(false);
    try {
      await clearPause(fetchImpl);
    } catch {
      setFailed(true);
    }
    await load();
    setBusy(false);
    onChange?.();
  }

  return (
    <article className="card urgent" aria-labelledby="pause-title">
      <span className="kind">Urgent</span>
      <h2 id="pause-title">Training paused: something hurts</h2>
      <ul className="requests">
        {status.reports.map((r) => (
          <li key={r.id} className="request">
            <h3>{bodyAreaLabel(r.bodyArea)}</h3>
            <p className="meta">Reported {formatDay(r.date)}</p>
            {r.note && <p>{r.note}</p>}
          </li>
        ))}
      </ul>
      <p className="meta">{SEE_SOMEONE} Clear the pause only when it no longer hurts.</p>
      {failed && <p role="alert">That didn't go through. Training is still paused.</p>}
      <button type="button" className="primary" disabled={busy} onClick={() => void clear()}>
        Clear the pause
      </button>
    </article>
  );
}
