import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import {
  APPROVALS_COLLECTION,
  ApprovalService,
  FirestoreApprovalStore,
  MemoryApprovalStore,
  MemoryAuditLog,
} from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent, type ContentLibrary } from '../src/content.js';
import { dossierItemId, weeksLabel, type ClientDossier } from '../src/dossiers.js';
import { STARTER_SESSION, SingleSessionPlan, TrainingService } from '../src/training.js';
import { FakeFirestore } from './fakeFirestore.js';

// Story 115: the plank's dossier goes through parent approval like a card, shows on the card
// only once approved, and returns for approval when it changes. Invented cast only.
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const PARENT = { account: SAM, role: 'parent' as const };
const DATE = '2026-01-05';
const CONTENT = loadContent();
const PLANK = CONTENT.dossiers!.get('plank')!;

/** The library with the plank dossier's headline changed (and so its hash, as on disk). */
function withHeadline(content: ContentLibrary, headline: string): ContentLibrary {
  const dossiers = new Map(content.dossiers);
  const src = dossiers.get('plank')!;
  dossiers.set('plank', {
    dossier: { ...src.dossier, why: { ...src.dossier.why, headline } },
    contentHash: `0d${src.contentHash.slice(2)}`,
  });
  return { ...content, dossiers };
}

let approvals: ApprovalService;
let training: TrainingService;

beforeEach(() => {
  approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit: new MemoryAuditLog(), notifier: new InAppNotifier() });
  training = new TrainingService({ approvals, content: CONTENT, plan: new SingleSessionPlan(STARTER_SESSION) });
});

/** Propose the session, its cards and the dossiers; approve the cards and the session only. */
async function cardsApproved() {
  await training.proposeFor(DATE);
  await training.dossiers.propose();
  for (const r of await approvals.pending()) if (r.kind !== 'dossier') await approvals.approve(r.id, PARENT);
}

/** The plank dossier's pending request; every card has a dossier, each with its own request. */
const dossierRequest = async () =>
  (await approvals.pending()).find((r) => r.kind === 'dossier' && r.itemId === dossierItemId('plank'))!;

const plankCard = async () => (await training.today(DATE)).today!.cards.find((c) => c.id === 'plank')!;

describe('content', () => {
  it('reads the plank dossier beside its card, without its static approved flag', () => {
    // Every card has its dossier (story 115, second part).
    expect([...CONTENT.dossiers!.keys()].sort()).toEqual([...CONTENT.cards.keys()].sort());
    expect(PLANK.dossier.card).toBe('content/exercises/plank.json');
    expect(PLANK.dossier).not.toHaveProperty('approved');
    expect(PLANK.contentHash).toMatch(/^[0-9a-f]{64}$/);
    // A dossier is never read as a card.
    expect(CONTENT.cards.has('plank.dossier')).toBe(false);
  });
});

describe('the approval request (AC3)', () => {
  it('requires a new approval for the corrected keep-it-up text', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'plank-approval-'));
    try {
      cpSync(new URL('../../content', import.meta.url), join(dir, 'content'), { recursive: true });
      const file = join(dir, 'content', 'exercises', 'plank.dossier.json');
      const old = JSON.parse(readFileSync(file, 'utf8'));
      old.expect.keep_up.text = 'Training about twice a week, as in your plan, keeps gains coming. In one youth study, jump gains lasted 8 weeks after training stopped. Everyone improves at their own pace.';
      writeFileSync(file, JSON.stringify(old, null, 2));
      const oldContent = loadContent(join(dir, 'content'));
      training.setContent(oldContent);
      await training.dossiers.propose();
      const first = await dossierRequest();
      await approvals.approve(first.id, PARENT);
      training.setContent(CONTENT);
      await training.dossiers.propose();
      const next = await dossierRequest();
      expect(next.itemVersion).not.toBe(first.itemVersion);
      expect(await approvals.isApproved(next.itemId, next.itemVersion)).toBe(false);
      const awaiting = await training.dossiers.forRequest(next);
      expect(awaiting?.expect.at(-1)?.text).toBe('Keep practising. In one youth study, jump gains remained after training. They were measured 8 weeks after the program ended. Everyone improves at their own pace.');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('asks the parent once per version, in plain words', async () => {
    await training.dossiers.propose();
    await training.dossiers.propose();
    const pending = await approvals.pending();
    // One request per card's dossier, each asked once.
    expect(pending).toHaveLength(CONTENT.cards.size);
    expect(pending.map((r) => r.itemId).sort()).toEqual([...CONTENT.cards.keys()].map(dossierItemId).sort());
    const r = pending.find((x) => x.itemId === dossierItemId('plank'))!;
    expect(r.kind).toBe('dossier');
    expect(r.content.title).toBe('Front plank: why it matters');
    for (const x of pending) {
      expect(x.kind).toBe('dossier');
      expect(x.content.title).toBe(`${CONTENT.cards.get(x.itemId.slice('dossier-'.length))!.card.name}: why it matters`);
      expect(x.content.detail).not.toMatch(/content\/|\.json|sha256|[0-9a-f]{8}/i);
      for (const s of x.content.detail.split(/(?<=[.!?])\s+/)) expect(s.split(/\s+/).length).toBeLessThanOrEqual(20);
    }
  });

  it('asks again when the dossier changes', async () => {
    await training.dossiers.propose();
    const first = await dossierRequest();
    training.setContent(withHeadline(CONTENT, 'A firm middle helps you land in control.'));
    await training.dossiers.propose();
    const pending = (await approvals.pending()).filter((r) => r.itemId === dossierItemId('plank'));
    expect(pending).toHaveLength(2);
    expect(pending[1].itemVersion).not.toBe(first.itemVersion);
  });
});

