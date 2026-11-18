// The slice of the Firestore client the household's stores use (story 118): approvals, the
// audit log, progress, pain pauses and the started-session marker. The real `Firestore` class
// from `@google-cloud/firestore` satisfies it; tests pass a fake in memory. The project and the
// database come from the client's own configuration (src/config.ts), never from the repo.
//
// Only the server reaches these documents, with the runtime's own service account; the web app
// never talks to Firestore.

export interface FsDb {
  collection(path: string): FsCollection;
  runTransaction<T>(update: (tx: FsTx) => Promise<T>): Promise<T>;
}

export interface FsQuery {
  where(field: string, op: '==', value: unknown): FsQuery;
  get(): Promise<{ docs: FsDocSnap[] }>;
}

export interface FsCollection extends FsQuery {
  doc(id: string): FsDocRef;
}

export interface FsDocRef {
  get(): Promise<FsSnap>;
  /** Fails with code 6 (ALREADY_EXISTS) when the document is there. */
  create(data: Record<string, unknown>): Promise<unknown>;
  delete(): Promise<unknown>;
}

export interface FsSnap {
  exists: boolean;
  /** The document's fields; undefined when it does not exist. */
  data(): unknown;
  /** One field, or undefined. */
  get(field: string): unknown;
}

export interface FsDocSnap {
  id: string;
  ref: FsDocRef;
  data(): unknown;
}

/** Reads come before writes in a transaction, as Firestore requires. */
export interface FsTx {
  get(ref: FsDocRef): Promise<FsSnap>;
  create(ref: FsDocRef, data: Record<string, unknown>): unknown;
  set(ref: FsDocRef, data: Record<string, unknown>): unknown;
}

/** A stored time back to a Date: a Firestore Timestamp, a Date or an ISO string. */
export function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const t = value as { toDate?: () => Date } | null;
  if (t && typeof t.toDate === 'function') {
    const d = t.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  return null;
}

export const asObject = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/**
 * The household's counters, one document per ordered collection: `householdCounters/{name}`
 * holds the next sequence number, so a collection lists in the order it was written, across
 * restarts, even when two writes share a millisecond.
 */
export const COUNTERS_COLLECTION = 'householdCounters';

/**
 * Create `collection/{id}` with the next sequence number of that collection, once: in one
 * transaction, false (and nothing written) when the id is already there.
 */
export async function createOrdered(
  db: FsDb,
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const ref = db.collection(collection).doc(id);
  const counter = db.collection(COUNTERS_COLLECTION).doc(collection);
  return db.runTransaction(async (tx) => {
    const [doc, count] = [await tx.get(ref), await tx.get(counter)];
    if (doc.exists) return false;
    const last = asObject(count.data())?.next;
    const seq = typeof last === 'number' && Number.isInteger(last) ? last : 0;
    tx.create(ref, { ...data, seq });
    tx.set(counter, { next: seq + 1 });
    return true;
  });
}

/** The sequence number `createOrdered` gave a document; documents without one sort first. */
export function seqOf(data: unknown): number {
  const s = asObject(data)?.seq;
  return typeof s === 'number' && Number.isFinite(s) ? s : -1;
}

/** Delete every document of a collection and its counter: the household goes with its data. */
export async function deleteCollection(db: FsDb, collection: string): Promise<void> {
  const snap = await db.collection(collection).get();
  for (const d of snap.docs) await d.ref.delete();
  await db.collection(COUNTERS_COLLECTION).doc(collection).delete();
}
