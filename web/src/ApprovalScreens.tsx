import { useCallback, useEffect, useState } from 'react';
import {
  answerRequest,
  fetchApproved,
  fetchAudit,
  fetchBadge,
  fetchPending,
  KIND_LABEL,
  undoApproval,
  undoMessage,
  type ApprovedItem,
  type AuditEntry,
  type PendingRequest,
} from './approvals';
import { fetchPauseStatus, type PauseStatus } from './pain';
import { PauseInboxItem } from './PainScreens';
import { LoadError, Skeleton, useSettled } from './Loading';

type Load<T> = { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error' };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** The toast after an answer: Undo while the window lasts, then the outcome of an undo. */
type Toast = { kind: 'undo'; id: string; title: string } | { kind: 'note'; text: string };

/** How long a toast with no Undo stays up. */
const NOTE_MS = 6000;

/**
 * The parent's inbox: the pause item when training is paused, every pending request with
 * Approve and Decline, and the badge. After an approval a toast offers Undo for the server's
 * undo window.
 */
export function ParentInbox({
  fetchImpl,
  onChange,
  refresh = 0,
  onSettled,
}: {
  fetchImpl?: typeof fetch;
  onChange?: () => void;
  /** Reload when this changes (an undo from the History, for example). */
  refresh?: number;
  onSettled?: () => void;
}) {
  const [state, setState] = useState<Load<{ requests: PendingRequest[]; badge: number; pause: PauseStatus | null }>>({
    kind: 'loading',
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<{ toast: Toast; ms: number } | null>(null);
  useSettled(state.kind !== 'loading', onSettled);

  const load = useCallback(async () => {
    try {
      // The pause item loads with the requests, so it never appears above them later.
      const [requests, badge, pause] = await Promise.all([
        fetchPending(fetchImpl),
        fetchBadge(fetchImpl),
        fetchPauseStatus(fetchImpl).catch(() => null),
      ]);
      setState({ kind: 'ready', data: { requests, badge, pause } });
      // Undone elsewhere (the History): the request is back, so its Undo toast goes.
      setToast((t) => {
        const shown = t?.toast;
        return shown?.kind === 'undo' && requests.some((r) => r.id === shown.id) ? null : t;
      });
    } catch {
      setState({ kind: 'error' });
    }
  }, [fetchImpl]);

  useEffect(() => {
    void load();
  }, [load, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.ms);
    return () => clearTimeout(timer);
  }, [toast]);

  async function answer(r: PendingRequest, verb: 'approve' | 'decline') {
    setBusy(r.id);
    setFailed(false);
    try {
      const { undoForMs } = await answerRequest(r.id, verb, fetchImpl);
      if (verb === 'approve' && undoForMs > 0) setToast({ toast: { kind: 'undo', id: r.id, title: r.title }, ms: undoForMs });
    } catch {
      setFailed(true);
    }
    await load();
    setBusy(null);
    onChange?.();
  }

  async function undo(id: string) {
    setBusy(id);
    try {
      await undoApproval(id, fetchImpl);
      setToast({ toast: { kind: 'note', text: "Approval undone. It's back in the inbox." }, ms: NOTE_MS });
    } catch (e) {
      setToast({ toast: { kind: 'note', text: undoMessage(e) }, ms: NOTE_MS });
    }
    await load();
    setBusy(null);
    onChange?.();
  }

  const badge = state.kind === 'ready' ? state.data.badge : 0;

  return (
    <article className="card" aria-labelledby="inbox-title" aria-busy={state.kind === 'loading'}>
      <h2 id="inbox-title" className="with-badge">
        Inbox
        {badge > 0 && (
          <span className="badge" aria-label={`${badge} waiting`}>
            {badge}
          </span>
        )}
      </h2>
      {state.kind === 'ready' && (
        <PauseInboxItem fetchImpl={fetchImpl} onChange={onChange} status={state.data.pause} onReload={load} />
      )}
      {state.kind === 'loading' && <Skeleton lines={4} className="skeleton-request" />}
      {state.kind === 'error' && (
        <LoadError
          message="Couldn't load the inbox."
          onRetry={() => {
            setState({ kind: 'loading' });
            void load();
          }}
        />
      )}
      {failed && <p role="alert">That answer didn't go through. It is still waiting.</p>}
      {state.kind === 'ready' && state.data.requests.length === 0 && <p>Nothing to approve.</p>}
      {state.kind === 'ready' && state.data.requests.length > 0 && (
        <ul className="requests">
          {state.data.requests.map((r) => (
            <li key={r.id} className="request" aria-label={r.title}>
              <span className="kind">{KIND_LABEL[r.kind] ?? r.kind}</span>
              <h3>{r.title}</h3>
              <p>{r.detail}</p>
              <p className="meta">Lapses unanswered on {formatDate(r.expiresAt)}; silence never approves.</p>
              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  disabled={busy !== null}
                  onClick={() => void answer(r, 'approve')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy !== null}
                  onClick={() => void answer(r, 'decline')}
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast.toast.kind === 'undo' ? (
            <>
              <span>Approved: {toast.toast.title}</span>
              <button
                type="button"
                className="secondary"
                disabled={busy !== null}
                onClick={() => void undo((toast.toast as { id: string }).id)}
              >
                Undo
              </button>
            </>
          ) : (
            <span>{toast.toast.text}</span>
          )}
        </div>
      )}
    </article>
  );
}

/** The keeper's training: approved items only. Pending changes show as a count, never content. */
export function ApprovedTraining({
  fetchImpl,
  refresh = 0,
  onSettled,
}: {
  fetchImpl?: typeof fetch;
  refresh?: number;
  onSettled?: () => void;
}) {
  const [state, setState] = useState<Load<{ items: ApprovedItem[]; waiting: number }>>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useSettled(state.kind !== 'loading', onSettled);

  useEffect(() => {
    let live = true;
    fetchApproved(fetchImpl)
      .then((data) => live && setState({ kind: 'ready', data }))
      .catch(() => live && setState({ kind: 'error' }));
    return () => {
      live = false;
    };
  }, [fetchImpl, attempt, refresh]);

  return (
    <article className="card" aria-labelledby="training-title" aria-busy={state.kind === 'loading'}>
      <h2 id="training-title">Your training</h2>
      {state.kind === 'loading' && <Skeleton lines={3} className="skeleton-request" />}
      {state.kind === 'error' && (
        <LoadError
          message="Couldn't load your training."
          onRetry={() => {
            setState({ kind: 'loading' });
            setAttempt((n) => n + 1);
          }}
        />
      )}
      {state.kind === 'ready' && (
        <>
          {state.data.items.length === 0 ? (
            <p>No session planned yet.</p>
          ) : (
            <ul className="requests">
              {state.data.items.map((i) => (
                <li key={`${i.itemId}:${i.itemVersion}`} className="request">
                  <span className="kind">{KIND_LABEL[i.kind] ?? i.kind}</span>
                  <h3>{i.title}</h3>
                  <p>{i.detail}</p>
                </li>
              ))}
            </ul>
          )}
          {state.data.waiting > 0 && (
            <p className="meta">
              {state.data.waiting === 1
                ? 'A change is waiting for your parent.'
                : `${state.data.waiting} changes are waiting for your parent.`}
            </p>
          )}
        </>
      )}
    </article>
  );
}

const ACTION_TEXT: Record<AuditEntry['action'], string> = {
  requested: 'asked for',
  approved: 'approved',
  declined: 'declined',
  expired: 'lapsed',
  refused: 'refused',
  paused: 'reported',
  cleared: 'cleared',
  changed: 'set',
  undone: 'undid the approval of',
};

const REFUSED_VERB: Record<AuditEntry['kind'], string> = {
  plan: 'answer',
  exercise: 'answer',
  harder_version: 'answer',
  pause: 'clear',
  schedule: 'change',
};

const ACTOR_TEXT: Record<AuditEntry['actorRole'], string> = {
  parent: 'Parent',
  keeper: 'Keeper',
  system: 'App',
};

/**
 * The audit log, newest first. Both roles see the same history. The parent's latest approval
 * of a request carries Undo while the server's undo window lasts.
 */
export function History({
  fetchImpl,
  refresh = 0,
  onChange,
  onSettled,
}: {
  fetchImpl?: typeof fetch;
  refresh?: number;
  /** Called after an undo from here, so the inbox can reload. */
  onChange?: () => void;
  onSettled?: () => void;
}) {
  const [state, setState] = useState<Load<{ events: AuditEntry[]; at: number }>>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [, setTick] = useState(0);
  useSettled(state.kind !== 'loading', onSettled);

  useEffect(() => {
    let live = true;
    fetchAudit(fetchImpl)
      .then((events) => live && setState({ kind: 'ready', data: { events, at: Date.now() } }))
      .catch(() => live && setState({ kind: 'error' }));
    return () => {
      live = false;
    };
  }, [fetchImpl, refresh, attempt]);

  // Hide each Undo when its window ends.
  const undoUntil = (e: AuditEntry) =>
    state.kind === 'ready' && e.action === 'approved' && e.requestId && (e.undoForMs ?? 0) > 0
      ? state.data.at + (e.undoForMs ?? 0)
      : 0;
  const nextEnd =
    state.kind === 'ready'
      ? Math.min(...state.data.events.map(undoUntil).filter((t) => t > Date.now()), Infinity)
      : Infinity;
  useEffect(() => {
    if (!Number.isFinite(nextEnd)) return;
    const timer = setTimeout(() => setTick((n) => n + 1), Math.max(0, nextEnd - Date.now()));
    return () => clearTimeout(timer);
  }, [nextEnd]);

  async function undo(id: string) {
    setBusy(true);
    try {
      await undoApproval(id, fetchImpl);
      setNote("Approval undone. It's back in the inbox.");
    } catch (e) {
      setNote(undoMessage(e));
    }
    setBusy(false);
    setAttempt((n) => n + 1);
    onChange?.();
  }

  return (
    <article className="card" aria-labelledby="history-title" aria-busy={state.kind === 'loading'}>
      <h2 id="history-title">History</h2>
      {state.kind === 'loading' && <Skeleton lines={3} />}
      {state.kind === 'error' && (
        <LoadError
          message="Couldn't load the history."
          onRetry={() => {
            setState({ kind: 'loading' });
            setAttempt((n) => n + 1);
          }}
        />
      )}
      {note && <p role="status">{note}</p>}
      {state.kind === 'ready' && state.data.events.length === 0 && <p>Nothing yet.</p>}
      {state.kind === 'ready' && state.data.events.length > 0 && (
        <ol className="history">
          {[...state.data.events].reverse().map((e) => (
            <li key={e.id}>
              <time dateTime={e.at}>{formatDate(e.at)}</time>{' '}
              {e.action === 'expired'
                ? `${e.title} lapsed unanswered`
                : e.action === 'refused'
                  ? `${ACTOR_TEXT[e.actorRole]} tried to ${REFUSED_VERB[e.kind] ?? 'answer'} ${e.title}; refused`
                  : e.action === 'paused'
                    ? `${ACTOR_TEXT[e.actorRole]} reported ${e.title}; training paused`
                    : `${ACTOR_TEXT[e.actorRole]} ${ACTION_TEXT[e.action]} ${e.title}`}
              {e.reason && e.action === 'declined' ? `: ${e.reason}` : ''}
              {undoUntil(e) > Date.now() && (
                <button
                  type="button"
                  className="secondary undo"
                  disabled={busy}
                  aria-label={`Undo approval of ${e.title}`}
                  onClick={() => void undo(e.requestId!)}
                >
                  Undo
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
