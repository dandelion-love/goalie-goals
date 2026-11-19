import { useEffect, useState } from 'react';

type Availability = 'unknown' | 'available' | 'unavailable';

export function Equipment({ fetchImpl = fetch, onChange }: { fetchImpl?: typeof fetch; onChange?: () => void }) {
  const [value, setValue] = useState<Availability | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetchImpl('/api/equipment', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: { gloves?: unknown }) => {
        if (active) setValue(data.gloves === 'available' || data.gloves === 'unavailable' ? data.gloves : 'unknown');
      })
      .catch(() => { if (active) setMessage('Could not load equipment. Try again later.'); });
    return () => { active = false; };
  }, [fetchImpl]);

  async function save(next: Availability) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetchImpl('/api/equipment', {
        method: 'PUT', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ gloves: next }),
      });
      if (!response.ok) throw new Error();
      setValue(next);
      setMessage('Equipment saved.');
      onChange?.();
    } catch { setMessage('Could not save equipment. Try again.'); }
    finally { setBusy(false); }
  }

  return <article className="card" aria-labelledby="equipment-title">
    <h2 id="equipment-title">Goalkeeper gloves</h2>
    <p>Exercises that need gloves are available only when you confirm you have them.</p>
    <label htmlFor="glove-availability">Are goalkeeper gloves available?</label>{' '}
    <select id="glove-availability" value={value ?? 'unknown'} disabled={busy || value === null}
      onChange={(e) => void save(e.target.value as Availability)}>
      <option value="unknown">Not set</option>
      <option value="available">Yes</option>
      <option value="unavailable">No</option>
    </select>
    {value !== 'available' && <p>Glove exercises need goalkeeper gloves before they can be used.</p>}
    {message && <p role="status">{message}</p>}
  </article>;
}
