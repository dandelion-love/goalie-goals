// Client for exercise dossiers (story 115). The server sends approved versions to the keeper,
// and the version a request asks about to the parent; this module only reads them.

/** A claim as shown: a short label, the text, and the numbers of the sources it cites. */
export interface DossierClaim {
  label: string;
  text: string;
  evidence?: string;
  detail?: string;
  groupId?: string;
  sources: number[];
}

export interface DossierSource {
  n: number;
  title: string;
  /** A public https link, or null for a source with no public page. */
  url: string | null;
}

/** "Why it matters for a goalkeeper" and "What to expect", with their sources. */
export interface Dossier {
  cardId: string;
  itemVersion: string;
  name: string;
  headline: string;
  why: DossierClaim[];
  expect: DossierClaim[];
  limits?: DossierClaim[];
  sources: DossierSource[];
}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };

async function getJson(fetchImpl: typeof fetch, url: string): Promise<unknown> {
  const res = await fetchImpl(url, { credentials: 'same-origin', cache: 'no-store', headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function isDossier(value: unknown): value is Dossier {
  const d = value as Dossier | null;
  return (
    !!d &&
    typeof d.cardId === 'string' &&
    typeof d.headline === 'string' &&
    Array.isArray(d.why) &&
    Array.isArray(d.expect) &&
    Array.isArray(d.sources)
  );
}

/** The approved dossiers, by card id: "Your training" opens them from each exercise. */
export async function fetchDossiers(fetchImpl: typeof fetch = fetch): Promise<Map<string, Dossier>> {
  const body = (await getJson(fetchImpl, '/api/training/dossiers')) as { dossiers?: unknown };
  const list = Array.isArray(body?.dossiers) ? body.dossiers.filter(isDossier) : [];
  return new Map(list.map((d) => [d.cardId, d]));
}

/** The dossier a request asks the parent to approve. */
export async function fetchRequestDossier(id: string, fetchImpl: typeof fetch = fetch): Promise<Dossier> {
  const body = (await getJson(fetchImpl, `/api/approvals/${encodeURIComponent(id)}/dossier`)) as { dossier?: unknown };
  if (!isDossier(body?.dossier)) throw new Error('Unexpected response');
  return body.dossier;
}
