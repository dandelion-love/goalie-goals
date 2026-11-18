import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog, REQUEST_TTL_MS } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { DEMO_REQUESTS } from '../src/demoData.js';
import { cardSeconds, creditLine, doseText, loadContent, type ContentLibrary } from '../src/content.js';
import {
  STARTER_SESSION,
  SingleSessionPlan,
  TrainingService,
  type SessionTemplate,
  type TrainingPlan,
} from '../src/training.js';

// Fixtures: the invented cast; content is the repo's own exercise cards.
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const PARENT = { account: SAM, role: 'parent' as const };
const DATE = '2026-01-05';

const CONTENT = loadContent();

class TestClock {
  now = new Date('2026-01-05T09:00:00Z');
  read = () => new Date(this.now);
  advance(ms: number) {
    this.now = new Date(this.now.getTime() + ms);
  }
}

/** A plan whose session can be swapped mid-test, as a plan change would. */
class SwappablePlan implements TrainingPlan {
  constructor(public template: SessionTemplate | null) {}
  sessionFor() {
    return this.template;
  }
}

/** The library with one card edited (any edit gives a new content hash). */
function withEditedCard(content: ContentLibrary, id: string, step: string): ContentLibrary {
  const cards = new Map(content.cards);
  const src = cards.get(id)!;
  cards.set(id, {
    ...src,
    card: { ...src.card, steps: [...src.card.steps.slice(0, -1), step] },
    contentHash: `0e${src.contentHash.slice(2)}`,
  });
  return { cards };
}

let clock: TestClock;
let approvals: ApprovalService;
let plan: SwappablePlan;
let training: TrainingService;

beforeEach(() => {
  clock = new TestClock();
  approvals = new ApprovalService({
    store: new MemoryApprovalStore(),
    audit: new MemoryAuditLog(),
    notifier: new InAppNotifier(),
    clock: clock.read,
  });
  plan = new SwappablePlan(STARTER_SESSION);
  training = new TrainingService({ approvals, content: CONTENT, plan });
});

async function approveAllPending() {
  for (const r of await approvals.pending()) await approvals.approve(r.id, PARENT);
}

describe('content', () => {
  it('reads every exercise card with its figure and the credit line from the manifest', () => {
    expect([...CONTENT.cards.keys()]).toEqual(
      expect.arrayContaining(['plank', 'glute-bridge', 'squat-to-box', 'lateral-shuffle', 'pogo-hops']),
    );
    const plank = CONTENT.cards.get('plank')!;
    expect(plank.figureSvg).toMatch(/^<svg/);
    expect(plank.credit).toBe('Figure: the goalie-goals contributors, CC BY-SA 4.0, drawn for this repo.');
    expect(plank.card).not.toHaveProperty('approved');
  });

  it('builds the credit line like content_check.py, including adapted work', () => {
    expect(
      creditLine({ path: 'x', author: 'A. Artist', licence: 'CC-BY-4.0', source: 'an open set', adapted: true, changes: 'recoloured' }),
    ).toBe('Figure: A. Artist, CC BY 4.0, an open set (recoloured).');
  });

  it('states doses in plain words and keeps the card doses unchanged', () => {
    expect(doseText(CONTENT.cards.get('plank')!.card.dose)).toBe('2 sets of 20 s hold, rest 45 s');
    expect(doseText(CONTENT.cards.get('glute-bridge')!.card.dose)).toBe('2 sets of 12 reps, rest 45 s');
    expect(doseText(CONTENT.cards.get('side-plank')!.card.dose)).toBe('2 sets of 15 s hold each side, rest 45 s');
    expect(doseText(CONTENT.cards.get('lateral-shuffle')!.card.dose)).toBe('2 sets of 3 efforts over 4 m, rest 90 s');
    expect(cardSeconds(CONTENT.cards.get('plank')!.card.dose)).toBe(85);
  });
});

