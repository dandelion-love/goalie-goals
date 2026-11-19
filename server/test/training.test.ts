import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog, REQUEST_TTL_MS } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { DEMO_REQUESTS } from '../src/demoData.js';
import {
  cardSeconds,
  creditLine,
  defaultContentRoot,
  doseText,
  loadContent,
  type ContentLibrary,
} from '../src/content.js';
import {
  STARTER_SESSION,
  SingleSessionPlan,
  TrainingService,
  type SessionTemplate,
  type TrainingPlan,
} from '../src/training.js';

/** Every card's dossier request (story 115), in the order the content is read. */
const DOSSIER_REQUESTS = [
  'dossier-broad-jump-stick',
  'dossier-glute-bridge',
  'dossier-lateral-shuffle',
  'dossier-plank',
  'dossier-pogo-hops',
  'dossier-set-position',
  'dossier-side-plank',
  'dossier-split-squat',
  'dossier-squat-to-box',
  'dossier-wall-chest-pass',
  'dossier-wall-push-up',
];

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

/** The library with one card's reason replaced (the hash changes with it). */
function withReason(content: ContentLibrary, id: string, why: string): ContentLibrary {
  const cards = new Map(content.cards);
  const src = cards.get(id)!;
  cards.set(id, { ...src, card: { ...src.card, why }, contentHash: `0f${src.contentHash.slice(2)}` });
  return { cards };
}

/** The plank card's wording before story #91 shortened it. */
const OLD_PLANK = {
  cue: 'Straight like a board',
  step: 'Make a straight line from head to heels by squeezing your bottom and tummy.',
  stop: 'Pain in the lower back or shoulders, or pain that changes how you move',
};

/**
 * The repo's content folder, read through loadContent (so the hashes are real), with the
 * plank card put back in its wording before story #91.
 */
