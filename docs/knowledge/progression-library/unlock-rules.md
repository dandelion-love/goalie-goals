---
type: Pattern
title: Unlock rules for the progression library
description: How a rung unlocks and steps back down, refining the training-rules progression rule - what a clean repetition is, the test every parent cue must pass (and the rejection when it fails), steps inside a rung, two clean sessions in a row, the parent's in-app approval as the last step, and the step-down triggers.
tags: [progression-library, unlock, progression, parent-approval, safety]
status: draft
generated: { by: codex/gpt-6, at: 2026-11-22T20:59:45Z }
sources:
  - { id: nsca-2009, resource: https://pubmed.ncbi.nlm.nih.gov/19620931/, title: "Faigenbaum et al. Youth resistance training: updated position statement paper from the NSCA (J Strength Cond Res, 2009)" }
  - { id: moran-2017-cmj, resource: https://pubmed.ncbi.nlm.nih.gov/28129282/, title: "Moran et al. Age-related variation in male youth athletes' countermovement jump after plyometric training: a meta-analysis (J Strength Cond Res, 2017)" }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
  - { id: parent-approval, resource: /decisions/parent-approval.md, title: Parent approval as a primary behaviour }
  - { id: progression-design, resource: /decisions/progression-design.md, title: Progression design for two people training together }
  - { id: plyo, resource: /training/plyometrics-and-landing.md, title: Plyometrics and landing mechanics }
  - { id: final-step, resource: 'https://github.com/dandelion-love/goalie-goals/issues/196#issuecomment-7085599529', title: Owner decision on the capped final repetition step }
---

# Summary

A rung unlocks only by the training-rules progression rule: every repetition clean in two
sessions in a row, recorded by the parent, then the parent's approval in the
app.[^training-rules][^nsca-2009] This concept says what each of those words means for a
ladder rung, which cues may define "clean", and when the keeper goes back down. Where it
and the training rules disagree, the training rules win.

# A clean repetition

- Each rung lists two to four **clean cues**. A repetition (or a hold, or a landing) is
  clean when every cue on the list holds. Anything else is unclean; there is no "nearly".
- The **parent** decides, not the keeper and not the app. The app asks after each set:
  "Every rep clean?" Yes or no, with an optional "which cue slipped" chip.
- A hold is clean only if the position held for the whole dosed time; it ends when the
  position breaks, not when the keeper tires.[^training-rules]
- **One unclean rep** makes the session not clean for that rung. **Two unclean reps in a
  set** end the set, as the training rules' warning sign for breaking technique
  says.[^training-rules] A pain report is never an unclean rep: it is a stop.

# The cue test, and the rejection case

A cue may define "clean" only if a parent with no coaching knowledge can judge it. Every
cue must pass all three checks:

| Check | Passes when | Fails when |
|---|---|---|
| Seen | The parent can see or hear it from the place the card puts them, without moving | It needs a view from above, behind or inside the body ("glutes fire first") |
| Slow | It happens at the dosed tempo, in a frozen end position of at least 2 s, or leaves an outcome after the rep (a sound, where the ball is, which side of a line a foot landed) | It is over in a fraction of a second mid-movement ("the order the body touches the ground in a dive") |
| Simple | It is a yes or no in plain words | It needs a term or a trained eye to judge ("neutral spine", "hip hinge at 45 degrees", "triple extension") |

**When a cue fails:** reword it, in this order of preference, into (1) a frozen end
position the parent checks ("freeze for two seconds; knees over the toes"), (2) an
outcome after the rep ("the ball is still held"; "the foot lands behind the line"), or (3)
a slower tempo where the parent can see it. If no rewording passes, the rung is **split**
(a slower or frozen version goes in before it) or **dropped** from the ladder, and the
change is recorded in the library Decision. A rung with no passing cues is never built.
Worked cases are in the [goalkeeper ladders](/progression-library/ladders-goalkeeper.md)
(the low dive and the drop step).

# Steps inside a rung

A rung starts at its starting dose. Before the next rung unlocks, the dose grows inside
the rung, one lever at a time, each step after two clean sessions in a row and the
parent's approval of the change:[^training-rules][^parent-approval]

| Dose kind | Step | Top dose (the "unlock at" column) |
|---|---|---|
| Repetitions | 2 more per set, or a second set | 2 sets of 15 (the top of rule 2's range) |
| Hold | At most 5 s longer | 30 s per hold; beyond that only the next rung |
| Jump or dive contacts | 1 more per set, or one more set | As listed per rung; never above 6 per set, and the session total stays within the jump limit |
| Efforts | One more effort per set, or one more set | 3 sets of 4 |
| Band | One band step, only after the repetitions reach the top | As listed per rung |

Skill rungs where the cue, not the volume, is the point may unlock at the starting dose
when the ladder table says so. No step ever goes past a training-rules limit.

For the squat-to-box ladder, the final step from 2 × 14 to the existing 2 × 15 cap is
one additional repetition per set, after two clean sessions and the parent's in-app
approval of that change. Each exact dose version also requires owner content approval;
the decision on the increment does not itself approve a dose or exercise.[^final-step]

# Unlocking the next rung

1. The keeper reaches the rung's top dose.
2. Every repetition at that dose is clean in **two sessions in a row in which the rung was
   done** (not two calendar days; rest days in between do not break the pair, but a
   session with an unclean rep restarts the count).[^training-rules]
3. Any cross-ladder prerequisite in the library Decision is met (for example, a set
   stance before standing dives).
4. The app shows "next rung ready" to both. The keeper sees the next rung and what it took;
   nothing changes yet.
5. **The parent approves the step in the app.** This is always the last step. If the next
   rung's card has not been approved by the owner yet, it stays locked and the app says it
   is waiting for approval; no rung is ever scheduled before its card is
   approved.[^parent-approval][^training-rules]
6. The next rung starts at **its** starting dose, not the old rung's top dose. The old
   rung stays available as a warm-up or a step-down.

One rung at a time per ladder. Unlocking earns credit for consistency and form, never for
volume, and is never offered as a reward for finishing a session that should have
stopped.[^progression-design]

# Stepping back down

| Trigger | What happens | Basis |
|---|---|---|
| The rung is not clean at its starting dose in two sessions in a row | Step down one rung, at the dose last recorded clean there | Cautious reading of the progression rule[^training-rules] |
| A pain report or any warning sign | The session stops; that area's progressions are held until the parent clears it; then restart one rung below | Training rules' warning signs;[^training-rules] parent approval[^parent-approval] |
| Reported fast growth, or new knee or heel pain | Hold all ladders; jump and dive rungs drop to their starting dose | Growth spurt rule;[^training-rules][^moran-2017-cmj] landings set the limit[^plyo] |
| A week or more off | Restart one rung below the last one | After-a-break rule[^training-rules] |
| The parent or the keeper asks for easier | Step down at once; no approval needed, since the lower rung is already approved | Autonomy; stepping down never adds load |

Rung 1 steps down to its card's `easier` variant, or out of the session. A step down
never breaks a streak or costs credit; it is shown as part of the plan.[^progression-design]

[^nsca-2009]: NSCA youth resistance training position statement, 2009
[^moran-2017-cmj]: Moran et al., meta-analysis of plyometric training by age, 2017
[^training-rules]: Training rules Decision (this bundle)
[^parent-approval]: Parent approval Decision (this bundle)
[^progression-design]: Progression design Decision (this bundle)
[^plyo]: Plyometrics and landing mechanics (this bundle)
[^final-step]: Owner's decision on the capped final step (issue 196)