describe('request text the parent reads', () => {
  const REPO_WORDS = /content\/|\.spec\.md|\.json|card version|exercise card|sha256|[0-9a-f]{8}/i;
  const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
  const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

  it('names each card plainly, with no repo path, card version or hash', async () => {
    await training.proposeFor(DATE);
    const pending = await approvals.pending();
    expect(pending.map((r) => r.content.title)).toEqual(['Front plank', 'Glute bridge', 'Session: Strong middle']);
    for (const r of pending) {
      expect(r.content.title).not.toMatch(REPO_WORDS);
      expect(r.content.detail).not.toMatch(REPO_WORDS);
    }
    expect(pending[0].content.detail).toBe(
      'A strong, stiff middle lets you dive and land without the body folding. Dose: 2 sets of 20 s hold, rest 45 s.',
    );
  });

  it('keeps every sentence of every card, session and demo request within 20 words', async () => {
    const all = [...CONTENT.cards.keys()];
    plan.template = { ...STARTER_SESSION, cardIds: all };
    await training.proposeFor(DATE);
    const texts = (await approvals.pending()).map((r) => r.content.detail);
    texts.push(...DEMO_REQUESTS.map((r) => r.content.detail));
    expect(texts.length).toBe(all.length + 1 + DEMO_REQUESTS.length);
    for (const text of texts) {
      expect(text).not.toMatch(REPO_WORDS);
      for (const s of sentences(text)) expect(wordCount(s), s).toBeLessThanOrEqual(20);
    }
  });

  it("drops a card's reason when it runs over the limit, keeping the dose", async () => {
    plan.template = { ...STARTER_SESSION, cardIds: ['squat-to-box'] };
    await training.proposeFor(DATE);
    const card = (await approvals.pending()).find((r) => r.itemId === 'card-squat-to-box')!;
    expect(card.content.detail).toBe('Dose: 2 sets of 10 reps, rest 60 s.');
  });

  it('still binds the version to the card: an edit the words do not show needs a new approval', async () => {
    await training.proposeFor(DATE);
    const before = (await approvals.pending()).find((r) => r.itemId === 'card-plank')!;
    training.setContent(withEditedCard(CONTENT, 'plank', 'An edited last step.'));
    await training.proposeFor(DATE);
    const after = (await approvals.pending()).filter((r) => r.itemId === 'card-plank');
    expect(after).toHaveLength(2);
    expect(after[1].content).toEqual(before.content);
    expect(after[1].itemVersion).not.toBe(before.itemVersion);
  });
});

describe("today's session", () => {
  it('proposes the session and each of its cards to the parent', async () => {
    await training.proposeFor(DATE);
    const pending = await approvals.pending();
    expect(pending.map((r) => [r.kind, r.itemId])).toEqual([
      ['exercise', 'card-plank'],
      ['exercise', 'card-glute-bridge'],
      ['plan', 'session-starter'],
    ]);
    expect(pending[2].content.detail).toBe(
      'About 10 minutes. Warm-up: 6 moves, 5 min. Front plank: 2 sets of 20 s hold, rest 45 s. ' +
        'Glute bridge: 2 sets of 12 reps, rest 45 s. Cool-down: 1 move, 1 min.',
    );
    // Asking again is idempotent while the same versions wait.
    await training.proposeFor(DATE);
    expect(await approvals.pending()).toHaveLength(3);
  });

  it('is about 10 minutes: a warm-up of at least 5 minutes, the cards, and a cool-down', async () => {
    const warmUp = STARTER_SESSION.warmUp.reduce((s, m) => s + m.seconds, 0);
    expect(warmUp).toBeGreaterThanOrEqual(300);
    await training.proposeFor(DATE);
    await approveAllPending();
    const res = await training.today(DATE);
    expect(res.today?.minutes).toBeGreaterThanOrEqual(8);
    expect(res.today?.minutes).toBeLessThanOrEqual(12);
  });

  it('serves the session with its cards once the session and every card are approved', async () => {
    await training.proposeFor(DATE);
    await approveAllPending();
    const res = await training.today(DATE);
    expect(res.planned).toBe(true);
    expect(res.lastApproved).toBeNull();
    expect(res.today?.title).toBe('Strong middle');
    expect(res.today?.cards.map((c) => c.id)).toEqual(['plank', 'glute-bridge']);
    const plank = res.today!.cards[0];
    expect(plank.steps.length).toBeGreaterThanOrEqual(3);
    expect(plank.cues).toContain('Straight like a board');
    expect(plank.mistakes[0]).toHaveProperty('fix');
    expect(plank.credit).toMatch(/^Figure: /);
    expect(plank.figureUrl).toMatch(/^\/api\/training\/cards\/plank\/figure\.svg\?v=sha256/);
  });

  it('does not serve a session whose card is approved but session is not, or the reverse', async () => {
    await training.proposeFor(DATE);
    const pending = await approvals.pending();
    // Only the session is approved: its cards still wait.
    await approvals.approve(pending.find((r) => r.itemId === 'session-starter')!.id, PARENT);
    const res = await training.today(DATE);
    expect(res.today).toBeNull();
    expect(res.lastApproved).toBeNull();
  });

  it('reports a planned rest day', async () => {
    plan.template = null;
    expect(await training.today(DATE)).toMatchObject({ planned: false, today: null, lastApproved: null });
  });
});

