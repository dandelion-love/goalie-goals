---
type: Decision
title: Progression library to build
description: Every rung's id, pattern, rung number and prerequisite - 56 rungs in 16 ladders, 9 of them existing cards - each still needing its own acceptance spec and the owner's in-app approval.
tags: [decision, progression-library, ladders, unlock, exercise-card]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T07:30:00Z }
sources:
  - { id: patterns, resource: /progression-library/movement-patterns.md, title: Movement patterns for a young keeper's progression library }
  - { id: strength, resource: /progression-library/ladders-strength.md, title: Strength ladders }
  - { id: trunk, resource: /progression-library/ladders-trunk.md, title: Trunk ladders }
  - { id: movement, resource: /progression-library/ladders-movement-and-jumps.md, title: Movement and jump ladders }
  - { id: goalkeeper, resource: /progression-library/ladders-goalkeeper.md, title: Goalkeeper ladders }
  - { id: unlock, resource: /progression-library/unlock-rules.md, title: Unlock rules for the progression library }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
  - { id: equipment-model, resource: /decisions/equipment-model.md, title: Equipment model }
  - { id: dossier, resource: /decisions/exercise-dossier.md, title: Exercise dossier content model }
  - { id: parent-approval, resource: /decisions/parent-approval.md, title: Parent approval as a primary behaviour }
---

# Context

Nine cards cannot carry months of training; the progression-library epic asks for ladders
from basic to harder that unlock by the training rules. The research defines sixteen
ladders,[^patterns] their rungs with doses, sources and parent-checkable cues,[^strength][^trunk][^movement][^goalkeeper]
and the unlock and step-down rules.[^unlock] This Decision fixes the list to build. It
changes no code and approves no exercise.

# Decision

1. The library is the 56 rungs below, in 16 ladders. The 9 existing cards keep their ids
   and become rung 1 or 2 of their ladder; 47 rungs are new.
2. **Listing a rung here does not approve it.** Each rung is a behavioural story: it needs
   its own card, its own acceptance spec citing the training rules, a figure and a dossier,
   and the owner's approval in the app before the app may schedule it.[^training-rules][^dossier][^parent-approval]
   The domain rule that the owner approves every exercise the app prescribes stands.
3. A rung unlocks only by the [unlock rules](/progression-library/unlock-rules.md): clean
   repetitions at its top dose in two sessions in a row, its prerequisites met, then the
   parent's approval in the app as the last step.[^unlock]
4. A rung whose clean cues fail the cue test when its spec is written is reworded, split
   or dropped, and this table is updated in the same change.[^unlock]
5. A rung that needs equipment or a surface the household profile lacks is left out, with
   no improvised substitute.[^equipment-model]
6. Build stories go one ladder at a time, lower rungs first. When a ladder is built, the
   existing card's `harder` text is aligned with the next rung.
7. Rung ids are reserved now; a build story may rename only with this table.

# The library

Prerequisite is the rung that must be unlocked and clean first; "and" adds a cross-ladder
prerequisite. "Needs" lists what goes beyond the default "bodyweight and home" profile
(`body only`, a ball, a wall and a step on a hard floor).[^equipment-model]

## Strength

| Id | Pattern | Rung | Prerequisite | Needs | Card |
|---|---|---|---|---|---|
| `squat-to-box` | Squat | 1 | None | - | Existing |
| `squat-to-box-pause` | Squat | 2 | `squat-to-box` | - | New |
| `bodyweight-squat` | Squat | 3 | `squat-to-box-pause` | - | New |
| `band-squat` | Squat | 4 | `bodyweight-squat` | `bands` | New |
| `glute-bridge` | Hinge | 1 | None | - | Existing |
| `hip-hinge-wall-tap` | Hinge | 2 | `glute-bridge` | - | New |
| `single-leg-glute-bridge` | Hinge | 3 | `hip-hinge-wall-tap` | - | New |
| `single-leg-hinge-wall` | Hinge | 4 | `single-leg-glute-bridge` | - | New |
| `split-squat` | Single-leg | 1 | None | - | Existing |
| `step-up` | Single-leg | 2 | `split-squat` | - | New |
| `reverse-lunge` | Single-leg | 3 | `step-up` | - | New |
| `rear-foot-elevated-split-squat` | Single-leg | 4 | `reverse-lunge` | - | New |
| `wall-push-up` | Push | 1 | None | - | Existing |
| `step-incline-push-up` | Push | 2 | `wall-push-up` | - | New |
| `knee-push-up` | Push | 3 | `step-incline-push-up` | - | New |
| `push-up` | Push | 4 | `knee-push-up` | - | New |
| `prone-y-t-raise` | Pull | 1 | None | - | New |
| `band-pull-apart` | Pull | 2 | `prone-y-t-raise` | `bands` | New |
| `seated-band-row` | Pull | 3 | `band-pull-apart` | `bands` | New |
| `bar-hang` | Pull | 4 | `seated-band-row` | `Pull-up bar` (fixed, rated) | New |

## Trunk

| Id | Pattern | Rung | Prerequisite | Needs | Card |
|---|---|---|---|---|---|
| `dead-bug` | Anti-extension | 1 | None | - | New |
| `plank` | Anti-extension | 2 | `dead-bug` | - | Existing |
| `plank-leg-lift` | Anti-extension | 3 | `plank` | - | New |
| `bird-dog` | Anti-rotation | 1 | None | - | New |
| `plank-shoulder-tap` | Anti-rotation | 2 | `bird-dog` and `plank` | - | New |
| `kneeling-band-press-out` | Anti-rotation | 3 | `plank-shoulder-tap` | `bands`, the parent holding the band | New |
| `side-plank-knees` | Lateral flexion | 1 | None | - | New |
| `side-plank` | Lateral flexion | 2 | `side-plank-knees` | - | Existing |
| `side-plank-hip-raise` | Lateral flexion | 3 | `side-plank` | - | New |

## Movement and jumps

| Id | Pattern | Rung | Prerequisite | Needs | Card |
|---|---|---|---|---|---|
| `side-step` | Lateral movement | 1 | None | - | New |
| `lateral-shuffle` | Lateral movement | 2 | `side-step` | - | Existing |
| `shuffle-change` | Lateral movement | 3 | `lateral-shuffle` | - | New |
| `snap-down` | Jump and land | 1 | None | - | New |
| `broad-jump-stick` | Jump and land | 2 | `snap-down` | - | Existing |
| `squat-jump-stick` | Jump and land | 3 | `broad-jump-stick` and `bodyweight-squat` | - | New |
| `lateral-jump-stick` | Jump and land | 4 | `squat-jump-stick` | - | New |
| `heel-raise` | Reactive ankle | 1 | None | - | New |
| `pogo-hops` | Reactive ankle | 2 | `heel-raise` | - | Existing |
| `line-hops` | Reactive ankle | 3 | `pogo-hops` | - | New |

## Goalkeeper actions

| Id | Pattern | Rung | Prerequisite | Needs | Card |
|---|---|---|---|---|---|
| `set-position` | Set position | 1 | None | - | New |
| `set-from-walk` | Set position | 2 | `set-position` | - | New |
| `set-and-step` | Set position | 3 | `set-from-walk` and `side-step` | - | New |
| `quick-feet-set` | Footwork | 1 | `set-position` | - | New |
| `shuffle-to-set` | Footwork | 2 | `quick-feet-set` and `lateral-shuffle` | - | New |
| `drop-step-shuffle` | Footwork | 3 | `shuffle-to-set` | - | New |
| `kneeling-side-fall` | Collapse and low dive | 1 | `side-plank-knees` | `Gym mat` or grass | New |
| `kneeling-collapse-to-ball` | Collapse and low dive | 2 | `kneeling-side-fall` | `Gym mat` or grass | New |
| `crouch-collapse` | Collapse and low dive | 3 | `kneeling-collapse-to-ball` | `Gym mat` or grass | New |
| `standing-collapse` | Collapse and low dive | 4 | `crouch-collapse` and `set-position` | `Gym mat` or grass | New |
| `step-low-dive` | Collapse and low dive | 5 | `standing-collapse` and `set-and-step` | `Gym mat` or grass | New |
| `head-height-catch` | High catch | 1 | None | Gloves, the parent tossing | New |
| `overhead-catch` | High catch | 2 | `head-height-catch` | Gloves, the parent tossing | New |
| `jump-catch-stick` | High catch | 3 | `overhead-catch` and `squat-jump-stick` | Gloves, the parent tossing, `Gym mat` or grass | New |
| `wall-chest-pass` | Punch | 1 | None | - | New |
| `punch-shape` | Punch | 2 | `wall-chest-pass` | - | New |
| `two-fist-punch` | Punch | 3 | `punch-shape` and `head-height-catch` | Gloves, the parent tossing | New |

# Counts

| Ladder group | Ladders | Rungs | Existing | New |
|---|---|---|---|---|
| Strength | 5 | 20 | 4 | 16 |
| Trunk | 3 | 9 | 2 | 7 |
| Movement and jumps | 3 | 10 | 3 | 7 |
| Goalkeeper actions | 5 | 17 | 0 | 17 |
| **Total** | **16** | **56** | **9** | **47** |

The epic expected 30 to 40 cards. Sixteen ladders of at least three rungs need at least
48, so the library is larger; it is built ladder by ladder and each ladder ships on its own.

# Consequences

- The rotation and unlock engine story implements the unlock rules and reads this table
  for prerequisites.
- With the default profile, the dive ladder, `jump-catch-stick` and the band and bar rungs
  stay locked and are shown as "needs a mat or grass", "needs bands" or "needs a fixed bar".
- Goalkeeper gloves are not in the equipment vocabulary yet; the build story for the first
  catching or punching rung adds them, or records them as a setup note.
- Waiting for an owner decision: hamstring lowering (Nordic curls) and single-leg hops to
  a stick. Rejected outright: any pull rung anchored to furniture or a door (table rows,
  door-frame or towel rows).

[^patterns]: Movement patterns (this bundle)
[^strength]: Strength ladders (this bundle)
[^trunk]: Trunk ladders (this bundle)
[^movement]: Movement and jump ladders (this bundle)
[^goalkeeper]: Goalkeeper ladders (this bundle)
[^unlock]: Unlock rules (this bundle)
[^training-rules]: Training rules Decision (this bundle)
[^equipment-model]: Equipment model Decision (this bundle)
[^dossier]: Exercise dossier content model Decision (this bundle)
[^parent-approval]: Parent approval Decision (this bundle)
