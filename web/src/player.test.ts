import { describe, expect, it } from 'vitest';
import { initialState, praiseFor, reduce, stepsOf, type Action, type PlayerState } from './player';
import { BRIDGE, PLANK, demoSession } from './session.fixture';

function run(actions: Action[], session = demoSession()): PlayerState {
  const steps = stepsOf(session);
  return actions.reduce((s, a) => reduce(steps, s, a), initialState(steps));
}

const next: Action = { type: 'next' };
const rep: Action = { type: 'rep' };

describe('session player flow', () => {
  it('orders the steps: warm-up, each approved card, cool-down', () => {
    const steps = stepsOf(demoSession());
    expect(steps.map((s) => (s.kind === 'moves' ? s.label : s.card.id))).toEqual([
      'Warm-up',
      'plank',
      'glute-bridge',
      'Cool-down',
    ]);
  });

  it('logs the warm-up once its last move is done, and never takes it back', () => {
    expect(run([next]).warmUpLogged).toBe(false);
    expect(run([next, next]).warmUpLogged).toBe(true);
    expect(run([next, next, { type: 'stop', outcome: 'hurt' }]).warmUpLogged).toBe(true);
    expect(run([], demoSession({ warmUp: [] })).warmUpLogged).toBe(true);
  });

  it('walks the warm-up moves, then readies the first card', () => {
    expect(run([next]).phase).toEqual({ kind: 'move', index: 1 });
    const s = run([next, next]);
    expect(s.step).toBe(1);
    expect(s.phase).toEqual({ kind: 'ready' });
  });

  it('runs set, feedback, rest, set, feedback for a timed hold, then moves on', () => {
    const warm = [next, next];
    let s = run([...warm, next]);
    expect(s.phase).toEqual({ kind: 'work', set: 1, side: 1, reps: 0 });
    s = run([...warm, next, next]);
    expect(s.phase).toEqual({ kind: 'feedback', set: 1 });
    expect(s.setsDone).toBe(1);
    s = run([...warm, next, next, { type: 'praise', cue: 'Stay board-straight' }]);
    expect(s.phase).toEqual({ kind: 'rest', set: 1 });
    expect(s.feedback).toBe('Stay board-straight: nice');
    s = run([...warm, next, next, next, next, next, next]);
    expect(s.step).toBe(2);
    expect(s.phase).toEqual({ kind: 'ready' });
    expect(s.setsDone).toBe(PLANK.dose.sets);
  });

  it('counts reps up to the target and no further', () => {
    const toBridge = [next, next, next, next, next, next, next, next];
    let s = run([...toBridge, next]);
    expect(s.phase).toMatchObject({ kind: 'work', set: 1 });
    s = run([...toBridge, next, ...Array<Action>(20).fill(rep)]);
    expect(s.phase).toMatchObject({ kind: 'work', reps: BRIDGE.dose.reps });
  });

  it('runs both sides of a per-side card before feedback', () => {
    const perSide = { ...PLANK, id: 'side-plank', dose: { ...PLANK.dose, per_side: true } };
    const session = demoSession({ warmUp: [], cards: [perSide], coolDown: [] });
    expect(run([next, next], session).phase).toEqual({ kind: 'work', set: 1, side: 2, reps: 0 });
    expect(run([next, next, next], session).phase).toEqual({ kind: 'feedback', set: 1 });
  });

  it('finishes after the cool-down with the praised cues for the finish screen', () => {
    const session = demoSession({ warmUp: [], cards: [PLANK], coolDown: [{ name: 'Walk', seconds: 30, cue: 'Slow' }] });
    const s = run([next, next, { type: 'praise', cue: 'Keep breathing' }, next, next, next, next], session);
    expect(s.outcome).toBe('done');
    expect(s.praised).toEqual(['Keep breathing']);
  });

  it('stops at once from any step, and ignores input afterwards', () => {
    const s = run([next, { type: 'stop', outcome: 'hurt' }, next, rep]);
    expect(s.outcome).toBe('hurt');
    expect(s.step).toBe(0);
  });

  // Glute bridge only: Start set 1, then three reps.
  const bridge = () => demoSession({ warmUp: [], coolDown: [], cards: [BRIDGE] });
  const midSet: Action[] = [next, rep, rep, rep];
  const stop: Action = { type: 'stop', outcome: 'stopped' };

  it('Stop ends the set at once: nothing counts or moves on while the stop screen shows', () => {
    const before = run(midSet, bridge());
    const stopped = run([...midSet, stop, rep, next], bridge());
    expect(stopped.stopping).toBe(true);
    expect(stopped.outcome).toBeNull();
    expect(stopped.phase).toEqual({ kind: 'work', set: 1, side: 1, reps: 3 });
    expect(stopped.phase).toEqual(before.phase);
    expect(stopped.setsDone).toBe(before.setsDone);
  });

  it('Resume carries on with the same set; after the Resume window the session is over', () => {
    expect(run([...midSet, stop, { type: 'resume' }], bridge())).toEqual(run(midSet, bridge()));
    expect(run([...midSet, stop, { type: 'resume' }, rep], bridge()).phase).toMatchObject({ set: 1, reps: 4 });

    const over = run([...midSet, stop, { type: 'stop-final' }, { type: 'resume' }, next], bridge());
    expect(over.outcome).toBe('stopped');
    expect(over.stopping).toBe(false);
    // Without a stop, neither a late resume nor a late final does anything.
    expect(run([...midSet, { type: 'stop-final' }, { type: 'resume' }], bridge())).toEqual(run(midSet, bridge()));
  });

  it('Something hurts ends the session at once, even from the stop screen', () => {
    const s = run([next, { type: 'stop', outcome: 'stopped' }, { type: 'stop', outcome: 'hurt' }]);
    expect(s.outcome).toBe('hurt');
    expect(s.stopping).toBe(false);
  });

  it('names the cue in feedback, never the person', () => {
    expect(praiseFor('Knees track over toes')).toBe('Knees track over toes: nice');
  });
});
