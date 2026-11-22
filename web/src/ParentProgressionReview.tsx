import { useState } from 'react';
import { DossierView } from './DossierScreens';
import { isDossier, type Dossier } from './dossier';

type Offer = { id: string; title: string; dose: string; cues: string[]; card: { steps: string[]; stop_if: string[] }; dossier?: Dossier };
const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };

/** Parent-only review; the server validates every decision and the evidence again. */
export function ParentProgressionReview({ fetchImpl = fetch, onChanged }: { fetchImpl?: typeof fetch; onChanged: () => void }) {
  const [sessions, setSessions] = useState<{ id: string; date: string; title: string }[] | null>(null);
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function request(url: string, init?: RequestInit) {
    const response = await fetchImpl(url, { credentials: 'same-origin', cache: 'no-store', ...init, headers });
    if (!response.ok) throw new Error('unavailable');
    return response.json();
  }
  async function checkSessions() {
    setBusy(true); setMessage(''); setOffer(null);
    try {
      const value = await request('/api/history/squat-review-window') as { sessions?: unknown };
      if (!Array.isArray(value.sessions) || !value.sessions.every((s) => s && typeof s.id === 'string' && typeof s.date === 'string' && typeof s.title === 'string')) throw new Error();
      setSessions(value.sessions);
    } catch { setSessions(null); setMessage('The recorded session order is not available yet.'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!sessions || answers.some((answer) => !answer)) return;
    setBusy(true); setMessage('');
    try {
      const payload = { orderedRecordIds: sessions.map((s) => s.id), allDevicesSynced: answers[0] === 'yes', growthClear: answers[1] === 'yes', breakRestartClear: answers[2] === 'yes', stepDownClear: answers[3] === 'yes' };
      const result = await request('/api/history/squat-attestation', { method: 'POST', body: JSON.stringify(payload) }) as { status?: string };
      setMessage(result.status === 'held' ? 'Progress is on hold.' : result.status === 'ready-for-parent' ? 'Ready to review the next card.' : 'The evidence is not complete yet.');
      onChanged();
    } catch { setMessage('The evidence is incomplete or on hold. Check the sessions and try again.'); onChanged(); }
    finally { setBusy(false); }
  }
  async function showOffer() {
    setBusy(true); setMessage('');
    try {
      const value = await request('/api/progression/review-offer', { method: 'POST', body: '{}' }) as Offer;
      if (!value || typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.dose !== 'string' || !Array.isArray(value.cues) || !Array.isArray(value.card?.steps) || !Array.isArray(value.card?.stop_if) || (value.dossier && !isDossier(value.dossier))) throw new Error();
      setOffer(value);
    } catch { setOffer(null); setMessage('The next card is not ready for review.'); }
    finally { setBusy(false); }
  }
  async function approve() {
    if (!offer) return;
    setBusy(true); setMessage('');
    try {
      await request(`/api/progression/review-offer/${encodeURIComponent(offer.id)}/approve`, { method: 'POST', body: '{}' });
      setOffer(null); setSessions(null); setAnswers(['', '', '', '']); setMessage('Card approved. The dossier needs its own approval.'); onChanged();
    } catch { setOffer(null); setMessage('The evidence changed or this review expired. Check it again.'); onChanged(); }
    finally { setBusy(false); }
  }
  const questions = ['All devices are synced and these sessions are in the right order.', 'There is no current growth-related hold.', 'Any break has been handled under the restart rule.', 'No step-down or safety hold is outstanding.'];
  return <section className="card" aria-labelledby="squat-review-title">
    <h2 id="squat-review-title">Review squat progress</h2>
    <p>Confirm each set in Recent sessions first. The next card is considered only after two qualifying sessions.</p>
    <button type="button" onClick={checkSessions} disabled={busy}>Check recorded sessions</button>
    {sessions && <><ol>{sessions.map((s) => <li key={s.id}>{s.date}: {s.title}</li>)}</ol>{questions.map((question, index) => <label key={question}>{question}{' '}<select value={answers[index]} onChange={(event) => setAnswers((old) => old.map((answer, i) => i === index ? event.target.value : answer))}><option value="">Choose</option><option value="yes">Yes</option><option value="no">No</option></select></label>)}<button type="button" onClick={confirm} disabled={busy || answers.some((answer) => !answer)}>Confirm evidence</button></>}
    <button type="button" onClick={showOffer} disabled={busy}>Review next card</button>
    {offer && <article><h3>{offer.title}</h3><p>{offer.dose}</p><h4>Steps</h4><ol>{offer.card.steps.map((step) => <li key={step}>{step}</li>)}</ol><h4>Cues</h4><ul>{offer.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul><h4>Stop if</h4><ul>{offer.card.stop_if.map((stop) => <li key={stop}>{stop}</li>)}</ul>{offer.dossier && <details><summary>Read the dossier</summary><DossierView dossier={offer.dossier} level={4} /></details>}<p>The card and dossier need separate approvals. This decision approves the card only.</p><button type="button" onClick={approve} disabled={busy}>Approve this card</button><button type="button" onClick={() => setOffer(null)} disabled={busy}>Cancel</button></article>}
    <p role="status">{message}</p>
  </section>;
}
