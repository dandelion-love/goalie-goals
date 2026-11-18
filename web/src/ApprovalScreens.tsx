import { useCallback, useEffect, useState } from 'react';
import {
  answerRequest,
  fetchApproved,
  fetchAudit,
  fetchBadge,
  fetchPending,
  KIND_LABEL,
  type ApprovedItem,
  type AuditEntry,
  type PendingRequest,
} from './approvals';
import { PauseInboxItem } from './PainScreens';

type Load<T> = { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error' };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** The parent's inbox: every pending request, with Approve and Decline, and the badge. */
export function ParentInbox({ fetchImpl, onChange }: { fetchImpl?: typeof fetch; onChange?: () => void }) {
  const [state, setState] = useState<Load<{ requests: PendingRequest[]; badge: number }>>({ kind: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [requests, badge] = await Promise.all([fetchPending(fetchImpl), fetchBadge(fetchImpl)]);
      setState({ kind: 'ready', data: { requests, badge } });
    } catch {
      setState({ kind: 'error' });
    }
  }, [fetchImpl]);

  useEffect(() => {
    void load();
  }, [load]);

  async function answer(id: string, verb: 'approve' | 'decline') {
    setBusy(id);
    setFailed(false);
    try {
      await answerRequest(id, verb, fetchImpl);
    } catch {
      setFailed(true);
    }
    await load();
    setBusy(null);
    onChange?.();
  }

  const badge = state.kind === 'ready' ? state.data.badge : 0;

  return (
    <article className="card" aria-labelledby="inbox-title">
      <h2 id="inbox-title" className="with-badge">
        Inbox
        {badge > 0 && (
          <span className="badge" aria-label={`${badge} waiting`}>
            {badge}
          </span>
        )}
      </h2>
      <PauseInboxItem fetchImpl={fetchImpl} onChange={onChange} />
      {state.kind === 'loading' && <p role="status">Loading…</p>}
      {state.kind === 'error' && <p role="alert">Couldn't load the inbox. Try again later.</p>}
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
                  onClick={() => void answer(r.id, 'approve')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy !== null}
                  onClick={() => void answer(r.id, 'decline')}
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** The keeper's training: approved items only. Pending changes show as a count, never content. */
export function ApprovedTraining({ fetchImpl }: { fetchImpl?: typeof fetch }) {
  const [state, setState] = useState<Load<{ items: ApprovedItem[]; waiting: number }>>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    fetchApproved(fetchImpl)
      .then((data) => live && setState({ kind: 'ready', data }))
      .catch(() => live && setState({ kind: 'error' }));
    return () => {
      live = false;
    };
  }, [fetchImpl]);

  return (
    <article className="card" aria-labelledby="training-title">
      <h2 id="training-title">Your training</h2>
      {state.kind === 'loading' && <p role="status">Loading…</p>}
      {state.kind === 'error' && <p role="alert">Couldn't load your training.</p>}
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

/** The audit log, newest first. Both roles see the same history. */
export function History({ fetchImpl, refresh = 0 }: { fetchImpl?: typeof fetch; refresh?: number }) {
  const [state, setState] = useState<Load<AuditEntry[]>>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    fetchAudit(fetchImpl)
      .then((data) => live && setState({ kind: 'ready', data }))
      .catch(() => live && setState({ kind: 'error' }));
    return () => {
      live = false;
    };
  }, [fetchImpl, refresh]);

  return (
    <article className="card" aria-labelledby="history-title">
      <h2 id="history-title">History</h2>
      {state.kind === 'loading' && <p role="status">Loading…</p>}
      {state.kind === 'error' && <p role="alert">Couldn't load the history.</p>}
      {state.kind === 'ready' && state.data.length === 0 && <p>Nothing yet.</p>}
      {state.kind === 'ready' && state.data.length > 0 && (
        <ol className="history">
          {[...state.data].reverse().map((e) => (
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
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
