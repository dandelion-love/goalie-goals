import { describe, expect, it } from 'vitest';
import type { HistoryRecord } from '../src/history.js';
import { evaluateSquatDoseReadiness, evaluateSquatReadiness, type ReadinessFacts } from '../src/squatReadiness.js';
const facts: ReadinessFacts = { orderedHistoryComplete: true, safety: { pain: 'clear', growth: 'clear', breakRestart: 'clear', stepDown: 'clear' }, approvedCardVersions: new Set(['approved']) };
function session(id: string, reps = 15, clean = true): HistoryRecord {
  const date = id === 'first' || id === 'legacy' ? '2026-01-01' : id === 'third' ? '2026-01-05' : '2026-01-03';
  return { id, instanceId: `instance-${id}`, date, itemId: 'session', itemVersion: 'session-v1', title: 'Session', outcome: 'done', at: new Date(`${date}T00:00:00Z`), cards: [{ cardId: 'squat-to-box', itemVersion: 'approved', name: 'Squat to box', setsDone: 2, setsPlanned: 2, dose: { kind: 'reps', reps, perSide: false }, cueIds: [], squatSets: [{ actualReps: reps, clean, revision: 1 }, { actualReps: reps, clean, revision: 1 }] }] };
}
describe('squat readiness from verified facts', () => {
  it('checks the exact approved source dose for an individual step', () => {
    const pair = [session('first', 10), session('second', 10)];
    expect(evaluateSquatDoseReadiness(pair, facts, { reps: 10, version: 'approved' })).toBe('ready-for-parent');
    expect(evaluateSquatDoseReadiness(pair, facts, { reps: 10 })).toBe('unknown');
    expect(evaluateSquatDoseReadiness(pair, facts, { reps: 10, version: 'other' })).toBe('unknown');
    expect(evaluateSquatDoseReadiness(pair, facts, { reps: 11, version: 'approved' })).toBe('unknown');
  });
  it('refuses repeated same-day and consecutive-day squat sessions', () => {
    const first = session('first'), second = session('second');
    second.date = first.date;
    expect(evaluateSquatReadiness([first, second], facts)).toBe('unknown');
    second.date = '2026-01-02';
    expect(evaluateSquatReadiness([first, second], facts)).toBe('unknown');
  });
  it('counts two qualifying sessions, ignoring sessions without the exercise', () => {
    const other = { ...session('other'), cards: [] };
    expect(evaluateSquatReadiness([session('first'), other, session('second')], facts)).toBe('ready-for-parent');
    const notPerformed = session('skipped'); notPerformed.cards[0].setsDone = 0;
    expect(evaluateSquatReadiness([session('first'), notPerformed, session('second')], facts)).toBe('unknown');
    expect(evaluateSquatReadiness([session('first'), other], facts)).toBe('one-qualifying');
  });
  it('fails closed for missing order, safety, approval or confirmation', () => {
    const pair = [session('first'), session('second')];
    expect(evaluateSquatReadiness(pair, { ...facts, orderedHistoryComplete: false })).toBe('unknown');
    expect(evaluateSquatReadiness(pair, { ...facts, safety: { ...facts.safety, growth: 'unknown' } })).toBe('unknown');
    expect(evaluateSquatReadiness(pair, { ...facts, safety: { ...facts.safety, breakRestart: 'unknown' } })).toBe('unknown');
    expect(evaluateSquatReadiness(pair, { ...facts, safety: { ...facts.safety, stepDown: 'unknown' } })).toBe('unknown');
    expect(evaluateSquatReadiness(pair, { ...facts, safety: { ...facts.safety, pain: 'held' } })).toBe('held');
    expect(evaluateSquatReadiness(pair, { ...facts, approvedCardVersions: new Set() })).toBe('unknown');
    pair[1].cards[0].squatSets = [];
    expect(evaluateSquatReadiness(pair, facts)).toBe('unknown');
  });
  it('does not count the starting dose, unclean sessions or duplicate records', () => {
    expect(evaluateSquatReadiness([session('first', 10), session('second', 10)], facts)).toBe('unknown');
    expect(evaluateSquatReadiness([session('first', 16), session('second', 16)], facts)).toBe('unknown');
    const extraSet = session('extra'); extraSet.cards[0].setsPlanned = 3; extraSet.cards[0].setsDone = 3; extraSet.cards[0].squatSets!.push({ actualReps: 15, clean: true, revision: 1 });
    expect(evaluateSquatReadiness([session('first'), extraSet], facts)).toBe('unknown');
    expect(evaluateSquatReadiness([session('first'), session('second', 15, false), session('third')], facts)).toBe('one-qualifying');
    const partial = session('partial', 20); partial.cards[0].squatSets![0]!.actualReps = 15;
    expect(evaluateSquatReadiness([session('first'), partial], facts)).toBe('unknown');
    expect(evaluateSquatReadiness([session('first'), session('first')], facts)).toBe('unknown');
    const duplicateInstance = session('second'); duplicateInstance.instanceId = 'instance-first';
    expect(evaluateSquatReadiness([session('first'), duplicateInstance], facts)).toBe('unknown');
    const legacy = session('legacy'); delete legacy.instanceId;
    expect(evaluateSquatReadiness([legacy, session('second')], facts)).toBe('unknown');
  });
});
