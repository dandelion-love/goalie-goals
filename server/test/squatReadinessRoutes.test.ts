import { expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { loadContent } from '../src/content.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { InAppNotifier } from '../src/notifier.js';
import { STARTER_SESSION, SingleSessionPlan, TrainingService } from '../src/training.js';
import type { SyntheticSquatProof } from '../src/historyRoutes.js';

it('uses bound records and parent confirmations on the normal route with synthetic server proof', async () => {
  const audience = '/test/squat';
  const signer = new TestSigner();
  const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience }) });
  const parent = { account: 'parent@example.com', role: 'parent' as const };
  const original = loadContent();
  const cards = new Map(original.cards);
  const source = cards.get('squat-to-box')!;
  cards.set('squat-to-box', { ...source, contentHash: 'synthetic-approved-top-dose', card: { ...source.card, dose: { ...source.card.dose, reps: 15 } } });
  const approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
  const training = new TrainingService({ approvals, content: { ...original, cards }, plan: new SingleSessionPlan({ ...STARTER_SESSION, cardIds: ['squat-to-box'] }) });
  const date = '2026-01-05';
  await training.proposeFor(date);
  for (const request of await approvals.pending()) await approvals.approve(request.id, parent);
  const session = (await training.today(date)).today!;
  const proof: SyntheticSquatProof = { orderedRecordIds: [], safety: { pain: 'clear', growth: 'clear', breakRestart: 'clear', stepDown: 'clear' } };
  const app = await buildApp({ config: { audience, devMockIdentity: false, devMockAccount: 'keeper@example.com', roleSeed: 'keeper@example.com=keeper;parent@example.com=parent', roleStore: 'memory', port: 0, webRoot: '', production: false }, verifier: new ProxyJwtVerifier(audience, signer.keys), approvals, training, syntheticSquatProof: async () => proof });
  const status = async (who: string) => (await app.inject({ method: 'GET', url: '/api/history/squat-evidence', headers: as(who) })).json();
  try {
    for (const n of [1, 2]) {
      const instanceId = `instance-test-${n}`;
      const id = `record-test-${n}`;
      expect((await app.inject({ method: 'POST', url: '/api/training/started', headers: as('keeper@example.com'), payload: { date, itemId: session.itemId, itemVersion: session.itemVersion, instanceId } })).statusCode).toBe(200);
      const entry = { id, date, itemId: session.itemId, itemVersion: session.itemVersion, outcome: 'done', instanceId, cards: [{ cardId: 'squat-to-box', itemVersion: session.cards[0].itemVersion, setsDone: 2, cues: [] }] };
      expect((await app.inject({ method: 'POST', url: '/api/history/sessions', headers: as('keeper@example.com'), payload: entry })).statusCode).toBe(200);
      proof.orderedRecordIds.push(id);
      expect((await status('keeper@example.com')).status).toBe('unknown');
      for (const set of [0, 1]) {
        const payload = { id, version: session.cards[0].itemVersion, set, actualReps: 15, clean: true, previous: null };
        expect((await app.inject({ method: 'PUT', url: '/api/history/squat-set', headers: as('keeper@example.com'), payload })).statusCode).toBe(403);
        expect((await app.inject({ method: 'PUT', url: '/api/history/squat-set', headers: as('parent@example.com'), payload })).statusCode).toBe(200);
      }
      expect((await app.inject({ method: 'POST', url: '/api/history/sessions', headers: as('keeper@example.com'), payload: entry })).statusCode).toBe(200);
      expect((await status('parent@example.com')).status).toBe(n === 1 ? 'one-qualifying' : 'ready-for-parent');
    }
    expect((await status('keeper@example.com')).status).toBe('ready-for-parent');
    expect((await app.inject({ method: 'GET', url: '/api/history/squat-evidence', headers: as('outside@example.com') })).statusCode).toBe(403);
    proof.safety.growth = 'unknown';
    expect((await status('parent@example.com')).status).toBe('unknown');
    proof.safety.growth = 'clear';
    const cardApproval = (await approvals.store.list({ state: 'approved' })).find((r) => r.itemId === 'card-squat-to-box')!;
    await approvals.store.reopen(cardApproval.id);
    expect((await status('parent@example.com')).status).toBe('unknown');
    proof.orderedRecordIds.reverse();
    proof.orderedRecordIds.pop();
    expect((await status('parent@example.com')).status).toBe('unknown');
    proof.safety.growth = 'held';
    expect((await status('parent@example.com')).status).toBe('held');
  } finally { await app.close(); }
});

it('refuses synthetic readiness proof in production', async () => {
  await expect(buildApp({ config: { audience: '/test', devMockIdentity: false, devMockAccount: '', roleSeed: '', roleStore: 'memory', port: 0, webRoot: '', production: true }, syntheticSquatProof: async () => null })).rejects.toThrow('Synthetic squat proof is refused in production');
});
