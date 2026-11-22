// The household's reset generation (story 121). A number that starts at 0 and goes up by one each
// time the parent starts fresh. Every API response carries it (`GENERATION_HEADER`), each device
// keeps the last one it saw and sends it with every request, and the server refuses a write from
// another generation: an event queued on a device before a reset never lands in the new history.
// A device drops what it keeps (its cached session, its local pause, its outbox) only once it
// sees a new generation from the server, never on its own.
//
// The number is durable, like the household's other stores: in memory for tests and the demo, in
// Firestore in production. It is not household data: deleting the household keeps it, so a
// device that held data from before can still tell.

import { asObject, type FsDb } from './firestoreDb.js';
import { bumpEvidenceRevision, evidenceRevisionRef, readEvidenceRevision } from './evidenceRevision.js';

/** The response and request header that carries the generation. */
export const GENERATION_HEADER = 'x-household-generation';

export interface GenerationStore {
  /** The current generation; 0 before the first reset. */
  read(): Promise<number>;
  /** Go up by one and return the new generation. */
  bump(): Promise<number>;
}

export class MemoryGenerationStore implements GenerationStore {
  #value = 0;

  async read(): Promise<number> {
    return this.#value;
  }

  async bump(): Promise<number> {
    this.#value += 1;
    return this.#value;
  }
}

export const GENERATION_COLLECTION = 'householdMeta';
export const GENERATION_DOC = 'generation';

const valueOf = (data: unknown): number => {
  const v = asObject(data)?.value;
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;
};

/** `householdMeta/generation`, `{ value }`; a bump is a transaction, so no bump is lost. */
export class FirestoreGenerationStore implements GenerationStore {
  constructor(
    private readonly db: FsDb,
    private readonly collection = GENERATION_COLLECTION,
  ) {}

  private ref() {
    return this.db.collection(this.collection).doc(GENERATION_DOC);
  }

  async read(): Promise<number> {
    const snap = await this.ref().get();
    return snap.exists ? valueOf(snap.data()) : 0;
  }

  async bump(): Promise<number> {
    const ref = this.ref();
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const next = (snap.exists ? valueOf(snap.data()) : 0) + 1;
      const revision = evidenceRevisionRef(this.db);
      await readEvidenceRevision(tx, revision);
      tx.set(ref, { value: next });
      bumpEvidenceRevision(tx, revision);
      return next;
    });
  }
}

/**
 * The generation a request names: its header, or 0 when it sends none (a device from before
 * story 121 has never seen a reset). Null when the header is there but not a whole number.
 */
export function requestGeneration(header: string | string[] | undefined): number | null {
  if (header === undefined) return 0;
  const raw = Array.isArray(header) ? header[0] : header;
  return /^\d{1,9}$/.test(raw.trim()) ? Number(raw.trim()) : null;
}
