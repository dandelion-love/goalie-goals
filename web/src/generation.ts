// The household's reset generation on this device (story 121). The server names it on every
// answer; the device keeps the last one it saw and names it on every request, so the server
// refuses a write the device queued before a reset. When an answer names another generation,
// the parent started fresh: the device drops the training data it kept from before (today's
// cached session, its outbox of session starts, finishes and their history records) and keeps
// the new number. It never drops anything on its own: only an answer from the server does that.
//
// Safety first: a pain report made on this device and not yet sent is never dropped. It is new
// information, not old data, so it stays with its pause and goes to the server under the new
// generation; the pause holds until the server has the report and says training is paused. A
// pause the server already had (its report sent) belonged to the old household and is dropped.

import type { OfflineStore } from './offline';
import type { OutboxStore } from './outbox';
import type { PauseStore } from './pain';

export const GENERATION_HEADER = 'X-Household-Generation';
export const GENERATION_KEY = 'goalie-goals.generation';

export interface GenerationStore {
  /** The last generation this device saw; null before the first answer. */
  read(): number | null;
  write(generation: number): void;
}

const parse = (raw: string | null | undefined): number | null =>
  raw != null && /^\d{1,9}$/.test(raw.trim()) ? Number(raw.trim()) : null;

/** localStorage, with an in-memory copy when storage is blocked. */
export class LocalGenerationStore implements GenerationStore {
  private memory: number | null = null;

  constructor(private readonly storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {}

  read(): number | null {
    try {
      const stored = parse(this.storage?.getItem(GENERATION_KEY));
      if (stored !== null) return stored;
    } catch {
      // Fall back to the in-memory copy.
    }
    return this.memory;
  }

  write(generation: number): void {
    this.memory = generation;
    try {
      this.storage?.setItem(GENERATION_KEY, String(generation));
    } catch {
      // The in-memory copy holds for this session.
    }
  }
}

export class MemoryGenerationStore implements GenerationStore {
  constructor(public value: number | null = null) {}
  read() {
    return this.value;
  }
  write(generation: number) {
    this.value = generation;
  }
}

/** What the device keeps from before a reset. */
export interface DeviceCopies {
  outbox: OutboxStore;
  pause: PauseStore;
  cache: OfflineStore;
}

/** Drop the device's copies from before a reset, keeping an unsent pain report and its pause. */
export function dropStale({ outbox, pause, cache }: DeviceCopies): void {
  outbox.write([]);
  cache.clearToday();
  const local = pause.read();
  // An unsent report stays, with its own mistake note if it has one, and is sent again under
  // the new generation. A sent one (and any note on it) went with the old household.
  if (local && !local.sent) return;
  pause.clear();
}

function withHeader(init: RequestInit | undefined, generation: number): RequestInit {
  const headers = init?.headers;
  const value = String(generation);
  if (headers instanceof Headers) {
    const copy = new Headers(headers);
    copy.set(GENERATION_HEADER, value);
    return { ...init, headers: copy };
  }
  if (Array.isArray(headers)) return { ...init, headers: [...headers, [GENERATION_HEADER, value]] };
  return { ...init, headers: { ...(headers ?? {}), [GENERATION_HEADER]: value } };
}

/**
 * The app's fetch: names this device's generation on every API request, and reads the server's
 * on every answer. An answer that names another generation drops the device's copies (before
 * the caller sees the answer, so nothing from before is sent again) and then calls `onReset`.
 * A device that has never seen one counts as generation 0, as the server does.
 */
export function withGeneration(
  fetchImpl: typeof fetch,
  store: GenerationStore,
  copies: DeviceCopies,
  onReset: (generation: number) => void,
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const api = url.startsWith('/api/') || url.includes('/api/');
    const res = await fetchImpl(input, api ? withHeader(init, store.read() ?? 0) : init);
    const seen = api ? parse(res.headers?.get?.(GENERATION_HEADER)) : null;
    if (seen !== null && seen !== (store.read() ?? 0)) {
      dropStale(copies);
      store.write(seen);
      onReset(seen);
    } else if (seen !== null && store.read() === null) {
      store.write(seen);
    }
    return res;
  }) as typeof fetch;
}
