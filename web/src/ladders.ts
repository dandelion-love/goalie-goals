// The progression library's rungs (story 114 AC3), as data the keeper's "Your training" reads
// to show each card's next step.
//
// Derived from the progression-library Decision (docs/knowledge/decisions/progression-library.md:
// each rung's id, ladder, rung number and prerequisites) and the ladder concepts
// (docs/knowledge/progression-library/ladders-*.md: each rung's "Unlock at" dose). The names are
// short display names for the rungs those tables describe. ladders.test.ts checks this file
// against both, and that every card in content/exercises is a rung here.
//
// A next rung is a goal, never a promise: it opens only when every rep at the unlock dose is
// clean in two sessions in a row, its prerequisites are met, and the parent approves it in the
// app (docs/knowledge/progression-library/unlock-rules.md). Listing a rung approves nothing.

export interface Rung {
  id: string;
  /** The ladder's pattern, as the Decision names it. */
  ladder: string;
  /** 1 is the easiest. */
  rung: number;
  /** Rungs that must be unlocked first: the one below, and any other ladder's. */
  needs: readonly string[];
  /** A short name for the rung. */
  name: string;
  /** The rung's top dose: clean here in two sessions in a row is the goal for the next rung. */
  unlockAt: string;
}

const r = (id: string, ladder: string, rung: number, needs: string[], name: string, unlockAt: string): Rung => ({
  id,
  ladder,
  rung,
  needs,
  name,
  unlockAt,
});

