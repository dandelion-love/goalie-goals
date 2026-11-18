export type Role = 'keeper' | 'parent';

export type MeResult =
  | { kind: 'signed-in'; role: Role | null }
  | { kind: 'expired' }
  | { kind: 'error' };

/**
 * Ask the server who is signed in. Same-origin credentials plus `X-Requested-With` make the
 * sign-in proxy answer an expired session with a 401 instead of a redirect.
 */
export async function fetchMe(fetchImpl: typeof fetch = fetch): Promise<MeResult> {
  let res: Response;
  try {
    res = await fetchImpl('/api/me', {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    return { kind: 'error' };
  }
  if (res.status === 401) return { kind: 'expired' };
  if (!res.ok) return { kind: 'error' };
  try {
    const body = (await res.json()) as { role?: unknown };
    const role = body.role === 'keeper' || body.role === 'parent' ? body.role : null;
    return { kind: 'signed-in', role };
  } catch {
    return { kind: 'error' };
  }
}

/** The installed app's start URL; loading it runs the proxy's sign-in in the app window. */
export const START_URL = import.meta.env.BASE_URL || '/';

export function reconnect(location: Pick<Location, 'assign'> = window.location): void {
  location.assign(START_URL);
}
