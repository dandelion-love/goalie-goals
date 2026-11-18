---
type: Research Finding
title: Trunk ladders - anti-extension, anti-rotation and lateral flexion
description: Three-rung ladders for the trunk patterns with household equipment only, each rung with its starting dose inside the training rules and their hold limits, its source, the cues a parent can check, its unlock dose and where it steps down to.
tags: [progression-library, trunk, plank, side-plank, anti-rotation, youth]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T07:30:00Z }
sources:
  - { id: nsca-2009, resource: https://pubmed.ncbi.nlm.nih.gov/19620931/, title: "Faigenbaum et al. Youth resistance training: updated position statement paper from the NSCA (J Strength Cond Res, 2009)" }
  - { id: soligard-2008, resource: https://pubmed.ncbi.nlm.nih.gov/19066253/, title: "Soligard et al. Comprehensive warm-up programme to prevent injuries in young female footballers: cluster randomised controlled trial (BMJ, 2008)" }
  - { id: fifa-core-2025, resource: https://www.fifatrainingcentre.com/en/practice/training-perspectives/athleticism-for-young-players/athleticism-for-young-players-core-strength.php, title: "FIFA Training Centre. Athleticism for young players: core strength (2025)" }
  - { id: mcgill-2010, resource: https://www.ovid.com/00126548-201006000-00004, title: "McGill. Core training: evidence translating to better performance and injury prevention (Strength Cond J, 2010)" }
  - { id: lopes-2019, resource: https://pubmed.ncbi.nlm.nih.gov/30815258/, title: "Lopes et al. Effects of training with elastic resistance versus conventional resistance on muscular strength: systematic review and meta-analysis (SAGE Open Med, 2019)" }
  - { id: gk-power, resource: /training/goalkeeper-power.md, title: Goalkeeper-specific power }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
  - { id: unlock, resource: /progression-library/unlock-rules.md, title: Unlock rules for the progression library }
---

# How to read the tables

The columns mean what they mean in the [strength ladders](/progression-library/ladders-strength.md).
Holds follow the training rules' hold limits: 1 to 2 sets, a 10 to 20 s start, steps of at
most 5 s, never past 30 s, at least 30 s rest; past 30 s the only way on is the next rung,
never a longer hold.[^training-rules] FIFA 11+ moves the plank and the side plank on by
level at the same hold time, which is the model here;[^soligard-2008] FIFA's youth core
guidance gives the 10 to 30 s range,[^fifa-core-2025] and McGill builds endurance with
repetitions rather than longer holds.[^mcgill-2010] Planks, side planks, anti-rotation
holds and dead bugs are the trunk means the goalkeeper research names.[^gk-power][^nsca-2009]
A hold ends when the position breaks, and a break is an unclean repetition.[^unlock]

# Anti-extension (`ae`)

| # | Rung id | Rung | Equipment | Starting dose | Clean cues (parent, side-on) | Source | Unlock at | Step down to |
|---|---|---|---|---|---|---|---|---|
| 1 | `dead-bug` | Lying on the back, arms up and knees over the hips; slowly lower the opposite arm and leg, return, switch | `body only` | reps, 2 x 10 (alternating), rest 45 s | No gap the parent can see between the lower back and the floor; each lowering takes a slow count of 3; breathing keeps going | Dead bugs as youth trunk work[^gk-power] | 2 x 14 | Smaller reach, leg only |
| 2 | `plank` *(card)* | Forearm plank | `body only` | hold, 2 x 20 s, rest 45 s | Straight line shoulder to ankle; hips do not sag or pike; steady breathing | FIFA 11+ level 1;[^soligard-2008] hold limits[^training-rules] | 2 x 30 s | `dead-bug` |
| 3 | `plank-leg-lift` | Forearm plank lifting one foot a little for 2 s, then the other | `body only` | hold, 2 x 20 s, rest 45 s | As rung 2, and the hips stay level while a foot is up (no tipping) | FIFA 11+ level 2 (alternate legs)[^soligard-2008] | 2 x 30 s | `plank` |

# Anti-rotation (`ar`)

| # | Rung id | Rung | Equipment | Starting dose | Clean cues (parent at the feet or side-on) | Source | Unlock at | Step down to |
|---|---|---|---|---|---|---|---|---|
| 1 | `bird-dog` | On hands and knees, reach one arm and the opposite leg long, hold 2 s, switch | `body only` | reps, 2 x 10 (alternating), rest 45 s | The back stays flat like a table; the hips do not tip to one side; the 2 s hold is still | Trunk work in NSCA guidelines[^nsca-2009] | 2 x 14 | Leg only, arm stays down |
| 2 | `plank-shoulder-tap` | High plank on the hands, feet wide; slowly tap one shoulder, then the other | `body only` | reps, 2 x 10 (alternating), rest 60 s | The hips stay level and do not sway side to side (parent at the feet); straight line head to heels; one tap per slow count of 2 | Trunk work in NSCA guidelines[^nsca-2009] | 2 x 14 | `bird-dog` |
| 3 | `kneeling-band-press-out` | Tall kneeling, side-on to the parent, who holds the lightest band at chest height; press the hands straight out, hold 2 s, return | `bands` (lightest) | reps, 2 x 10 per side, rest 60 s | The hands stay in front of the middle of the chest (no drift toward the band); hips and shoulders stay facing forward; the 2 s hold is still | Anti-rotation band holds;[^gk-power] bands for measured load[^lopes-2019] | 2 x 15 per side, then one band step | `plank-shoulder-tap` |

The parent holds the band at rung 3 because the household vocabulary has no band anchor;
a door, a table leg or a handle is never used as one. Undo: drop the rung if the owner
does not want to be the anchor.

# Lateral flexion (`lf`)

| # | Rung id | Rung | Equipment | Starting dose | Clean cues (parent in front, level with the hips) | Source | Unlock at | Step down to |
|---|---|---|---|---|---|---|---|---|
| 1 | `side-plank-knees` | Side plank from the knees, knees bent behind | `body only` | hold, 2 x 15 s per side, rest 45 s | Straight line head to knees; the hips do not drop; same time both sides | Card's `easier`;[^training-rules] FIFA youth core range[^fifa-core-2025] | 2 x 30 s per side | Shorter hold at the 10 s floor |
| 2 | `side-plank` *(card)* | Side plank on the forearm and feet | `body only` | hold, 2 x 15 s per side, rest 45 s | Straight line head to feet; the hips do not drop; same time both sides | FIFA 11+ level 1 (static)[^soligard-2008] | 2 x 30 s per side | `side-plank-knees` |
| 3 | `side-plank-hip-raise` | From the side plank, lower the hips to just above the floor and lift back to the line | `body only` | reps, 2 x 10 per side, rest 60 s | Each rep returns to a straight line; the bottom hip never rests on the floor; the body does not roll forward | FIFA 11+ level 2 (raise and lower the hip)[^soligard-2008]; McGill's reps over long holds[^mcgill-2010] | 2 x 15 per side | `side-plank` |

[^nsca-2009]: NSCA youth resistance training position statement, 2009
[^soligard-2008]: Soligard et al., FIFA 11+ randomised trial in youth football, 2008
[^fifa-core-2025]: FIFA Training Centre, core strength for young players, 2025
[^mcgill-2010]: McGill, core training review, 2010
[^lopes-2019]: Lopes et al., meta-analysis of elastic versus conventional resistance, 2019
[^gk-power]: Goalkeeper-specific power (this bundle)
[^training-rules]: Training rules Decision (this bundle)
[^unlock]: Unlock rules for the progression library (this bundle)
