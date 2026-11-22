// Parent-controlled equipment. An absent or malformed value is never treated as available.
import type { FastifyInstance } from 'fastify';
import type { FsDb } from './firestoreDb.js';
import type { RoleStore } from './roles.js';
import type { TrainingService } from './training.js';
import { asDate } from './firestoreDb.js';

export type GloveAvailability = 'unknown' | 'available' | 'unavailable';
export interface EquipmentStore {
  read(): Promise<GloveAvailability>;
  readDetails(): Promise<{ gloves: GloveAvailability; acquiredAt: string | null }>;
  write(value: GloveAvailability): Promise<void>;
  deleteAll(): Promise<void>;
  /** Serialize starts with changes to the equipment setting. */
  guard<T>(operation: () => Promise<T>): Promise<T>;
}

abstract class SerializedEquipmentStore {
  private queue: Promise<unknown> = Promise.resolve();
  guard<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.catch(() => undefined);
    return result;
  }
}

export class MemoryEquipmentStore extends SerializedEquipmentStore implements EquipmentStore {
  private value: GloveAvailability = 'unknown';
  private acquiredAt: string | null = null;
  async read() { return this.value; }
  async readDetails() { return { gloves: this.value, acquiredAt: this.acquiredAt }; }
  async write(value: GloveAvailability) { await this.guard(async () => { this.acquiredAt = value === 'available' ? (this.value === 'available' ? this.acquiredAt : new Date().toISOString()) : null; this.value = value; }); }
  async deleteAll() { await this.write('unknown'); }
}

export class FirestoreEquipmentStore extends SerializedEquipmentStore implements EquipmentStore {
  constructor(private readonly db: FsDb) { super(); }
  private ref() { return this.db.collection('equipment').doc('household'); }
  async read(): Promise<GloveAvailability> {
    return (await this.readDetails()).gloves;
  }
  async readDetails() {
    const snap = await this.ref().get();
    const value = snap.get('gloves');
    const gloves: GloveAvailability = value === 'available' || value === 'unavailable' ? value : 'unknown';
    return { gloves, acquiredAt: gloves === 'available' ? asDate(snap.get('acquiredAt'))?.toISOString() ?? null : null };
  }
  async write(value: GloveAvailability) {
    const ref = this.ref();
    await this.guard(() => this.db.runTransaction(async (tx) => {
      const old = await tx.get(ref);
      const acquiredAt = value === 'available' ? (old.get('gloves') === 'available' ? asDate(old.get('acquiredAt'))?.toISOString() ?? null : new Date().toISOString()) : null;
      tx.set(ref, { gloves: value, acquiredAt });
    }));
  }
  async deleteAll() { await this.guard(async () => { await this.ref().delete(); }); }
}

export function registerEquipmentRoutes(app: FastifyInstance, store: EquipmentStore, roles: RoleStore, training: TrainingService) {
  app.get('/api/equipment/exercises', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return { exercises: await training.equipmentExercises() };
  });
  app.get('/api/equipment', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    return store.readDetails();
  });
  app.put<{ Body: { gloves?: unknown } }>('/api/equipment', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (await roles.roleFor(req.identity!.account) !== 'parent') return reply.code(403).send({ error: 'forbidden' });
    const gloves = req.body?.gloves;
    if (gloves !== 'available' && gloves !== 'unavailable' && gloves !== 'unknown') {
      return reply.code(400).send({ error: 'invalid' });
    }
    await store.write(gloves);
    return store.readDetails();
  });
}