export const RUNGS: readonly Rung[] = [
  // Strength
  r('squat-to-box', 'Squat', 1, [], 'Squat to box', '2 x 15'),
  r('squat-to-box-pause', 'Squat', 2, ['squat-to-box'], 'Paused box squat', '2 x 15'),
  r('bodyweight-squat', 'Squat', 3, ['squat-to-box-pause'], 'Free squat', '2 x 15'),
  r('band-squat', 'Squat', 4, ['bodyweight-squat'], 'Band squat', '2 x 15'),
  r('glute-bridge', 'Hinge', 1, [], 'Glute bridge', '2 x 15'),
  r('hip-hinge-wall-tap', 'Hinge', 2, ['glute-bridge'], 'Hip hinge wall tap', '2 x 15'),
  r('single-leg-glute-bridge', 'Hinge', 3, ['hip-hinge-wall-tap'], 'One-leg glute bridge', '2 x 15 per side'),
  r('single-leg-hinge-wall', 'Hinge', 4, ['single-leg-glute-bridge'], 'One-leg hinge at a wall', '2 x 15 per side'),
  r('split-squat', 'Single-leg', 1, [], 'Split squat', '2 x 15 per side'),
  r('step-up', 'Single-leg', 2, ['split-squat'], 'Step-up', '2 x 15 per side'),
  r('reverse-lunge', 'Single-leg', 3, ['step-up'], 'Reverse lunge', '2 x 15 per side'),
  r('rear-foot-elevated-split-squat', 'Single-leg', 4, ['reverse-lunge'], 'Raised back-foot split squat', '2 x 15 per side'),
  r('wall-push-up', 'Push', 1, [], 'Wall push-up', '2 x 15'),
  r('step-incline-push-up', 'Push', 2, ['wall-push-up'], 'Step push-up', '2 x 15'),
  r('knee-push-up', 'Push', 3, ['step-incline-push-up'], 'Knee push-up', '2 x 15'),
  r('push-up', 'Push', 4, ['knee-push-up'], 'Push-up', '2 x 15'),
  r('prone-y-t-raise', 'Pull', 1, [], 'Y and T raise', '2 x 15'),
  r('band-pull-apart', 'Pull', 2, ['prone-y-t-raise'], 'Band pull-apart', '2 x 15'),
  r('seated-band-row', 'Pull', 3, ['band-pull-apart'], 'Seated band row', '2 x 15'),
  r('bar-hang', 'Pull', 4, ['seated-band-row'], 'Bar hang', '2 x 30 s'),
  // Trunk
  r('dead-bug', 'Anti-extension', 1, [], 'Dead bug', '2 x 14'),
  r('plank', 'Anti-extension', 2, ['dead-bug'], 'Front plank', '2 x 30 s'),
  r('plank-leg-lift', 'Anti-extension', 3, ['plank'], 'Plank leg lift', '2 x 30 s'),
  r('bird-dog', 'Anti-rotation', 1, [], 'Bird dog', '2 x 14'),
  r('plank-shoulder-tap', 'Anti-rotation', 2, ['bird-dog', 'plank'], 'Plank shoulder tap', '2 x 14'),
  r('kneeling-band-press-out', 'Anti-rotation', 3, ['plank-shoulder-tap'], 'Kneeling band press-out', '2 x 15 per side'),
  r('side-plank-knees', 'Lateral flexion', 1, [], 'Side plank on knees', '2 x 30 s per side'),
  r('side-plank', 'Lateral flexion', 2, ['side-plank-knees'], 'Side plank', '2 x 30 s per side'),
  r('side-plank-hip-raise', 'Lateral flexion', 3, ['side-plank'], 'Side plank hip raise', '2 x 15 per side'),
  // Movement and jumps
  r('side-step', 'Lateral movement', 1, [], 'Side step', '3 x 4'),
  r('lateral-shuffle', 'Lateral movement', 2, ['side-step'], 'Lateral shuffle', '3 x 4'),
  r('shuffle-change', 'Lateral movement', 3, ['lateral-shuffle'], 'Shuffle and change', '3 x 4'),
  r('snap-down', 'Jump and land', 1, [], 'Snap-down', '3 x 6'),
  r('broad-jump-stick', 'Jump and land', 2, ['snap-down'], 'Broad jump with stick landing', '3 x 5'),
  r('squat-jump-stick', 'Jump and land', 3, ['broad-jump-stick', 'bodyweight-squat'], 'Squat jump and stick', '3 x 5'),
  r('lateral-jump-stick', 'Jump and land', 4, ['squat-jump-stick'], 'Side jump and stick', '3 x 4 per side'),
  r('heel-raise', 'Reactive ankle', 1, [], 'Heel raise', '2 x 15'),
  r('pogo-hops', 'Reactive ankle', 2, ['heel-raise'], 'Low pogo hops', '3 x 6'),
  r('line-hops', 'Reactive ankle', 3, ['pogo-hops'], 'Line hops', '3 x 6'),
  // Goalkeeper actions
  r('set-position', 'Set position', 1, [], 'Set position', '2 x 15'),
  r('set-from-walk', 'Set position', 2, ['set-position'], 'Set from a walk', '2 x 15'),
  r('set-and-step', 'Set position', 3, ['set-from-walk', 'side-step'], 'Set and step', '2 x 14'),
  r('quick-feet-set', 'Footwork', 1, ['set-position'], 'Quick feet to set', '3 x 4'),
  r('shuffle-to-set', 'Footwork', 2, ['quick-feet-set', 'lateral-shuffle'], 'Shuffle to set', '3 x 4'),
  r('drop-step-shuffle', 'Footwork', 3, ['shuffle-to-set'], 'Drop step and shuffle', '3 x 4'),
  r('kneeling-side-fall', 'Collapse and low dive', 1, ['side-plank-knees'], 'Kneeling side fall', '3 x 3 per side'),
  r('kneeling-collapse-to-ball', 'Collapse and low dive', 2, ['kneeling-side-fall'], 'Kneeling collapse to ball', '3 x 3 per side'),
  r('crouch-collapse', 'Collapse and low dive', 3, ['kneeling-collapse-to-ball'], 'Crouch collapse', '3 x 3 per side'),
  r('standing-collapse', 'Collapse and low dive', 4, ['crouch-collapse', 'set-position'], 'Standing collapse', '3 x 3 per side'),
  r('step-low-dive', 'Collapse and low dive', 5, ['standing-collapse', 'set-and-step'], 'Step and low dive', '3 x 3 per side'),
  r('head-height-catch', 'High catch', 1, [], 'Head-height catch', '2 x 15'),
  r('overhead-catch', 'High catch', 2, ['head-height-catch'], 'Overhead catch', '2 x 15'),
  r('jump-catch-stick', 'High catch', 3, ['overhead-catch', 'squat-jump-stick'], 'Jump catch and stick', '3 x 3 per side'),
  r('wall-chest-pass', 'Punch', 1, [], 'Wall chest pass', '2 x 15'),
  r('punch-shape', 'Punch', 2, ['wall-chest-pass'], 'Punch shape', '2 x 15'),
  r('two-fist-punch', 'Punch', 3, ['punch-shape', 'head-height-catch'], 'Two-fist punch', '3 x 6'),
];

const BY_ID = new Map(RUNGS.map((x) => [x.id, x]));

export function rungFor(id: string): Rung | undefined {
  return BY_ID.get(id);
}

/** "2 x 15 per side" as the app writes a dose: "2 sets of 15 per side". */
export function doseWords(dose: string): string {
  return dose.replace(/^(\d+) x /, '$1 sets of ');
}

export type NextStep =
  | {
      kind: 'next';
      /** The next rung's name. */
      name: string;
      /** The goal on this card that the next rung asks for. */
      goal: string;
      /** Other ladders' rungs the next one also needs, by name. */
      alsoNeeds: string[];
    }
  | { kind: 'top' };

/** A card's next step on its ladder, or the top of it; undefined for a card on no ladder. */
export function nextStep(cardId: string): NextStep | undefined {
  const here = BY_ID.get(cardId);
  if (!here) return undefined;
  const next = RUNGS.find((x) => x.ladder === here.ladder && x.rung === here.rung + 1);
  if (!next) return { kind: 'top' };
  return {
    kind: 'next',
    name: next.name,
    goal: doseWords(here.unlockAt),
    alsoNeeds: next.needs.filter((id) => id !== here.id).map((id) => BY_ID.get(id)?.name ?? id),
  };
}
