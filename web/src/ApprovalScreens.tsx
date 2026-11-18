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
import { LoadSpace, useSettled } from './Loading';
import { SAVING, SavingAnnouncer, savingProps, useOneAtATime } from './Saving';

type Load<T> = { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error' };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * The toast after an answer: Undo while the window lasts, then the outcome of an undo. An answer
 * that didn't go through is an `error`, read out as an alert.
 */
type Toast = { kind: 'undo'; id: string; title: string } | { kind: 'note' | 'error'; text: string };

/** How long a toast with no Undo stays up. */
const NOTE_MS = 6000;

/**
 * A request as the inbox shows it. `answered` marks one the parent has just answered, held in
 * its place (story #95 AC3).
 */
type Row = { request: PendingRequest; answered?: 'approve' | 'decline' };

/**
 * An answer that lands this soon after the tap takes its item away at once: the list closes up
 * as the tap's own result, inside the 500 ms the layout-shift measure gives an input. Later than
 * this, the item stays where it is with its outcome, and goes at the parent's next answer, so
 * nothing moves on its own while the parent reads (story #95 AC3).
 */
export const CLOSE_UP_MS = 300;

/**
 * The inbox's rows after a load: each row keeps its place. A row the server still lists is
 * pending again (an undo puts it back where it was); an answered row stays until the next
 * answer; any other row has gone (answered elsewhere, or lapsed). A request not yet shown goes
 * after the one before it in the server's order.
 */
export function mergeRows(rows: Row[], requests: PendingRequest[]): Row[] {
  const fresh = new Map(requests.map((r) => [r.id, r]));
  const out: Row[] = [];
  for (const row of rows) {
    const request = fresh.get(row.request.id);
    if (request) out.push({ request });
    else if (row.answered) out.push(row);
  }
  requests.forEach((r, i) => {
    if (out.some((x) => x.request.id === r.id)) return;
    const at = i === 0 ? 0 : out.findIndex((x) => x.request.id === requests[i - 1].id) + 1;
    out.splice(at, 0, { request: r });
  });
  return out;
}

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
  const [state, setState] = useState<Load<{ rows: Row[]; badge: number; pause: PauseStatus | null }>>({
    kind: 'loading',
  });
  /** The request on its way, and which control sent it (it reads "Saving…" until it lands). */
  const [busy, setBusy] = useState<{ id: string; verb: 'approve' | 'decline' | 'undo' } | null>(null);
  const [toast, setToast] = useState<{ toast: Toast; ms: number } | null>(null);
  const once = useOneAtATime();
  useSettled(state.kind !== 'loading', onSettled);

  /** Changes the rows of a loaded inbox (at a tap, or as an answer lands). */
  const editRows = (edit: (rows: Row[]) => Row[]) =>
    setState((s) => (s.kind === 'ready' ? { kind: 'ready', data: { ...s.data, rows: edit(s.data.rows) } } : s));

  const load = useCallback(async () => {
    try {
      // The pause item loads with the requests, so it never appears above them later.
      const [requests, badge, pause] = await Promise.all([
        fetchPending(fetchImpl),
        fetchBadge(fetchImpl),
        fetchPauseStatus(fetchImpl).catch(() => null),
      ]);
      setState((s) => ({
        kind: 'ready',
        data: { rows: mergeRows(s.kind === 'ready' ? s.data.rows : [], requests), badge, pause },
      }));
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

  const answer = (r: PendingRequest, verb: 'approve' | 'decline') =>
    once(async () => {
      const tapped = Date.now();
      // Items answered earlier go now, as part of this tap, so the list closes up at a moment
      // the parent caused (story #95 AC3).
      editRows((rows) => rows.filter((x) => !x.answered));
      setBusy({ id: r.id, verb });
      try {
        const { undoForMs } = await answerRequest(r.id, verb, fetchImpl);
        if (verb === 'approve' && undoForMs > 0) setToast({ toast: { kind: 'undo', id: r.id, title: r.title }, ms: undoForMs });
        const soon = Date.now() - tapped <= CLOSE_UP_MS;
        editRows((rows) =>
          soon ? rows.filter((x) => x.request.id !== r.id) : rows.map((x) => (x.request.id === r.id ? { ...x, answered: verb } : x)),
        );
      } catch {
        // In the toast's place, which is always kept, so the message moves nothing.
        setToast({ toast: { kind: 'error', text: "That answer didn't go through. It is still waiting." }, ms: NOTE_MS });
      }
      await load();
      setBusy(null);
      onChange?.();
    });

  const undo = (id: string) =>
    once(async () => {
      setBusy({ id, verb: 'undo' });
      try {
        await undoApproval(id, fetchImpl);
        setToast({ toast: { kind: 'note', text: "Approval undone. It's back in the inbox." }, ms: NOTE_MS });
      } catch (e) {
        setToast({ toast: { kind: 'note', text: undoMessage(e) }, ms: NOTE_MS });
      }
      await load();
      setBusy(null);
      onChange?.();
    });

  /** The control that sent the pending request reads "Saving…"; the others wait, disabled. */
  const pressed = (id: string, verb: 'approve' | 'decline' | 'undo') => busy?.id === id && busy.verb === verb;
  const control = (id: string, verb: 'approve' | 'decline' | 'undo', label: string) => ({
    disabled: busy !== null && !pressed(id, verb),
    ...savingProps(pressed(id, verb)),
    children: pressed(id, verb) ? SAVING : label,
  });

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
      {/* Undo's "Saving…" is read by the toast's own polite region, so it is said once. */}
      <SavingAnnouncer pending={busy !== null && busy.verb !== 'undo'} />
      {state.kind !== 'ready' && (
        <LoadSpace
          failed={state.kind === 'error'}
          lines={4}
          size="skeleton-request"
          message="Couldn't load the inbox."
          onRetry={() => {
            setState({ kind: 'loading' });
            void load();
          }}
        />
      )}
      {state.kind === 'ready' && state.data.rows.length === 0 && <p>Nothing to approve.</p>}
      {state.kind === 'ready' && state.data.rows.length > 0 && (
        <ul className="requests">
          {state.data.rows.map(({ request: r, answered }) => (
            <li key={r.id} className="request" aria-label={r.title}>
              <span className="kind">{KIND_LABEL[r.kind] ?? r.kind}</span>
              <h3>{r.title}</h3>
              <p>{r.detail}</p>
              {/* One text node, so no reader or audit script puts a space before the semicolon. */}
              <p className="meta">{`Lapses unanswered on ${formatDate(r.expiresAt)}; silence never approves.`}</p>
              {answered ? (
                // The outcome takes the buttons' place at their height, so the list keeps its shape.
                <div className="actions outcome">{answered === 'approve' ? 'Approved' : 'Declined'}</div>
              ) : (
                <div className="actions">
                  <button
                    type="button"
                    className="primary"
                    {...control(r.id, 'approve', 'Approve')}
                    onClick={() => void answer(r, 'approve')}
                  />
                  <button
                    type="button"
                    className="secondary"
                    {...control(r.id, 'decline', 'Decline')}
                    onClick={() => void answer(r, 'decline')}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* A slot kept at the toast's height after the list, toast or not: the toast comes and goes
          inside it, so nothing moves (story #95), and never over a target (story #96 AC1). */}
      <div className="toast-slot" aria-hidden={toast ? undefined : true}>
        {toast && (
          <div className="toast" role={toast.toast.kind === 'error' ? 'alert' : 'status'}>
            {toast.toast.kind === 'undo' ? (
              <>
                <span className="toast-text">{`Approved: ${toast.toast.title}`}</span>
                <button
                  type="button"
                  className="secondary"
                  {...control(toast.toast.id, 'undo', 'Undo')}
                  onClick={() => void undo((toast.toast as { id: string }).id)}
                />
              </>
            ) : (
              <span className="toast-text">{toast.toast.text}</span>
            )}
          </div>
        )}
      </div>
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
      {state.kind !== 'ready' && (
        <LoadSpace
          failed={state.kind === 'error'}
          lines={3}
          size="skeleton-request"
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
  started: 'started',
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
  /** The request whose Undo is on its way (it reads "Saving…" until it lands). */
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const once = useOneAtATime();
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

  const undo = (id: string) =>
    once(async () => {
      setBusy(id);
      try {
        await undoApproval(id, fetchImpl);
        setNote("Approval undone. It's back in the inbox.");
      } catch (e) {
        setNote(undoMessage(e));
      }
      setBusy(null);
      setAttempt((n) => n + 1);
      onChange?.();
    });

  return (
    <article className="card" aria-labelledby="history-title" aria-busy={state.kind === 'loading'}>
      <h2 id="history-title">History</h2>
      {state.kind !== 'ready' && (
        <LoadSpace
          failed={state.kind === 'error'}
          lines={3}
          message="Couldn't load the history."
          onRetry={() => {
            setState({ kind: 'loading' });
            setAttempt((n) => n + 1);
          }}
        />
      )}
      <SavingAnnouncer pending={busy !== null} />
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
                    : e.action === 'started'
                      ? `${e.title} started before the undo reached the device; it still counts`
                      : `${ACTOR_TEXT[e.actorRole]} ${ACTION_TEXT[e.action]} ${e.title}`}
              {e.reason && e.action === 'declined' ? `: ${e.reason}` : ''}
              {undoUntil(e) > Date.now() && (
                <button
                  type="button"
                  className="secondary undo"
                  disabled={busy !== null && busy !== e.requestId}
                  {...savingProps(busy === e.requestId)}
                  aria-label={busy === e.requestId ? undefined : `Undo approval of ${e.title}`}
                  onClick={() => void undo(e.requestId!)}
                >
                  {busy === e.requestId ? SAVING : 'Undo'}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {/* After the list, and always in the page: a note that comes moves nothing (story #95). */}
      <div className="history-note" role="status">
        {note}
      </div>
    </article>
  );
}
