// A fake of the Firestore client slice the household's stores use (src/firestoreDb.ts), in
// memory: documents by path, equality queries, transactions run one at a time and applied at
// the end, times stored as Timestamp-like values, and `undefined` refused as Firestore refuses
// it. No real Firestore is touched. Story 118.

import type { FsCollection, FsDb, FsDocRef, FsDocSnap, FsQuery, FsSnap, FsTx } from '../src/firestoreDb.js';

type Stored = Record<string, unknown>;

/** A time as Firestore gives it back: an object with `toDate()`. */
class FakeTimestamp {
  constructor(readonly ms: number) {}
  toDate(): Date {
    return new Date(this.ms);
  }
}

function encode(value: unknown, path: string): unknown {
  if (value === undefined) throw new Error(`Cannot use "undefined" as a Firestore value (found in field "${path}").`);
  if (value instanceof Date) return new FakeTimestamp(value.getTime());
  if (value instanceof FakeTimestamp) return value;
  if (Array.isArray(value)) return value.map((v, i) => encode(v, `${path}.${i}`));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v, path ? `${path}.${k}` : k)]));
  }
  return value;
}

/** A copy, as a real snapshot is: changing it never changes the stored document. */
function decode(value: unknown): unknown {
  if (value instanceof FakeTimestamp) return new FakeTimestamp(value.ms);
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]));
  return value;
}

const alreadyExists = (key: string) => Object.assign(new Error(`Document already exists: ${key}`), { code: 6 });

export class FakeFirestore implements FsDb {
  readonly docs = new Map<string, Stored>();
  /** Every read fails, as an unreachable database would. */
  failReads = false;
  /** Every write fails. */
  failWrites = false;
  #queue: Promise<unknown> = Promise.resolve();

  /** The paths of every stored document, sorted. */
  paths(): string[] {
    return [...this.docs.keys()].sort();
  }

  checkRead(key: string): void {
    if (this.failReads) throw new Error(`14 UNAVAILABLE: read failed for ${key}`);
  }

  checkWrite(key: string): void {
    if (this.failWrites) throw new Error(`14 UNAVAILABLE: write failed for ${key}`);
  }

  snap(key: string): FsSnap {
    this.checkRead(key);
    const data = this.docs.get(key);
    const copy = data === undefined ? undefined : (decode(data) as Stored);
    return { exists: copy !== undefined, data: () => copy, get: (f: string) => copy?.[f] };
  }

  collection(path: string): FsCollection {
    return new FakeCollection(this, path, []);
  }

  /** One transaction at a time, its writes applied at the end, as a commit would. */
  runTransaction<T>(update: (tx: FsTx) => Promise<T>): Promise<T> {
    const run = async () => {
      const writes: (() => void)[] = [];
      const tx: FsTx = {
        get: async (ref) => (ref as FakeDocRef).get(),
        create: (ref, data) => {
          const key = (ref as FakeDocRef).key;
          const value = encode(data, '') as Stored;
          writes.push(() => {
            if (this.docs.has(key)) throw alreadyExists(key);
            this.docs.set(key, value);
          });
        },
        set: (ref, data) => {
          const key = (ref as FakeDocRef).key;
          const value = encode(data, '') as Stored;
          writes.push(() => this.docs.set(key, value));
        },
      };
      const result = await update(tx);
      if (writes.length) this.checkWrite('a transaction');
      for (const w of writes) w();
      return result;
    };
    const next = this.#queue.then(run, run);
    this.#queue = next.catch(() => undefined);
    return next;
  }
}

class FakeDocRef implements FsDocRef {
  constructor(
    private readonly db: FakeFirestore,
    readonly key: string,
  ) {}

  async get(): Promise<FsSnap> {
    return this.db.snap(this.key);
  }

  async create(data: Record<string, unknown>): Promise<unknown> {
    this.db.checkWrite(this.key);
    if (this.db.docs.has(this.key)) throw alreadyExists(this.key);
    this.db.docs.set(this.key, encode(data, '') as Stored);
    return {};
  }

  async delete(): Promise<unknown> {
    this.db.checkWrite(this.key);
    this.db.docs.delete(this.key);
    return {};
  }
}

class FakeCollection implements FsCollection {
  constructor(
    private readonly db: FakeFirestore,
    private readonly path: string,
    private readonly filters: [string, unknown][],
  ) {}

  doc(id: string): FsDocRef {
    if (!id || id.includes('/')) throw new Error('A document id must be a non-empty string without "/".');
    return new FakeDocRef(this.db, `${this.path}/${id}`);
  }

  where(field: string, _op: '==', value: unknown): FsQuery {
    return new FakeCollection(this.db, this.path, [...this.filters, [field, value]]);
  }

  async get(): Promise<{ docs: FsDocSnap[] }> {
    this.db.checkRead(this.path);
    const docs: FsDocSnap[] = [];
    for (const key of [...this.db.docs.keys()].sort()) {
      const id = key.slice(this.path.length + 1);
      if (!key.startsWith(`${this.path}/`) || id.includes('/')) continue;
      const data = this.db.docs.get(key)!;
      if (!this.filters.every(([f, v]) => data[f] === v)) continue;
      const copy = decode(data) as Stored;
      docs.push({ id, ref: new FakeDocRef(this.db, key), data: () => copy });
    }
    return { docs };
  }
}
