import { useEffect, useRef, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';

type Availability = 'unknown' | 'available' | 'unavailable';

/** Parent-only ownership control; the timestamp is when ownership was recorded here. */
export function Equipment({ fetchImpl = fetch, onChange }: { fetchImpl?: typeof fetch; onChange?: () => void }) {
  const [value, setValue] = useState<Availability | null>(null);
  const [acquiredAt, setAcquiredAt] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const yes = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    fetchImpl('/api/equipment', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: { gloves?: unknown; acquiredAt?: unknown }) => { if (active) { setValue(data.gloves === 'available' || data.gloves === 'unavailable' ? data.gloves : 'unknown'); setAcquiredAt(typeof data.acquiredAt === 'string' && !Number.isNaN(Date.parse(data.acquiredAt)) ? data.acquiredAt : null); } })
      .catch(() => { if (active) setMessage('Could not load ownership.'); });
    return () => { active = false; };
  }, [fetchImpl, attempt]);
  useEffect(() => { if (confirm) yes.current?.focus(); }, [confirm]);
  function close() { setConfirm(false); requestAnimationFrame(() => trigger.current?.focus()); }
  async function save(next: Availability) {
    setBusy(true); setMessage('');
    try {
      const response = await fetchImpl('/api/equipment', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ gloves: next }) });
      if (!response.ok) throw new Error();
      const data = await response.json() as { gloves: Availability; acquiredAt?: string | null };
      setValue(data.gloves); setAcquiredAt(data.acquiredAt ?? null); close(); onChange?.();
    } catch { setMessage('Could not save ownership. Try again.'); }
    finally { setBusy(false); }
  }
  return <span className="equipment-ownership">
    <IconButton ref={trigger} aria-label="Change glove ownership" title="Change glove ownership" disabled={busy || value === null} onClick={() => setConfirm(true)}>{value === 'available' ? <CheckCircleOutlineIcon /> : <HelpOutlineIcon />}</IconButton>
    <span>{value === 'available' ? 'Owned' : value === 'unavailable' ? 'Not owned' : 'Ownership unknown'}</span>
    {value === 'available' && <small>{acquiredAt ? `Ownership recorded ${new Date(acquiredAt).toLocaleString()}` : 'Ownership date unavailable'}</small>}
    {confirm && <span role="dialog" aria-label="Confirm glove ownership" className="equipment-confirm"><strong>Do you have goalkeeper gloves?</strong><span><Button ref={yes} disabled={busy} onClick={() => void save('available')}>Yes</Button><Button disabled={busy} onClick={() => void save('unavailable')}>No</Button><Button disabled={busy} onClick={() => void save('unknown')}>Not sure</Button><Button disabled={busy} onClick={close}>Cancel</Button></span></span>}
    {message && <span role="status">{message}</span>}
    {message && value === null && <Button onClick={() => { setMessage(''); setAttempt((n) => n + 1); }}>Retry ownership</Button>}
  </span>;
}
