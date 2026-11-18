// "Something hurts": the pain report, the training pause and its offline copy.
//
// The pause takes effect on the device first, so it holds without the network: it is written to
// the device's storage before anything is sent, and an unsent report waits there (the outbox)
// until the app is back online. Report content goes only to the app's own API: never to the
// console, an error report or analytics.

import { localDate } from './training';

export const BODY_AREAS = [
  ['head', 'Head'],
  ['neck', 'Neck'],
  ['chest', 'Chest'],
  ['back', 'Back'],
  ['shoulder_arm', 'Shoulder or arm'],
  ['wrist_hand', 'Wrist or hand'],
  ['hip', 'Hip or groin'],
  ['knee', 'Knee'],
  ['lower_leg', 'Shin or calf'],
  ['ankle_foot', 'Ankle or foot'],
  ['other', 'Somewhere else'],
] as const;

export type BodyArea = (typeof BODY_AREAS)[number][0] | 'unsure';

/** The pause as the device keeps it. `report` is the unsent outbox entry, dropped once sent. */
export interface LocalPause {
  /** The keeper's local date the pause began. */
  since: string;
  reportId: string;
  sent: boolean;
  report: { bodyArea: BodyArea; note: string } | null;
}

export interface PauseStore {
  read(): LocalPause | null;
  write(pause: LocalPause): void;
  clear(): void;
}

export const PAUSE_KEY = 'goalie-goals.pause';

function isLocalPause(value: unknown): value is LocalPause {
  const p = value as LocalPause | null;
  return !!p && typeof p.since === 'string' && typeof p.reportId === 'string' && typeof p.sent === 'boolean';
}

/**
 * The installed app's copy of the pause, in localStorage. A storage error leaves the in-memory
 * copy in place, so a pause set in this session still holds.
 */
export class LocalPauseStore implements PauseStore {
  private memory: LocalPause | null = null;

  constructor(private readonly storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {}

  read(): LocalPause | null {
    try {
      const raw = this.storage?.getItem(PAUSE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isLocalPause(parsed)) return parsed;
      }
    } catch {
      // Fall back to the copy held in memory.
    }
    return this.memory;
  }

  write(pause: LocalPause): void {
    this.memory = { ...pause };
    try {
      this.storage?.setItem(PAUSE_KEY, JSON.stringify(pause));
    } catch {
      // Storage full or blocked: the in-memory copy still holds the pause for this session.
    }
  }

  clear(): void {
    this.memory = null;
    try {
      this.storage?.removeItem(PAUSE_KEY);
    } catch {
      // Nothing more to do.
    }
  }
}

export class MemoryPauseStore implements PauseStore {
  constructor(public value: LocalPause | null = null) {}
  read() {
    return this.value && { ...this.value };
  }
  write(pause: LocalPause) {
    this.value = { ...pause };
  }
  clear() {
    this.value = null;
  }
}

export function newReportId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Pause at once, on the device, before anything is sent. */
export function startPause(store: PauseStore, now: Date = new Date()): LocalPause {
  const existing = store.read();
  if (existing && !existing.sent) return existing;
  const pause: LocalPause = { since: localDate(now), reportId: newReportId(), sent: false, report: null };
  store.write(pause);
  return pause;
}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };

/**
 * Send the outbox entry, if any. A report with no body area chosen goes as "not said" so the
 * parent still hears at once. Returns true when nothing is left to send.
 */
export async function flushPause(store: PauseStore, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const pause = store.read();
  if (!pause || pause.sent) return true;
  try {
    const res = await fetchImpl('/api/pain', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: pause.reportId,
        bodyArea: pause.report?.bodyArea ?? 'unsure',
        note: pause.report?.note || null,
        date: pause.since,
      }),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  // Sent: keep the pause, drop the report content from the device.
  const latest = store.read();
  if (latest && latest.reportId === pause.reportId) store.write({ ...latest, sent: true, report: null });
  return true;
}

export interface PauseStatus {
  paused: boolean;
  since: string | null;
  reports: { id: string; date: string; bodyArea?: BodyArea; note?: string | null; at?: string }[];
}

export async function fetchPauseStatus(fetchImpl: typeof fetch = fetch): Promise<PauseStatus> {
  const res = await fetchImpl('/api/pain/status', { credentials: 'same-origin', cache: 'no-store', headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as Partial<PauseStatus>;
  if (typeof body.paused !== 'boolean') throw new Error('Unexpected response');
  return { paused: body.paused, since: body.since ?? null, reports: Array.isArray(body.reports) ? body.reports : [] };
}

/**
 * Bring the device's copy in line with the server: send the outbox first; then a pause the
 * server knows (reported elsewhere) is kept here too, and a sent pause the server no longer has
 * was cleared by the parent. Offline, the device's copy stands.
 */
export async function syncPause(store: PauseStore, fetchImpl: typeof fetch = fetch): Promise<LocalPause | null> {
  if (!(await flushPause(store, fetchImpl))) return store.read();
  let status: PauseStatus;
  try {
    status = await fetchPauseStatus(fetchImpl);
  } catch {
    return store.read();
  }
  const local = store.read();
  if (status.paused && !local) {
    store.write({ since: status.since ?? localDate(), reportId: status.reports[0]?.id ?? newReportId(), sent: true, report: null });
  } else if (!status.paused && local?.sent) {
    store.clear();
  }
  return store.read();
}

/** The parent clears the pause. The server refuses anyone else. */
export async function clearPause(fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<void> {
  const res = await fetchImpl('/api/pain/clear', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: localDate(now) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export function bodyAreaLabel(area: string | undefined): string {
  if (area === 'unsure') return 'Not said';
  return BODY_AREAS.find(([id]) => id === area)?.[1] ?? 'Not said';
}