describe('what the keeper sees (AC2, AC3)', () => {
  it('hides an unapproved dossier: the card carries none and the list is empty', async () => {
    await cardsApproved();
    expect(await plankCard()).not.toHaveProperty('dossier');
    expect([...(await training.dossiers.approved()).keys()]).toEqual([]);
  });

  it('hides a declined dossier', async () => {
    await cardsApproved();
    await approvals.decline((await dossierRequest()).id, PARENT, null);
    expect(await plankCard()).not.toHaveProperty('dossier');
  });

  it('shows an approved dossier on its card: two sections, ranges with time frames, numbered sources', async () => {
    await cardsApproved();
    await approvals.approve((await dossierRequest()).id, PARENT);
    const today = (await training.today(DATE)).today!;
    expect(today.cards.find((c) => c.id === 'glute-bridge')).not.toHaveProperty('dossier');
    const d = (await plankCard()).dossier!;
    expect(d.name).toBe('Front plank');
    expect(d.headline).toBe(PLANK.dossier.why.headline);
    expect(d.why.map((c) => c.label)).toEqual(['Dives', 'Set position', 'Set position', 'Jumps and landings']);
    expect(d.expect.map((c) => c.label)).toEqual(['6 weeks', '9 weeks', 'Keep it up']);
    expect(d.expect[0].text).toContain('8 to 22%');
    // Only the sources the two sections cite, numbered in order, each with its public link.
    const cited = [...PLANK.dossier.why.claims, ...PLANK.dossier.expect.claims, PLANK.dossier.expect.keep_up].flatMap(
      (c) => c.sources,
    );
    expect(d.sources.map((s) => s.n)).toEqual(d.sources.map((_, i) => i + 1));
    expect(d.sources).toHaveLength(new Set(cited).size);
    for (const s of d.sources) expect(s.url).toMatch(/^https:\/\//);
    expect(d.why[0].sources).toEqual([1]);
    // Labels stay at 3 words or fewer.
    for (const c of [...d.why, ...d.expect]) expect(c.label.split(' ').length).toBeLessThanOrEqual(3);
    // The other four sections are not sent (AC5).
    expect(JSON.stringify(d)).not.toMatch(/rectus|muscles do|FIFA 11\+/);
  });

  it('keeps showing the approved version while a changed one waits', async () => {
    await cardsApproved();
    await approvals.approve((await dossierRequest()).id, PARENT);
    const changed = 'A firm middle helps you land in control.';
    training.setContent(withHeadline(CONTENT, changed));
    await training.dossiers.propose();
    expect((await plankCard()).dossier!.headline).toBe(PLANK.dossier.why.headline);
    expect(JSON.stringify(await training.today(DATE))).not.toContain(changed);
    await approvals.approve((await dossierRequest()).id, PARENT);
    expect((await plankCard()).dossier!.headline).toBe(changed);
  });

  it('labels a range of weeks', () => {
    expect(weeksLabel([6, 6])).toBe('6 weeks');
    expect(weeksLabel([1, 1])).toBe('1 week');
    expect(weeksLabel([6, 12])).toBe('6 to 12 weeks');
  });
});

describe('dossier routes', () => {
  const signer = new TestSigner();
  const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });
  let app: FastifyInstance | undefined;

  function config(store: 'memory' | 'firestore' = 'memory'): Config {
    return {
      audience: AUDIENCE,
      devMockIdentity: false,
      devMockAccount: KAI,
      roleSeed: `${KAI}=keeper;${SAM}=parent`,
      roleStore: 'memory',
      scheduleStore: store,
      port: 0,
      webRoot: '',
      production: false,
    };
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  const get = (a: FastifyInstance, url: string, account: string) => a.inject({ method: 'GET', url, headers: as(account) });

  it('returns parent-only decision evidence for exact request snapshots and refuses stale requests', async () => {
    await training.proposeFor(DATE);
    await training.dossiers.propose();
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });
    const requests = await approvals.pending();
    const exercise = requests.find((r) => r.kind === 'exercise' && r.itemId === 'card-plank')!;
    const plan = requests.find((r) => r.kind === 'plan')!;
    const dossier = await dossierRequest();
    for (const request of [exercise, plan, dossier]) {
      const url = `/api/approvals/${request.id}/decision-evidence`;
      expect((await get(app, url, KAI)).statusCode).toBe(403);
      const response = await get(app, url, SAM);
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.json().itemVersion).toBe(request.itemVersion);
    }
    const exerciseEvidence = (await get(app, `/api/approvals/${exercise.id}/decision-evidence`, SAM)).json();
    expect(exerciseEvidence.cards[0]).toMatchObject({ name: 'Front plank', itemVersion: exercise.itemVersion, why: CONTENT.cards.get('plank')!.card.why });
    expect(exerciseEvidence.cards[0].cautions).toEqual(CONTENT.cards.get('plank')!.card.stop_if);
    expect(exerciseEvidence.cards[0].dossier.cardId).toBe('plank');
    expect((await get(app, `/api/approvals/${plan.id}/decision-evidence`, SAM)).json().cards).toHaveLength(STARTER_SESSION.cardIds.length);
    expect((await get(app, `/api/approvals/${dossier.id}/decision-evidence`, SAM)).json().dossier.itemVersion).toBe(dossier.itemVersion);
    await approvals.decline(exercise.id, PARENT, null);
    expect((await get(app, `/api/approvals/${exercise.id}/decision-evidence`, SAM)).statusCode).toBe(404);
  });

  it('does not attach a current dossier to an older exercise snapshot', async () => {
    await training.proposeFor(DATE);
    const request = (await approvals.pending()).find((r) => r.itemId === 'card-plank')!;
    const cards = new Map(CONTENT.cards);
    const current = cards.get('plank')!;
    cards.set('plank', { ...current, contentHash: `changed-${current.contentHash}` });
    training.setContent({ ...CONTENT, cards });
    const evidence = training.decisionEvidence(request)!;
    expect(evidence[0].itemVersion).toBe(request.itemVersion);
    expect(evidence[0].dossier).toBeNull();
  });

  it('lets the parent read a request before approving it, and never the keeper', async () => {
    await cardsApproved();
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });
    const r = await dossierRequest();
    const sam = await get(app, `/api/approvals/${r.id}/dossier`, SAM);
    expect(sam.statusCode).toBe(200);
    expect(sam.headers['cache-control']).toBe('no-store');
    expect((sam.json().dossier as ClientDossier).headline).toBe(PLANK.dossier.why.headline);
    expect((await get(app, `/api/approvals/${r.id}/dossier`, KAI)).statusCode).toBe(403);
    // The keeper's list holds approved dossiers only.
    expect((await get(app, '/api/training/dossiers', KAI)).json()).toEqual({ dossiers: [] });
    // A request of another kind has no dossier.
    const card = (await approvals.store.list()).find((x) => x.kind === 'exercise')!;
    expect((await get(app, `/api/approvals/${card.id}/dossier`, SAM)).statusCode).toBe(404);
    expect((await get(app, '/api/approvals/no-such-id/dossier', SAM)).statusCode).toBe(404);

    expect((await app.inject({ method: 'POST', url: `/api/approvals/${r.id}/approve`, headers: as(SAM), payload: {} })).statusCode).toBe(200);
    const list = (await get(app, '/api/training/dossiers', KAI)).json() as { dossiers: ClientDossier[] };
    expect(list.dossiers.map((d) => d.cardId)).toEqual(['plank']);
    expect((await get(app, '/api/training/dossiers', 'nobody@example.com')).statusCode).toBe(403);
  });

  it('keeps a dossier request and its approval in Firestore across a restart (story 118)', async () => {
    const db = new FakeFirestore();
    const boot = () =>
      buildApp({ config: config('firestore'), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), firestore: db });
    app = await boot();
    const { requests } = (await get(app, '/api/approvals/pending', SAM)).json() as {
      requests: { id: string; kind: string; itemId: string }[];
    };
    const ask = requests.find((r) => r.kind === 'dossier' && r.itemId === 'dossier-plank')!;
    expect(ask.itemId).toBe('dossier-plank');
    // Stored with its kind, so the store reads it back.
    const store = new FirestoreApprovalStore(db);
    expect((await store.get(ask.id))?.kind).toBe('dossier');
    expect(db.paths()).toContain(`${APPROVALS_COLLECTION}/${ask.id}`);

    for (const r of requests) {
      expect((await app.inject({ method: 'POST', url: `/api/approvals/${r.id}/approve`, headers: as(SAM), payload: {} })).statusCode).toBe(200);
    }
    await app.close();
    app = await boot();
    // After the restart: nothing asked again, and the keeper still reads the approved dossier.
    expect((await get(app, '/api/approvals/pending', SAM)).json().requests).toEqual([]);
    const list = (await get(app, '/api/training/dossiers', KAI)).json() as { dossiers: ClientDossier[] };
    // Every request was approved, so every card's dossier shows.
    expect(list.dossiers.map((d) => d.cardId).sort()).toEqual([...CONTENT.cards.keys()].sort());
    const today = (await get(app, `/api/training/today?date=${DATE}`, KAI)).json();
    expect(today.today.cards.find((c: { id: string }) => c.id === 'plank').dossier.headline).toBe(PLANK.dossier.why.headline);
    const version = (await store.get(ask.id))!.itemVersion;
    expect((await store.approvedVersion('dossier-plank', version))?.kind).toBe('dossier');
  });
});
