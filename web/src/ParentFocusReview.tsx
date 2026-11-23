import { useState } from 'react';
import { FocusReview, type FocusReviewData, isFocusReviewData } from './FocusReview';

export function ParentFocusReview({ fetchImpl, onChanged }: { fetchImpl: typeof fetch; onChanged: () => void }) {
  const [offer, setOffer] = useState<{ itemVersion: string; focus: FocusReviewData } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function review() {
    setBusy(true); setMessage('');
    try {
      const response = await fetchImpl('/api/focus/squat-to-box/review', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!response.ok) throw new Error();
      const value = await response.json();
      if (typeof value.itemVersion !== 'string' || !isFocusReviewData(value.focus)) throw new Error();
      setOffer(value);
    } catch { setOffer(null); setMessage('Training focus is not available to review.'); }
    finally { setBusy(false); }
  }
  async function approve() {
    if (!offer) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetchImpl('/api/focus/squat-to-box/approve', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ itemVersion: offer.itemVersion }) });
      if (!response.ok) throw new Error();
      setOffer(null); setMessage('Training focus approved.'); onChanged();
    } catch { setOffer(null); setMessage('The review could not be saved. Please review it again.'); }
    finally { setBusy(false); }
  }
  return <section className="card"><h2>Review training focus</h2><button type="button" disabled={busy} onClick={review}>Review squat focus</button>{offer && <><FocusReview name="Squat to box" focus={offer.focus} /><button type="button" disabled={busy} onClick={approve}>Approve training focus</button><button type="button" disabled={busy} onClick={() => setOffer(null)}>Cancel</button></>}<p role="status">{message}</p></section>;
}
