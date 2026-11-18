---
type: Research Finding
title: Strength ladders - squat, hinge, single-leg, push and pull
description: Four-rung ladders for the five strength patterns with household equipment only, each rung with its starting dose inside the training rules, its source, the cues a parent can check, its unlock dose and where it steps down to.
tags: [progression-library, strength, squat, hinge, single-leg, push, pull, youth]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T07:30:00Z }
sources:
  - { id: nsca-2009, resource: https://pubmed.ncbi.nlm.nih.gov/19620931/, title: "Faigenbaum et al. Youth resistance training: updated position statement paper from the NSCA (J Strength Cond Res, 2009)" }
  - { id: soligard-2008, resource: https://pubmed.ncbi.nlm.nih.gov/19066253/, title: "Soligard et al. Comprehensive warm-up programme to prevent injuries in young female footballers: cluster randomised controlled trial (BMJ, 2008)" }
  - { id: bizzini-2015, resource: https://pubmed.ncbi.nlm.nih.gov/25878073/, title: "Bizzini and Dvorak. FIFA 11+: an effective programme to prevent football injuries in various player groups worldwide, a narrative review (Br J Sports Med, 2015)" }
  - { id: lopes-2019, resource: https://pubmed.ncbi.nlm.nih.gov/30815258/, title: "Lopes et al. Effects of training with elastic resistance versus conventional resistance on muscular strength: systematic review and meta-analysis (SAGE Open Med, 2019)" }
  - { id: aap-2020-parents, resource: https://www.healthychildren.org/English/news/Pages/Guidance-on-Resistance-Training-for-Children.aspx, title: "AAP (HealthyChildren.org). Guidance on resistance training for children" }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
  - { id: equipment-model, resource: /decisions/equipment-model.md, title: Equipment model }
  - { id: home-equipment, resource: /equipment/home-equipment.md, title: Cheap home equipment that adds most }
  - { id: substitutions, resource: /equipment/substitutions.md, title: Substitutions }
  - { id: unlock, resource: /progression-library/unlock-rules.md, title: Unlock rules for the progression library }
---

# How to read the tables

- **Starting dose** is the dose a rung starts at the first time it is unlocked. Every
  rung is a new exercise, so a repetition rung starts at 1 to 2 sets of 10 to 15 with no
  added load, or the lightest band (rule 2), and a hold starts at 10 to 20 s for 1 to 2
  sets.[^training-rules] Rest follows the existing cards: 45 to 60 s.
- **Clean cues** are what the parent checks on every repetition, from the position the
  card names. Each passed the cue test in the [unlock rules](/progression-library/unlock-rules.md):
  seen from where the parent stands, slow or frozen enough to see, and a plain yes or
  no.[^unlock]
- **Unlock at** is the top dose of the rung. The next rung unlocks only when every
  repetition at that dose was clean in two sessions in a row, recorded by the parent, and
  then the parent approves the change in the app. The steps inside a rung, and the
  approval, follow the [unlock rules](/progression-library/unlock-rules.md).[^unlock][^training-rules]
- **Step down to** is where the keeper goes when a rung stops being clean (the rules for
  when are in the unlock-rules concept). Rung 1 steps down to its card's `easier` variant.
- Existing cards are marked *(card)*; every other rung is a new card still to be specified
  and approved.
- The NSCA asks for relatively simple exercises and light loads first, then harder
  multi-joint movements;[^nsca-2009] FIFA 11+ arranges squats and lunges, tested with
  teenage players, as levels of the same pattern.[^soligard-2008][^bizzini-2015] Bands
  give a measured step when bodyweight is no longer enough.[^lopes-2019] The exact order
  of rungs inside a ladder is a cautious reading of these sources, not a tested sequence.

# Squat (`sq`)

| # | Rung id | Rung | Equipment | Starting dose | Clean cues (parent, side-on) | Source | Unlock at | Step down to |
|---|---|---|---|---|---|---|---|---|
| 1 | `squat-to-box` *(card)* | Sit back to touch a low box and stand | `body only`, `other:step` | reps, 2 x 10, rest 60 s | Knees over the toes on every rep; heels stay down; touches the box lightly, no drop | NSCA simple first[^nsca-2009] | 2 x 15 | Card's `easier` (half range) |
| 2 | `squat-to-box-pause` | As rung 1, stopping 2 s just above the box | `body only`, `other:step` | reps, 2 x 10, rest 60 s | The pause is still, no bounce; knees over the toes; heels stay down | Variant step before load[^nsca-2009][^training-rules] | 2 x 15 | `squat-to-box` |
| 3 | `bodyweight-squat` | Free squat, no box, as low as the heels stay down | `body only` | reps, 2 x 10, rest 60 s | Heels stay down; knees over the toes; the shirt's front faces forward, not the floor | FIFA 11+ squat levels[^soligard-2008] | 2 x 15 | `squat-to-box-pause` |
| 4 | `band-squat` | Squat with the lightest band under both feet, ends held at the shoulders | `bands` (lightest) | reps, 2 x 10, rest 60 s | As rung 3, and the band stays under the middle of both feet | Bands for measured load;[^lopes-2019] lightest band first[^training-rules] | 2 x 15, then one band step at a time | `bodyweight-squat` |

# Hinge (`hg`)

| # | Rung id | Rung | Equipment | Starting dose | Clean cues (parent, side-on) | Source | Unlock at | Step down to |
|---|---|---|---|---|---|---|---|---|
| 1 | `glute-bridge` *(card)* | Lift the hips from lying on the back | `body only` | reps, 2 x 12, rest 45 s | Straight line shoulder to knee at the top; lowers slowly, no drop; knees stay hip width | NSCA bodyweight modes[^nsca-2009] | 2 x 15 | Card's `easier` (half lift) |
| 2 | `hip-hinge-wall-tap` | Stand a foot length from a wall, push the hips back to touch it, stand tall | `body only`, `other:wall` | reps, 2 x 10, rest 60 s | The bottom touches the wall on each rep; shins stay nearly upright; from the side the back looks flat like a table, not curved like a C | Simple pattern before harder ones[^nsca-2009] | 2 x 15 | `glute-bridge` |
| 3 | `single-leg-glute-bridge` | Bridge on one leg, the other knee held to the chest | `body only` | reps, 2 x 10 per side, rest 60 s | Both hip bones at the same height at the top (parent at the feet); straight line shoulder to knee; lowers slowly | NSCA progression to harder variants[^nsca-2009] | 2 x 15 per side | `hip-hinge-wall-tap` |
| 4 | `single-leg-hinge-wall` | Stand on one leg, fingertips on a wall, tip forward as the free leg goes back, return | `body only`, `other:wall` | reps, 2 x 10 per side, rest 60 s | Free leg and back move as one straight line; the belly button keeps facing the floor (no hip opening); the free foot does not touch down mid-rep | NSCA progression to harder variants[^nsca-2009] | 2 x 15 per side | `single-leg-glute-bridge` |

Not in the ladder: hamstring lowering (Nordic curls), which needs the parent pinning the
ankles and is a hard eccentric effort; it waits for an owner decision.

# Single-leg (`sl`)

| # | Rung id | Rung | Equipment | Starting dose | Clean cues (parent, side-on) | Source | Unlock at | Step down to |
|---|---|---|---|---|---|---|---|---|
| 1 | `split-squat` *(card)* | Static lunge, straight down and up | `body only` | reps, 2 x 10 per side, rest 60 s | Front knee over the foot; body upright; same clean reps on both legs | FIFA 11+ lunge levels[^soligard-2008] | 2 x 15 per side | Card's `easier` (short range, hand on wall) |
| 2 | `step-up` | Step up onto a low step and stand tall, step down slowly | `body only`, `other:step` | reps, 2 x 10 per side, rest 60 s | Whole foot on the step; knee over the toes; the lower foot does not bounce off the floor to help | Step-ups as a home option[^home-equipment] | 2 x 15 per side | `split-squat` |
| 3 | `reverse-lunge` | Step back into a lunge and return to standing | `body only` | reps, 2 x 10 per side, rest 60 s | The back foot lands quietly; front knee over the foot; body upright; back knee stops above the floor | FIFA 11+ lunge levels[^soligard-2008] | 2 x 15 per side | `step-up` |
| 4 | `rear-foot-elevated-split-squat` | Split squat with the back foot's laces on a low step | `body only`, `other:step` | reps, 2 x 10 per side, rest 60 s | Front knee over the foot; body upright; balance held for the whole set (no hopping to recover) | FIFA 11+ level 3 one-leg squats, made steadier;[^soligard-2008] cautious reading[^nsca-2009] | 2 x 15 per side | `reverse-lunge` |

# Push (`pu`)

| # | Rung id | Rung | Equipment | Starting dose | Clean cues (parent, side-on) | Source | Unlock at | Step down to |
|---|---|---|---|---|---|---|---|---|
| 1 | `wall-push-up` *(card)* | Push-up leaning on a wall | `body only`, `other:wall` | reps, 2 x 10, rest 60 s | Straight line head to heels; elbows angle back; full push to straight arms | Push-up variations[^nsca-2009][^aap-2020-parents] | 2 x 15 | Card's `easier` (closer to the wall) |
| 2 | `step-incline-push-up` | Hands on a stable step or the bottom stair, feet back | `body only`, `other:step` | reps, 2 x 10, rest 60 s | Straight line head to heels; chest comes within a fist of the step; arms straighten fully | Push-up variations[^nsca-2009] | 2 x 15 | `wall-push-up` |
| 3 | `knee-push-up` | Push-up on the floor from the knees | `body only` | reps, 2 x 10, rest 60 s | Straight line shoulder to knee; chest within a fist of the floor; elbows angle back | Push-up variations[^nsca-2009] | 2 x 15 | `step-incline-push-up` |
| 4 | `push-up` | Full push-up on the floor | `body only` | reps, 1 x 10, rest 60 s | Straight line head to heels, hips never sag; chest within a fist of the floor; arms straighten fully | Push-up variations[^nsca-2009][^aap-2020-parents] | 2 x 15 | `knee-push-up` |

# Pull (`pl`)

| # | Rung id | Rung | Equipment | Starting dose | Clean cues (parent, side-on) | Source | Unlock at | Step down to |
|---|---|---|---|---|---|---|---|---|
| 1 | `prone-y-t-raise` | Lying face down, lift the straight arms in a Y, then a T, thumbs up, hold 2 s | `body only` | reps, 2 x 10 (Y and T count as one), rest 45 s | The 2 s hold is still; the chest stays on the floor (no back arch); the nose stays just off the floor, looking down | All major muscle groups, simple first[^nsca-2009] | 2 x 15 | Smaller lift, arms lower |
| 2 | `band-pull-apart` | Stand, arms straight in front, pull the lightest band apart to the chest | `bands` (lightest) | reps, 2 x 12, rest 45 s | Arms stay straight; the band reaches the chest; it goes back slowly (count of 2); the shoulders stay away from the ears | Bands for measured load[^lopes-2019] | 2 x 15 | `prone-y-t-raise` |
| 3 | `seated-band-row` | Sit tall, legs straight, band looped around the feet; pull the elbows back past the body | `bands` (lightest) | reps, 2 x 10, rest 60 s | The upper body stays still and upright (no leaning back); elbows pass the body; slow return | Band rows replace a bar[^substitutions][^lopes-2019] | 2 x 15, then one band step | `band-pull-apart` |
| 4 | `bar-hang` | Hang from a fixed, rated pull-up bar, feet able to touch the floor | `Pull-up bar` | hold, 2 x 10 s, rest 45 s | The neck stays visible (shoulders pulled away from the ears); no swinging; steps down, never drops | Hold limits;[^training-rules] fixed bar only[^home-equipment] | 2 x 30 s (hold limits) | `seated-band-row` |

**Rejected pull options.** Rows under a table, rows from a door frame and towel rows round
a door handle all use furniture or a door as the anchor. The equipment model never uses an
improvised object, and the home-equipment research rejects door-frame bars that can
slip.[^equipment-model][^home-equipment][^substitutions] They are not rungs. Without bands
or a fixed bar, the pull ladder stops at rung 1, which needs nothing.

[^nsca-2009]: NSCA youth resistance training position statement, 2009
[^soligard-2008]: Soligard et al., FIFA 11+ randomised trial in youth football, 2008
[^bizzini-2015]: Bizzini and Dvorak, narrative review of FIFA 11+, 2015
[^lopes-2019]: Lopes et al., meta-analysis of elastic versus conventional resistance, 2019
[^aap-2020-parents]: AAP parent guidance on resistance training
[^training-rules]: Training rules Decision (this bundle)
[^equipment-model]: Equipment model Decision (this bundle)
[^home-equipment]: Cheap home equipment that adds most (this bundle)
[^substitutions]: Substitutions (this bundle)
[^unlock]: Unlock rules for the progression library (this bundle)