describe('AC3: no approved session today', () => {
  const BIGGER: SessionTemplate = { ...STARTER_SESSION, cardIds: [...STARTER_SESSION.cardIds, 'squat-to-box'] };

  it('offers rest only when nothing was ever approved', async () => {
    await training.proposeFor(DATE);
    const res = await training.today(DATE);
    expect(res).toMatchObject({ planned: true, today: null, lastApproved: null, waiting: 3 });
    expect(JSON.stringify(res)).not.toMatch(/Front plank|Glute bridge/);
  });

  it('offers the last approved version while a plan change waits, never the pending one', async () => {
    await training.proposeFor(DATE);
    await approveAllPending();
    const v1 = (await training.today(DATE)).today!;

    clock.advance(60_000);
    plan.template = BIGGER;
    await training.proposeFor(DATE);
    const res = await training.today(DATE);
    expect(res.today).toBeNull();
    expect(res.lastApproved?.itemVersion).toBe(v1.itemVersion);
    expect(res.lastApproved?.cards.map((c) => c.id)).toEqual(['plank', 'glute-bridge']);
    expect(JSON.stringify(res)).not.toMatch(/squat|Squat/);
    expect(res.waiting).toBe(2);
  });

  it('offers the last approved version after the new version is declined or expires', async () => {
    await training.proposeFor(DATE);
    await approveAllPending();
    const v1 = (await training.today(DATE)).today!;

    plan.template = BIGGER;
    await training.proposeFor(DATE);
    const session = (await approvals.pending()).find((r) => r.itemId === 'session-starter')!;
    await approvals.decline(session.id, PARENT, 'Next week');
    expect((await training.today(DATE)).lastApproved?.itemVersion).toBe(v1.itemVersion);

    clock.advance(REQUEST_TTL_MS);
    const res = await training.today(DATE);
    expect(res.today).toBeNull();
    expect(res.lastApproved?.itemVersion).toBe(v1.itemVersion);
  });

  it('keeps the approved version of an edited card until the edit is approved', async () => {
    await training.proposeFor(DATE);
    await approveAllPending();
    const before = (await training.today(DATE)).today!;

    training.setContent(withEditedCard(CONTENT, 'plank', 'An edited last step.'));
    await training.proposeFor(DATE);
    const res = await training.today(DATE);
    expect(res.today).toBeNull();
    expect(res.lastApproved?.itemVersion).toBe(before.itemVersion);
    const plank = res.lastApproved!.cards[0];
    expect(plank.steps).toEqual(before.cards[0].steps);
    expect(plank.steps).not.toContain('An edited last step.');

    await approveAllPending();
    const after = await training.today(DATE);
    expect(after.today?.cards[0].steps).toContain('An edited last step.');
  });

  it('offers rest when the last approved version uses a card whose approval was replaced by a decline', async () => {
    // Session approved, but one of its cards declined: never playable, so rest.
    await training.proposeFor(DATE);
    for (const r of await approvals.pending()) {
      if (r.itemId === 'card-glute-bridge') await approvals.decline(r.id, PARENT, null);
      else await approvals.approve(r.id, PARENT);
    }
    const res = await training.today(DATE);
    expect(res).toMatchObject({ today: null, lastApproved: null });
  });
});

