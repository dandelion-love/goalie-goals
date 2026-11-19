import { describe, expect, it } from 'vitest';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent } from '../src/content.js';
import { FirestoreEquipmentStore, MemoryEquipmentStore } from '../src/equipment.js';
import { FakeFirestore } from './fakeFirestore.js';
import { STARTER_SESSION, SingleSessionPlan, TrainingService } from '../src/training.js';
import { buildApp } from '../src/app.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { STARTER_PACK, checkPlanRules, layOut } from '../src/weeklyPlan.js';

const parent = { account: 'sam@example.com', role: 'parent' as const };
const date = '2026-01-05';

describe('goalkeeper gloves', () => {
  it('places the wall pass at its stated dose in a valid themed week', () => {
    const content = loadContent();
    const card = content.cards.get('wall-chest-pass')!.card;
    expect(card.dose).toMatchObject({ sets: 2, reps: 10, rest_s: 60 });
    expect(card.needs?.all).toContain('other:goalkeeper-gloves');
    expect(STARTER_PACK.find((s) => s.id === 'quick-feet-strong-arms')?.cardIds).toContain(card.id);
    expect(checkPlanRules(layOut(STARTER_PACK, [1, 3, 5]), content)).toEqual([]);
  });
  it('allows only the parent to read or change the setting', async () => {
    const signer = new TestSigner();
    const audience = '/test/audience';
    const app = await buildApp({
      config: { audience, devMockIdentity: false, devMockAccount: 'kai@example.com', roleSeed: 'kai@example.com=keeper;sam@example.com=parent', roleStore: 'memory', port: 0, webRoot: '', production: false },
      verifier: new ProxyJwtVerifier(audience, signer.keys),
    });
    const headers = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience }) });
    try {
      expect((await app.inject({ method: 'GET', url: '/api/equipment', headers: headers('sam@example.com') })).json()).toEqual({ gloves: 'unknown' });
      expect((await app.inject({ method: 'PUT', url: '/api/equipment', headers: headers('kai@example.com'), payload: { gloves: 'available' } })).statusCode).toBe(403);
      expect((await app.inject({ method: 'PUT', url: '/api/equipment', headers: headers('sam@example.com'), payload: { gloves: 'yes' } })).statusCode).toBe(400);
      expect((await app.inject({ method: 'PUT', url: '/api/equipment', headers: headers('sam@example.com'), payload: { gloves: 'available' } })).json()).toEqual({ gloves: 'available' });
    } finally { await app.close(); }
  });
  it('defaults to unknown and survives a store restart', async () => {
    const db = new FakeFirestore();
    const first = new FirestoreEquipmentStore(db);
    expect(await first.read()).toBe('unknown');
    await first.write('available');
    const restarted = new FirestoreEquipmentStore(db);
    expect(await restarted.read()).toBe('available');
    await restarted.write('unavailable');
    expect(await first.read()).toBe('unavailable');
  });

  it('requires gloves and both approvals, and checks a previously approved session and late start', async () => {
    const approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
    const equipment = new MemoryEquipmentStore();
    const template = { ...STARTER_SESSION, cardIds: ['wall-chest-pass'] };
    const training = new TrainingService({ approvals, equipment, content: loadContent(), plan: new SingleSessionPlan(template) });
    await training.proposeFor(date);
    const requests = await approvals.pending();
    const card = requests.find((r) => r.itemId === 'card-wall-chest-pass')!;
    const session = requests.find((r) => r.itemId === 'session-starter')!;
    expect(card).toBeDefined();
    await equipment.write('available');
    await approvals.approve(card.id, parent);
    expect((await training.today(date)).today).toBeNull();
    await approvals.approve(session.id, parent);
    expect((await training.today(date)).today?.cards.map((c) => c.id)).toEqual(['wall-chest-pass']);
    await equipment.write('unknown');
    expect((await training.today(date)).today).toBeNull();
    expect((await training.today(date)).lastApproved).toBeNull();
    expect(await training.markStarted(session.itemId, session.itemVersion)).toBe(false);
    expect(await training.markStartedLate(session.itemId, session.itemVersion, parent, date)).toBe(false);
    await equipment.write('unavailable');
    expect((await training.today(date)).today).toBeNull();
    await equipment.write('available');
    expect((await training.today(date)).today?.requiresGloves).toBe(true);
  });
});
