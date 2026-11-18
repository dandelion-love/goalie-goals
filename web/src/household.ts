// Start fresh (story 121): the parent resets the household's training data. The server checks
// the role and the typed word; the app only asks for them.

import { localDate } from './training';

/** The word the parent types to confirm, as the server checks it. */
export const RESET_WORD = 'RESET';

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json', 'Content-Type': 'application/json' };

export async function resetHousehold(confirm: string, fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<void> {
  const res = await fetchImpl('/api/household/reset', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: HEADERS,
    body: JSON.stringify({ confirm, date: localDate(now) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
