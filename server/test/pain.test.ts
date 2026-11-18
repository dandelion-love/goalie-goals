import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { TestSigner } from '../src/devIdentity.js';
import { IDENTITY_HEADER, ProxyJwtVerifier } from '../src/identity.js';
import { ApprovalService, MemoryApprovalStore, MemoryAuditLog } from '../src/approvals.js';
import { InAppNotifier } from '../src/notifier.js';
import { loadContent } from '../src/content.js';
import { TrainingService } from '../src/training.js';
import { MemoryPainStore, PainError, PainService } from '../src/pain.js';

// Fixtures: the invented cast (keeper Kai, parent Sam) and invented pain reports only.
const AUDIENCE = '/test/audience/goalie-goals';
const KAI = 'kai@example.com';
const SAM = 'sam@example.com';
const KEEPER = { account: KAI, role: 'keeper' as const };
const PARENT = { account: SAM, role: 'parent' as const };
/** An invented note that must never appear anywhere but the report itself. */
const NOTE = 'Invented demo note: sore after the side steps, zq7-marker';
const REPORT = { id: 'demo-report-0001', bodyArea: 'knee', note: NOTE, date: '2026-01-07' };

const signer = new TestSigner();
const as = (account: string) => ({ [IDENTITY_HEADER]: signer.sign({ account, audience: AUDIENCE }) });

let audit: MemoryAuditLog;
let notifier: InAppNotifier;
let pain: PainService;

beforeEach(() => {
  audit = new MemoryAuditLog();
  notifier = new InAppNotifier();
  pain = new PainService({ store: new MemoryPainStore(), audit, notifier });
});

describe('PainService (AC1, AC3)', () => {
  it('records a report, pauses training and tells the parent', async () => {
    await pain.report(KEEPER, { ...REPORT, bodyArea: 'knee' });
    const status = await pain.status();
    expect(status.paused).toBe(true);
    expect(status.since).toBe('2026-01-07');
    expect(status.open[0]).toMatchObject({ bodyArea: 'knee', note: NOTE, reportedBy: 'keeper' });
    expect(await notifier.unreadCount('parent')).toBe(1);
  });

  it('stores a report sent again from the offline outbox once', async () => {
    await pain.report(KEEPER, { ...REPORT, bodyArea: 'knee' });
    await pain.report(KEEPER, { ...REPORT, bodyArea: 'knee' });
    expect((await pain.status()).open).toHaveLength(1);
    expect((await audit.list()).filter((e) => e.action === 'paused')).toHaveLength(1);
  });

  it('refuses a body area outside the fixed list', async () => {
    await expect(pain.report(KEEPER, { ...REPORT, bodyArea: 'elbow' as never })).rejects.toBeInstanceOf(PainError);
    expect((await pain.status()).paused).toBe(false);
  });

  it('lets only a parent clear the pause; a keeper attempt is refused and logged', async () => {
    await pain.report(KEEPER, { ...REPORT, bodyArea: 'knee' });
    await expect(pain.clear(KEEPER, '2026-01-08')).rejects.toMatchObject({ code: 'forbidden' });
    expect((await pain.status()).paused).toBe(true);
    await pain.clear(PARENT, '2026-01-09');
    expect((await pain.status()).paused).toBe(false);
    expect(await notifier.unreadCount('parent')).toBe(0);
    await expect(pain.clear(PARENT, '2026-01-09')).rejects.toMatchObject({ code: 'not_paused' });

    const events = await audit.list();
    expect(events.map((e) => [e.action, e.actorRole, e.kind])).toEqual([
      ['paused', 'keeper', 'pause'],
      ['refused', 'keeper', 'pause'],
      ['cleared', 'parent', 'pause'],
    ]);
    // Roles and the body area only: never the note.
    expect(events[0].title).toBe('something hurts (knee)');
    expect(JSON.stringify(events)).not.toContain(NOTE);
    expect(await pain.spans()).toEqual([{ from: '2026-01-07', to: '2026-01-09' }]);
  });
});

