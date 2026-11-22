import { useEffect, useState } from 'react';
import type { PendingRequest } from './approvals';
import { isDossier, type Dossier, type DossierClaim } from './dossier';
import { DossierView } from './DossierScreens';

type CardEvidence = {
  name: string; itemVersion: string; why: string; cautions: string[]; setup: string[];
  needs: { all: string[]; any: string[][] } | null; dossier: Dossier | null;
};
type Evidence = { itemVersion: string; dossier: Dossier | null; cards: CardEvidence[] | null };
type State = { kind: 'loading' | 'error' } | { kind: 'ready'; evidence: Evidence };

function validCard(value: CardEvidence): boolean {
  return !!value && typeof value.name === 'string' && typeof value.itemVersion === 'string' && typeof value.why === 'string'
    && Array.isArray(value.cautions) && value.cautions.every((s) => typeof s === 'string')
    && Array.isArray(value.setup) && value.setup.every((s) => typeof s === 'string')
    && (value.needs === null || (!!value.needs && Array.isArray(value.needs.all) && value.needs.all.every((s) => typeof s === 'string')
      && Array.isArray(value.needs.any) && value.needs.any.every((options) => Array.isArray(options) && options.every((s) => typeof s === 'string'))))
    && (value.dossier === null || isDossier(value.dossier));
}

/** A parent sees the request's own version, never a silently substituted snapshot. */
export function DecisionSupport({ request, fetchImpl, disabled = false, onSettled }: { request: PendingRequest; fetchImpl?: typeof fetch; disabled?: boolean; onSettled?: (id: string | null) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    (fetchImpl ?? fetch)(`/api/approvals/${encodeURIComponent(request.id)}/decision-evidence`, {
      credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
    }).then(async (response) => {
      if (!response.ok) throw new Error('Evidence unavailable');
      const data = await response.json() as Evidence;
      if (data.itemVersion !== request.itemVersion || (data.dossier && (!isDossier(data.dossier) || data.dossier.itemVersion !== request.itemVersion))
        || (data.cards !== null && (!Array.isArray(data.cards) || !data.cards.every(validCard)))) throw new Error('Version mismatch');
      if (live) { setState({ kind: 'ready', evidence: data }); onSettled?.(request.id); }
    }).catch(() => { if (live) { setState({ kind: 'error' }); onSettled?.(request.id); } });
    return () => { live = false; };
  }, [request.id, request.itemVersion, fetchImpl, attempt, onSettled]);

  const approve = request.kind === 'dossier'
    ? 'Approving lets the keeper read this dossier version. It does not approve the exercise.'
    : request.kind === 'plan'
      ? 'Approving records this plan version. A session also needs its session and exercise versions approved.'
      : request.kind === 'exercise'
        ? 'Approving records this exercise version. Sessions still need their own matching approvals.'
        : 'Approving records a decision on this version. It does not automatically start the harder version.';

  return <section className="decision-support" aria-label="Decision support">
    <h4>What this decision does</h4>
    <p>{approve}</p>
    <p>Declining leaves this version unapproved. Existing approvals are unchanged.</p>
    <p>Leaving it pending does not approve it. It expires if unanswered.</p>
    <h4>Evidence and practical details</h4>
    {state.kind === 'loading' && <p role="status">Loading evidence…</p>}
    {state.kind === 'error' && <><p>Evidence could not be verified for this request. Return to the inbox or try again.</p><button type="button" className="secondary" disabled={disabled} onClick={() => { onSettled?.(null); setAttempt((n) => n + 1); }}>Retry evidence</button></>}
    {state.kind === 'ready' && <>
      {state.evidence.dossier && <DossierSummary dossier={state.evidence.dossier} exact />}
      {state.evidence.cards?.map((card) => <CardSummary key={card.itemVersion} card={card} />)}
      {!state.evidence.dossier && (!state.evidence.cards || state.evidence.cards.length === 0) && <p>Version-matched evidence is not available for this request. Benefits, cautions and prerequisites could not be verified.</p>}
    </>}
  </section>;
}

function DossierSummary({ dossier, exact = false }: { dossier: Dossier; exact?: boolean }) {
  return <div>
    {!exact && <p className="meta">This is the current dossier. It is separately versioned and not pinned to this request. We cannot verify that it matches.</p>}
    <p>{dossier.headline}</p>
    {dossier.why.length > 0 && <ul>{dossier.why.map((claim, i) => <li key={i}><ClaimText claim={claim} /></li>)}</ul>}
    {dossier.expect.length > 0 ? <ul>{dossier.expect.map((claim, i) => <li key={i}>{claim.label}: <ClaimText claim={claim} /></li>)}</ul> : <p>Expected gains are not recorded.</p>}
    {exact && <p>Version-matched cautions and setup are not recorded in this dossier.</p>}
    <details><summary>Dossier and sources</summary><DossierView dossier={dossier} level={4} /></details>
  </div>;
}

function ClaimText({ claim }: { claim: DossierClaim }) {
  const labels: Record<string, string> = { youth: 'young people', adult: 'adults', mixed: 'young people and adults', app: 'app guidance' };
  return <>{claim.text}{claim.detail ? ` ${claim.detail}` : ''}{claim.evidence && labels[claim.evidence] ? ` Evidence: ${labels[claim.evidence]}.` : ''}</>;
}

function CardSummary({ card }: { card: CardEvidence }) {
  return <section aria-label={`Evidence for ${card.name}`}>
    <h4>{card.name}</h4>
    <p>{card.why || 'The reason for this exercise is not recorded.'}</p>
    <p>{card.cautions.length ? `Cautions: ${card.cautions.join(' ')}` : 'Cautions are not recorded for this version.'}</p>
    <p>{card.setup.length ? `Setup: ${card.setup.join(' ')}` : 'Setup is not recorded for this version.'}</p>
    {card.needs && <p>{`Prerequisites: ${[...card.needs.all, ...card.needs.any.map((options) => options.join(' or '))].join(', ') || 'none recorded'}.`}</p>}
    {!card.needs && <p>Prerequisites are not recorded for this version.</p>}
    {card.dossier ? <DossierSummary dossier={card.dossier} /> : <p>Version-matched dossier evidence is unavailable. Expected gains could not be verified.</p>}
  </section>;
}