function contentWithOldPlank(): ContentLibrary {
  const dir = mkdtempSync(join(tmpdir(), 'goalie-content-'));
  try {
    cpSync(defaultContentRoot(), join(dir, 'content'), { recursive: true });
    const file = join(dir, 'content', 'exercises', 'plank.json');
    const card = JSON.parse(readFileSync(file, 'utf8')) as { cues: string[]; steps: string[]; stop_if: string[] };
    card.cues = card.cues.map((c) => (c === 'Stay board-straight' ? OLD_PLANK.cue : c));
    card.steps = card.steps.map((s) => (s.startsWith('Make a straight line') ? OLD_PLANK.step : s));
    card.stop_if = [OLD_PLANK.stop, ...card.stop_if.filter((s) => !s.startsWith('Pain'))];
    writeFileSync(file, JSON.stringify(card, null, 2));
    return loadContent(join(dir, 'content'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
      'A strong, stiff middle lets you dive and land without folding. Dose: 2 sets of 20 s hold, rest 45 s.',
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
    // Every repo card's reason is short (story #91), so this one is lengthened for the test.
    const long =
      'Strong legs push you off the ground for a dive or a high catch, and sitting back to a box teaches a safe squat shape.';
    training.setContent(withReason(CONTENT, 'squat-to-box', long));
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
    expect(plank.cues).toContain('Stay board-straight');
    expect(plank.mistakes[0]).toHaveProperty('fix');
    // Story 112: the card's setup, why and parent checks reach the player.
    expect(plank.why).toMatch(/\S/);
    expect(plank.setup).toMatchObject({ space: expect.any(String), equipment: expect.any(String), parent: expect.any(String) });
    expect(plank.parentCheck).toContain('Hips do not sag or pike');
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

describe('story #91 AC3: reworded card text is a new version the parent approves', () => {
  it('gives the reworded card a new hash and request; the old wording never plays once the new one is approved', async () => {
    const old = contentWithOldPlank();
    expect(old.cards.get('plank')!.contentHash).not.toBe(CONTENT.cards.get('plank')!.contentHash);
    expect(old.cards.get('glute-bridge')!.contentHash).toBe(CONTENT.cards.get('glute-bridge')!.contentHash);

    // The parent approved the session with the old wording.
    training.setContent(old);
    await training.proposeFor(DATE);
    await approveAllPending();
    const before = (await training.today(DATE)).today!;
    expect(before.cards[0].cues).toContain(OLD_PLANK.cue);

    // The new wording arrives: it needs its own approval, and only the reworded card asks.
    training.setContent(CONTENT);
    await training.proposeFor(DATE);
    const asks = (await approvals.pending()).map((r) => r.itemId);
    expect(asks).toContain('card-plank');
    expect(asks).not.toContain('card-glute-bridge');
    const waiting = await training.today(DATE);
    expect(waiting.today).toBeNull();
    expect(waiting.lastApproved?.cards[0].cues).toContain(OLD_PLANK.cue);
    expect(JSON.stringify(waiting)).not.toContain('Stay board-straight');

    // Once approved, only the new wording is served: the old one is no longer playable.
    await approveAllPending();
    const after = await training.today(DATE);
    expect(after.lastApproved).toBeNull();
    const plank = after.today!.cards[0];
    expect(plank.cues).toContain('Stay board-straight');
    expect(plank.stopIf).toEqual(CONTENT.cards.get('plank')!.card.stop_if);
    const served = JSON.stringify(after);
    for (const line of Object.values(OLD_PLANK)) expect(served).not.toContain(line);
  });
});

/** The squat-to-box setup line the player showed before story 117 shortened it. */
const OLD_SQUAT_PARENT = 'Stand side-on, about 2 m away, where you can see knees and back.';

/** The repo's content through loadContent (real hashes), with squat-to-box's old setup line. */
function contentWithOldSquatSetup(): ContentLibrary {
  const dir = mkdtempSync(join(tmpdir(), 'goalie-content-'));
  try {
    cpSync(defaultContentRoot(), join(dir, 'content'), { recursive: true });
    const file = join(dir, 'content', 'exercises', 'squat-to-box.json');
    const card = JSON.parse(readFileSync(file, 'utf8')) as { setup: Record<string, string> };
    card.setup.parent = OLD_SQUAT_PARENT;
    writeFileSync(file, JSON.stringify(card, null, 2));
    return loadContent(join(dir, 'content'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('story 117 AC3: a shortened setup line is a new version the parent approves', () => {
  it('changes the hash, asks the parent again and serves the old setup until approved', async () => {
    const old = contentWithOldSquatSetup();
    const now = CONTENT.cards.get('squat-to-box')!;
    expect(now.card.setup.parent).not.toBe(OLD_SQUAT_PARENT);
    expect(old.cards.get('squat-to-box')!.contentHash).not.toBe(now.contentHash);

    plan.template = { ...STARTER_SESSION, cardIds: ['squat-to-box'] };
    training.setContent(old);
    await training.proposeFor(DATE);
    await approveAllPending();
    const before = (await training.today(DATE)).today!;
    expect(before.cards[0].setup.parent).toBe(OLD_SQUAT_PARENT);

    // The new wording arrives as a change request; the keeper keeps the approved version.
    training.setContent(CONTENT);
    await training.proposeFor(DATE);
    const ask = (await approvals.pending()).find((r) => r.itemId === 'card-squat-to-box');
    expect(ask).toBeDefined();
    expect(ask!.itemVersion).not.toBe(before.cards[0].itemVersion);
    const waiting = await training.today(DATE);
    expect(waiting.today).toBeNull();
    expect(waiting.lastApproved?.cards[0].setup.parent).toBe(OLD_SQUAT_PARENT);
    expect(JSON.stringify(waiting)).not.toContain(now.card.setup.parent);

    await approveAllPending();
    const after = await training.today(DATE);
    expect(after.lastApproved).toBeNull();
    expect(after.today!.cards[0].setup.parent).toBe(now.card.setup.parent);
    expect(JSON.stringify(after)).not.toContain(OLD_SQUAT_PARENT);
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
    // The dev mock runs the themed week (story 116); an invented Monday is a default training day.
    const kai = await app.inject({ method: 'GET', url: '/api/training/today?date=2026-01-05', headers: { cookie: 'dev_as=kai%40example.com' } });
    expect(kai.json().today.cards.map((c: { id: string }) => c.id)).toEqual(['plank', 'side-plank', 'glute-bridge']);
    const sam = await app.inject({ method: 'GET', url: '/api/approvals/pending', headers: { cookie: 'dev_as=sam%40example.com' } });
    // The demo requests, and every card's dossier (story 115), left for the parent to approve.
    expect(sam.json().requests.map((r: { itemId: string }) => r.itemId)).toEqual([
      ...DEMO_REQUESTS.map((r) => r.itemId),
      ...DOSSIER_REQUESTS,
    ]);
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
      'card-set-position',
      'card-lateral-shuffle',
      'card-wall-chest-pass',
      'session-strong-middle',
      'session-spring-legs',
      'session-quick-feet-strong-arms',
      // Story 115: every card's dossier waits for the parent too.
      ...DOSSIER_REQUESTS,
    ]);
    const kai = await app.inject({ method: 'GET', url: '/api/training/today?date=2026-01-05', headers: as(KAI) });
    expect(kai.json()).toMatchObject({ planned: true, today: null, lastApproved: null, waiting: 12 + DOSSIER_REQUESTS.length });
  });
});

describe('SingleSessionPlan', () => {
  it('offers the starter session every day until weekly plans arrive', () => {
    expect(new SingleSessionPlan().sessionFor()).toBe(STARTER_SESSION);
  });
});
