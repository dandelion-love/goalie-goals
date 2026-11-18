// The session player as a pure state machine, so the flow is testable without timers.
//
// Steps: warm-up moves, then each approved card, then a cool-down. A card runs
// ready -> work (set 1, side 1) -> [work side 2] -> feedback -> rest -> work (set 2) ... ->
// feedback after the last set -> next step. Timers only time work and rest; nothing races the
// clock. The keeper may stop at any time, and "Something hurts" ends the session at once.

import type { Card, Move, Session } from './training';

export type Step =
  | { kind: 'moves'; label: 'Warm-up' | 'Cool-down'; moves: Move[] }
  | { kind: 'card'; card: Card };

export type Phase =
  | { kind: 'move'; index: number }
  | { kind: 'ready' }
  | { kind: 'work'; set: number; side: number; reps: number }
  | { kind: 'feedback'; set: number }
  | { kind: 'rest'; set: number };

export type Outcome = 'done' | 'stopped' | 'hurt';

export interface PlayerState {
  step: number;
  phase: Phase;
  outcome: Outcome | null;
  /** Feedback shown now; it names the cue, never the person. */
  feedback: string | null;
  praised: string[];
  setsDone: number;
  /** The warm-up was logged (or the session has none): the session credit is earned from here. */
  warmUpLogged: boolean;
}

export type Action =
  | { type: 'next' }
  | { type: 'rep' }
  | { type: 'praise'; cue: string }
  | { type: 'stop'; outcome: 'stopped' | 'hurt' };

export function stepsOf(session: Session): Step[] {
  const steps: Step[] = [];
  if (session.warmUp.length) steps.push({ kind: 'moves', label: 'Warm-up', moves: session.warmUp });
  for (const card of session.cards) steps.push({ kind: 'card', card });
  if (session.coolDown.length) steps.push({ kind: 'moves', label: 'Cool-down', moves: session.coolDown });
  return steps;
}

function firstPhase(step: Step): Phase {
  return step.kind === 'moves' ? { kind: 'move', index: 0 } : { kind: 'ready' };
}

export function initialState(steps: Step[]): PlayerState {
  return {
    step: 0,
    phase: steps.length ? firstPhase(steps[0]) : { kind: 'ready' },
    outcome: steps.length ? null : 'done',
    feedback: null,
    praised: [],
    setsDone: 0,
    warmUpLogged: !steps.some((st) => st.kind === 'moves' && st.label === 'Warm-up'),
  };
}

/** The feedback line for a cue: the cue and a word of praise, never a name. */
export function praiseFor(cue: string): string {
  return `${cue}: nice`;
}

/** How many reps make a set's target for counted work; holds are timed instead. */
export function repTarget(card: Card): number {
  return card.dose.kind === 'hold' ? 0 : card.dose.reps ?? 0;
}

function nextStep(steps: Step[], s: PlayerState): PlayerState {
  const leaving = steps[s.step];
  const warmUpLogged = s.warmUpLogged || (leaving.kind === 'moves' && leaving.label === 'Warm-up');
  const step = s.step + 1;
  if (step >= steps.length) return { ...s, warmUpLogged, outcome: 'done', feedback: null };
  return { ...s, warmUpLogged, step, phase: firstPhase(steps[step]), feedback: null };
}

export function reduce(steps: Step[], s: PlayerState, action: Action): PlayerState {
  if (s.outcome) return s;
  if (action.type === 'stop') return { ...s, outcome: action.outcome, feedback: null };
  const step = steps[s.step];
  const p = s.phase;

  if (step.kind === 'moves') {
    if (action.type !== 'next' || p.kind !== 'move') return s;
    return p.index + 1 < step.moves.length ? { ...s, phase: { kind: 'move', index: p.index + 1 } } : nextStep(steps, s);
  }

  const { dose } = step.card;
  switch (p.kind) {
    case 'ready':
      return action.type === 'next' ? { ...s, phase: { kind: 'work', set: 1, side: 1, reps: 0 }, feedback: null } : s;
    case 'work':
      if (action.type === 'rep') {
        const target = repTarget(step.card);
        return target && p.reps < target ? { ...s, phase: { ...p, reps: p.reps + 1 } } : s;
      }
      if (action.type !== 'next') return s;
      if (dose.per_side && p.side === 1) return { ...s, phase: { kind: 'work', set: p.set, side: 2, reps: 0 } };
      return { ...s, phase: { kind: 'feedback', set: p.set }, setsDone: s.setsDone + 1, feedback: null };
    case 'feedback': {
      if (action.type === 'rep') return s;
      const praised = action.type === 'praise' ? { praised: [...s.praised, action.cue], feedback: praiseFor(action.cue) } : { feedback: null };
      if (p.set < dose.sets) return { ...s, ...praised, phase: { kind: 'rest', set: p.set } };
      const moved = nextStep(steps, s);
      return { ...moved, ...praised, outcome: moved.outcome, feedback: praised.feedback };
    }
    case 'rest':
      return action.type === 'next' ? { ...s, phase: { kind: 'work', set: p.set + 1, side: 1, reps: 0 }, feedback: null } : s;
    default:
      return s;
  }
}

/** Short words for where the keeper is, for the path and the header. */
export function stepTitle(step: Step): string {
  return step.kind === 'moves' ? step.label : step.card.name;
}