describe('Tapped by mistake (story 104)', () => {
  const NOTE_ID = 'demo-mistake-0001';

  it('keeps the pause: a note for the parent with the role and the time, never a clear (AC2, AC3, AC4)', async () => {
    let now = new Date('2026-01-07T17:00:00Z');
    pain = new PainService({ store: new MemoryPainStore(), audit, notifier, clock: () => now });
    await pain.report(KEEPER, { ...REPORT, bodyArea: 'knee' });
    now = new Date('2026-01-07T17:02:00Z');
    const marked = await pain.markMistake(KEEPER, { id: NOTE_ID, reportId: REPORT.id });
    expect(marked.mistakeAt?.toISOString()).toBe('2026-01-07T17:02:00.000Z');
    // Still paused, and nothing clears it however long it waits.
    now = new Date('2026-03-01T00:00:00Z');
    expect((await pain.status()).paused).toBe(true);
    expect(await pain.isPaused()).toBe(true);
    expect(await notifier.unreadCount('parent')).toBe(1);
    // The keeper still cannot clear it; the parent clears it with one call.
    await expect(pain.clear(KEEPER, '2026-03-01')).rejects.toMatchObject({ code: 'forbidden' });
    await pain.clear(PARENT, '2026-03-01');
    expect((await pain.status()).paused).toBe(false);

    const events = await audit.list();
    expect(events.map((e) => [e.action, e.actorRole, e.title])).toEqual([
      ['paused', 'keeper', 'something hurts (knee)'],
      ['marked', 'keeper', 'something hurts (knee)'],
      ['refused', 'keeper', 'the training pause'],
      ['cleared', 'parent', 'the training pause'],
    ]);
    expect(JSON.stringify(events)).not.toContain(NOTE);
  });

  it('is accepted once per pause; a resend of the same note is stored once and logged once', async () => {
    await pain.report(KEEPER, { ...REPORT, bodyArea: 'knee' });
    await pain.markMistake(KEEPER, { id: NOTE_ID, reportId: REPORT.id });
    await pain.markMistake(KEEPER, { id: NOTE_ID, reportId: REPORT.id });
    await expect(pain.markMistake(KEEPER, { id: 'demo-mistake-0002', reportId: REPORT.id })).rejects.toMatchObject({
      code: 'already_marked',
    });
    const events = await audit.list();
    expect(events.filter((e) => e.action === 'marked')).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({ action: 'refused', actorRole: 'keeper', title: 'a mistake note', itemId: 'training-pause-mistake' });
  });

  it('is refused and logged with no open pause, from the parent, or with a bad id (AC4)', async () => {
    await expect(pain.markMistake(KEEPER, { id: NOTE_ID, reportId: REPORT.id })).rejects.toMatchObject({ code: 'not_paused' });
    await pain.report(KEEPER, { ...REPORT, bodyArea: 'knee' });
    await expect(pain.markMistake(PARENT, { id: NOTE_ID, reportId: REPORT.id })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(pain.markMistake(KEEPER, { id: 'x', reportId: REPORT.id })).rejects.toMatchObject({ code: 'invalid' });
    await expect(pain.markMistake(KEEPER, { id: NOTE_ID, reportId: 'demo-report-9999' })).rejects.toMatchObject({ code: 'not_paused' });
    await pain.clear(PARENT, '2026-01-08');
    // A note queued offline that arrives after the clear is refused: it never marks a later pause.
    await expect(pain.markMistake(KEEPER, { id: NOTE_ID, reportId: REPORT.id })).rejects.toMatchObject({ code: 'not_paused' });
    const refused = (await audit.list()).filter((e) => e.action === 'refused');
    expect(refused.map((e) => [e.actorRole, e.title])).toEqual([
      ['keeper', 'a mistake note'],
      ['parent', 'a mistake note'],
      ['keeper', 'a mistake note'],
      ['keeper', 'a mistake note'],
      ['keeper', 'a mistake note'],
    ]);
    expect((await audit.list()).some((e) => e.action === 'marked')).toBe(false);
  });
});

describe('pain routes', () => {
  let app: FastifyInstance | undefined;
  let logLines: string[];

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function testApp() {
    logLines = [];
    const approvals = new ApprovalService({ store: new MemoryApprovalStore(), audit, notifier });
    const training = new TrainingService({ approvals, content: loadContent() });
    await training.proposeFor('2026-01-05');
    for (const r of await approvals.pending()) await approvals.approve(r.id, PARENT);
    const config: Config = {
      audience: AUDIENCE,
      devMockIdentity: false,
      devMockAccount: '',
      roleSeed: `${KAI}=keeper;${SAM}=parent`,
      roleStore: 'memory',
      port: 0,
      webRoot: '',
      production: false,
    };
    app = await buildApp({
      config,
      verifier: new ProxyJwtVerifier(AUDIENCE, signer.keys),
      approvals,
      training,
      pain,
      logStream: { write: (line) => void logLines.push(line) },
    });
    return app;
  }

  it('pauses training: today offers nothing to train until the parent clears it (AC1, AC3, AC4)', async () => {
    const a = await testApp();
    const before = (await a.inject({ method: 'GET', url: '/api/training/today?date=2026-01-07', headers: as(KAI) })).json();
    expect(before.today).not.toBeNull();
    expect(before.paused).toBe(false);

    const res = await a.inject({ method: 'POST', url: '/api/pain', headers: as(KAI), payload: REPORT });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ paused: true, report: { id: REPORT.id, date: REPORT.date } });

    const paused = (await a.inject({ method: 'GET', url: '/api/training/today?date=2026-01-07', headers: as(KAI) })).json();
    expect(paused).toMatchObject({ paused: true, today: null, lastApproved: null });

    // The keeper's device sees that it is paused, not the report; the parent sees the report.
    const kai = (await a.inject({ method: 'GET', url: '/api/pain/status', headers: as(KAI) })).json();
    expect(kai).toEqual({ paused: true, since: '2026-01-07', reports: [{ id: REPORT.id, date: REPORT.date }] });
    const sam = (await a.inject({ method: 'GET', url: '/api/pain/status', headers: as(SAM) })).json();
    expect(sam.reports[0]).toMatchObject({ bodyArea: 'knee', note: NOTE });

    const refused = await a.inject({ method: 'POST', url: '/api/pain/clear', headers: as(KAI), payload: {} });
    expect(refused.statusCode).toBe(403);
    const cleared = await a.inject({ method: 'POST', url: '/api/pain/clear', headers: as(SAM), payload: { date: '2026-01-08' } });
    expect(cleared.json()).toEqual({ paused: false, cleared: 1 });
    const after = (await a.inject({ method: 'GET', url: '/api/training/today?date=2026-01-08', headers: as(KAI) })).json();
    expect(after.today).not.toBeNull();

    // The audit log both roles read: the report and the clear, with roles and no note or account.
    const events = (await a.inject({ method: 'GET', url: '/api/audit', headers: as(KAI) })).json().events;
    const pauseEvents = events.filter((e: { kind: string }) => e.kind === 'pause');
    expect(pauseEvents.map((e: { action: string; actorRole: string }) => [e.action, e.actorRole])).toEqual([
      ['paused', 'keeper'],
      ['refused', 'keeper'],
      ['cleared', 'parent'],
    ]);
    const text = JSON.stringify(events);
    expect(text).not.toContain(NOTE);
    expect(text).not.toContain(KAI);
    expect(text).not.toContain(SAM);
  });

  it('takes a keeper-only mistake note with no text; the parent sees it and clears with one call (story 104)', async () => {
    const a = await testApp();
    await a.inject({ method: 'POST', url: '/api/pain', headers: as(KAI), payload: REPORT });
    const byParent = await a.inject({ method: 'POST', url: '/api/pain/mistake', headers: as(SAM), payload: { id: 'demo-mistake-0001', reportId: REPORT.id } });
    expect(byParent.statusCode).toBe(403);
    // Any text sent along is never read or stored.
    const res = await a.inject({
      method: 'POST',
      url: '/api/pain/mistake',
      headers: as(KAI),
      payload: { id: 'demo-mistake-0001', reportId: REPORT.id, note: 'zq7-marker free text' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ paused: true, report: { id: REPORT.id, date: REPORT.date, mistake: true } });
    const again = await a.inject({ method: 'POST', url: '/api/pain/mistake', headers: as(KAI), payload: { id: 'demo-mistake-0002', reportId: REPORT.id } });
    expect(again.statusCode).toBe(409);

    const today = (await a.inject({ method: 'GET', url: '/api/training/today?date=2026-01-07', headers: as(KAI) })).json();
    expect(today).toMatchObject({ paused: true, today: null });
    const kai = (await a.inject({ method: 'GET', url: '/api/pain/status', headers: as(KAI) })).json();
    expect(kai.reports).toEqual([{ id: REPORT.id, date: REPORT.date, mistake: true }]);
    const sam = (await a.inject({ method: 'GET', url: '/api/pain/status', headers: as(SAM) })).json();
    expect(sam.reports[0].mistakeAt).toMatch(/^\d{4}-\d\d-\d\dT/);

    const cleared = await a.inject({ method: 'POST', url: '/api/pain/clear', headers: as(SAM), payload: { date: '2026-01-08' } });
    expect(cleared.json()).toEqual({ paused: false, cleared: 1 });
    const late = await a.inject({ method: 'POST', url: '/api/pain/mistake', headers: as(KAI), payload: { id: 'demo-mistake-0003', reportId: REPORT.id } });
    expect(late.statusCode).toBe(409);

    const events = (await a.inject({ method: 'GET', url: '/api/audit', headers: as(KAI) })).json().events;
    const pauseEvents = events.filter((e: { kind: string }) => e.kind === 'pause');
    expect(pauseEvents.map((e: { action: string; actorRole: string }) => [e.action, e.actorRole])).toEqual([
      ['paused', 'keeper'],
      ['refused', 'parent'],
      ['marked', 'keeper'],
      ['refused', 'keeper'],
      ['cleared', 'parent'],
      ['refused', 'keeper'],
    ]);
    const text = JSON.stringify(events) + logLines.join('\n');
    expect(text).not.toContain('zq7-marker');
    expect(text).not.toContain(KAI);
  });

  it('holds every streak through the pause days', async () => {
    const a = await testApp();
    const session = (await a.inject({ method: 'GET', url: '/api/training/today?date=2026-01-06', headers: as(KAI) })).json().today;
    const base = { itemId: session.itemId, itemVersion: session.itemVersion, warmUpLogged: true, praised: [] };
    await a.inject({ method: 'POST', url: '/api/progress/sessions', headers: as(KAI), payload: { ...base, date: '2026-01-06', outcome: 'done' } });
    await a.inject({ method: 'POST', url: '/api/progress/sessions', headers: as(KAI), payload: { ...base, date: '2026-01-07', outcome: 'hurt' } });
    await a.inject({ method: 'POST', url: '/api/pain', headers: as(KAI), payload: REPORT });
    await a.inject({ method: 'POST', url: '/api/pain/clear', headers: as(SAM), payload: { date: '2026-01-11' } });
    // Every day is planned in the starter plan; the four pause days hold the streak.
    const s = (await a.inject({ method: 'GET', url: '/api/progress/summary?date=2026-01-11', headers: as(SAM) })).json();
    expect(s.team).toEqual({ current: 2, best: 2 });
    expect(s.keeper.current).toBe(2);
    expect(s.runs).toEqual([]);
  });

  it('never writes report content to the log, even when a report is refused (AC1)', async () => {
    const a = await testApp();
    await a.inject({ method: 'POST', url: '/api/pain', headers: as(KAI), payload: REPORT });
    await a.inject({ method: 'POST', url: '/api/pain', headers: as(KAI), payload: { ...REPORT, id: 'demo-report-0002', bodyArea: 'elbow' } });
    await a.inject({ method: 'GET', url: '/api/pain/status', headers: as(SAM) });
    await a.inject({ method: 'POST', url: '/api/pain/clear', headers: as(KAI), payload: {} });
    await a.inject({ method: 'POST', url: '/api/pain/clear', headers: as(SAM), payload: {} });

    // The logger is on and sees these requests...
    const log = logLines.join('\n');
    expect(log).toContain('/api/pain');
    // ...but never the note or the body area.
    expect(log).not.toContain('zq7-marker');
    expect(log).not.toContain('side steps');
    expect(log).not.toMatch(/knee|elbow/i);
  });
});