describe('training routes', () => {
  const signer = new TestSigner();
  let app: FastifyInstance | undefined;

  function config(): Config {
    return {
      audience: AUDIENCE,
      devMockIdentity: false,
      devMockAccount: KAI,
      roleSeed: `${KAI}=keeper;${SAM}=parent`,
      roleStore: 'memory',
      port: 0,
      webRoot: '',
      production: false,
    };
  }

  const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });

  async function testApp() {
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys), approvals, training });
    return app;
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("gives the keeper today's approved session, honouring the device's date", async () => {
    await training.proposeFor(DATE);
    await approveAllPending();
    const a = await testApp();
    const res = await a.inject({ method: 'GET', url: '/api/training/today?date=2026-01-06', headers: as(KAI) });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.json()).toMatchObject({ date: '2026-01-06', today: { itemId: 'session-starter' } });
  });

  it('refuses an account with no role and a missing identity', async () => {
    const a = await testApp();
    const stranger = await a.inject({ method: 'GET', url: '/api/training/today', headers: as('nobody@example.com') });
    expect(stranger.statusCode).toBe(403);
    const none = await a.inject({ method: 'GET', url: '/api/training/today' });
    expect(none.statusCode).toBe(401);
  });

  it('serves an approved figure as an inert image, and 404 for an unapproved or unknown version', async () => {
    await training.proposeFor(DATE);
    const a = await testApp();
    const pendingCard = (await approvals.pending()).find((r) => r.itemId === 'card-plank')!;
    const url = `/api/training/cards/plank/figure.svg?v=${encodeURIComponent(pendingCard.itemVersion)}`;
    expect((await a.inject({ method: 'GET', url, headers: as(KAI) })).statusCode).toBe(404);

    await approveAllPending();
    const ok = await a.inject({ method: 'GET', url, headers: as(KAI) });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['content-type']).toMatch(/^image\/svg\+xml/);
    expect(ok.headers['content-security-policy']).toMatch(/default-src 'none'/);
    expect(ok.body).toMatch(/^<svg/);

    const other = await a.inject({
      method: 'GET',
      url: `/api/training/cards/pogo-hops/figure.svg?v=${encodeURIComponent(pendingCard.itemVersion)}`,
      headers: as(KAI),
    });
    expect(other.statusCode).toBe(404);
    const unknown = await a.inject({ method: 'GET', url: '/api/training/cards/plank/figure.svg?v=sha256:0', headers: as(KAI) });
    expect(unknown.statusCode).toBe(404);
  });

  it('lists approved cards only', async () => {
    await training.proposeFor(DATE);
    const a = await testApp();
    expect((await a.inject({ method: 'GET', url: '/api/training/cards', headers: as(KAI) })).json()).toEqual({ cards: [] });
    await approveAllPending();
    const res = await a.inject({ method: 'GET', url: '/api/training/cards', headers: as(KAI) });
    expect(res.json().cards.map((c: { id: string }) => c.id)).toEqual(['plank', 'glute-bridge']); // by name: Front plank, Glute bridge
  });

  it('runs an approved session out of the box with the dev mock, and leaves the demo inbox as it was', async () => {
    app = await buildApp({ config: { ...config(), audience: '', devMockIdentity: true } });
    const kai = await app.inject({ method: 'GET', url: '/api/training/today', headers: { cookie: 'dev_as=kai%40example.com' } });
    expect(kai.json().today.cards.map((c: { id: string }) => c.id)).toEqual(['plank', 'glute-bridge']);
    const sam = await app.inject({ method: 'GET', url: '/api/approvals/pending', headers: { cookie: 'dev_as=sam%40example.com' } });
    expect(sam.json().requests).toHaveLength(DEMO_REQUESTS.length);
  });

  it('asks the parent for the whole weekly pack at startup outside the dev mock', async () => {
    app = await buildApp({ config: config(), verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys) });
    const sam = await app.inject({ method: 'GET', url: '/api/approvals/pending', headers: as(SAM) });
    expect(sam.json().requests.map((r: { itemId: string }) => r.itemId)).toEqual([
      'card-plank',
      'card-side-plank',
      'card-glute-bridge',
      'card-pogo-hops',
      'card-squat-to-box',
      'card-split-squat',
      'card-lateral-shuffle',
      'card-broad-jump-stick',
      'card-wall-push-up',
      'session-strong-middle',
      'session-spring-legs',
      'session-quick-feet-strong-arms',
    ]);
    const kai = await app.inject({ method: 'GET', url: '/api/training/today?date=2026-01-05', headers: as(KAI) });
    expect(kai.json()).toMatchObject({ planned: true, today: null, lastApproved: null, waiting: 12 });
  });
});

describe('SingleSessionPlan', () => {
  it('offers the starter session every day until weekly plans arrive', () => {
    expect(new SingleSessionPlan().sessionFor()).toBe(STARTER_SESSION);
  });
});
