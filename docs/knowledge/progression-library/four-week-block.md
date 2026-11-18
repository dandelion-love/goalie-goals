---
type: Pattern
title: A four-week block with a lighter week
description: Three building weeks and a lighter fourth week that keeps every day but cuts the volume, where unlocks qualify, get approved and start, and what the block does in a match week, a tournament week and after a break.
tags: [progression-library, block, periodisation, unlocks, match-week]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T08:55:00Z }
sources:
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
  - { id: progression-design, resource: /decisions/progression-design.md, title: Progression design for two people training together }
  - { id: parent-approval, resource: /decisions/parent-approval.md, title: Parent approval as a primary behaviour }
  - { id: week, resource: /progression-library/proposed-week.md, title: A proposed themed week }
  - { id: periodisation, resource: /progression-library/youth-periodisation.md, title: Youth periodisation and the football year }
  - { id: nsca-2009, resource: https://pubmed.ncbi.nlm.nih.gov/19620931/, title: "Faigenbaum et al. Youth resistance training: updated position statement paper from the NSCA (J Strength Cond Res, 2009)" }
  - { id: bosquet-2007, resource: https://pubmed.ncbi.nlm.nih.gov/17762369/, title: "Bosquet et al. Effects of tapering on performance: a meta-analysis (Med Sci Sports Exerc, 2007)" }
  - { id: gabbett-2016, resource: https://pubmed.ncbi.nlm.nih.gov/26758673/, title: "Gabbett. The training-injury prevention paradox (Br J Sports Med, 2016)" }
---

# The shape

The [weekly rotation](/progression-library/proposed-week.md) repeats inside a four-week
block. The days and themes never change inside a block; only the dose does.[^week]

| Week | Name | Strength days | Jump days | Dose |
|---|---|---|---|---|
| 1 | Settle | As the week allows (3, or 2 in a match week) | As the week allows | Each exercise at the dose it ended the last block on; new rungs at their starting dose |
| 2 | Build | Same | Same | Sets or repetitions rise only where the last two sessions of that exercise were clean |
| 3 | Build | Same | Same | As week 2; the block's highest volume, still inside every cap |
| 4 | Lighter | Same days | Same days | About half the sets (1 set where week 3 had 2 or 3); jump contacts and sprints about half of week 3 and never above the starting dose; holds at their current time, 1 set; no new rung starts |

Why this shape:

- **Keep the days, cut the volume.** Adult taper evidence favours cutting volume by about
  41 to 60% while keeping frequency and intensity;[^bosquet-2007] keeping every day also
  keeps the habit cue. The lighter week does not change the themes, the days, or the
  light days.
- **A steady build.** Three weeks of small, clean steps and then a step back avoids
  spikes in load.[^gabbett-2016] Planned variation over time is what the youth
  guidance asks for.[^nsca-2009][^periodisation]
- **One block, one clock.** The progression design already gives the pair two spare days
  per four-week block;[^progression-design] the training block and the spare-day block
  are the same four weeks.

Every dose change still follows the [training rules](/decisions/training-rules.md):
technique before load, increases only after two clean sessions, at most 5% or one step
at a time, and no maximal work.[^training-rules] The block sets *when* a change may
happen, never a bigger change.

# How unlocks fit

A harder rung (the next variant of an exercise) unlocks only by the training rules:
clean repetitions recorded in two sessions of that exercise in a row, then the parent's
approval in the app.[^training-rules][^parent-approval] The ladders themselves are
researched separately (issue #85).

| When | What happens |
|---|---|
| Weeks 1 to 3 | Each exercise appears on its theme's weekday, so "two sessions in a row" usually means two weeks running. When it qualifies, the app asks the parent to approve the next rung. |
| After approval, in weeks 1 to 3 | The new rung starts on its theme's next weekday, at its starting dose (1 to 2 sets of 10 to 15, or the starting hold), replacing the old rung. |
| After approval, in week 4 | The new rung waits for week 1 of the next block, so the lighter week stays lighter and the block has one place where things change. |
| Week 4 | The parent's form check for technique levels happens here (one rated set per skill area),[^progression-design] at the lighter dose. It is a form check, never a test to the limit. |
| A rung that was not clean | Stays where it is; nothing is lost. |

The keeper always sees what is next and what it takes: "two clean sessions of this, then
a parent's OK".

# Match weeks, tournaments and breaks

| Situation | What the block does |
|---|---|
| A match week | The week takes the in-season shape (2 strength days, 1 jump day, light day before the match, rest after).[^week] The block week still counts. Doses of the exercises that ran keep their place; dropped jump work restarts at its current dose the next week, not higher. |
| A match moved this week only | The parent moves this week's match day in the app; the app reshapes that week only, and the themes keep their weekdays. |
| Two or more matches in a week, or a tournament | No strength or jump days that week: every app day is light or rest. The block clock holds (the week does not count), so the next week repeats the same block week. |
| A paused week (ill, injured, away) | The block clock holds, as the progression design pauses streaks.[^progression-design] |
| A week or more without strength sessions | The next block starts at week 1, one step below the last level, as the training rules require.[^training-rules] |
| Growth spurt reported | The block runs on, but every progression holds and jumps and sprints drop to the starting dose until the parent clears it.[^training-rules] |

[^training-rules]: Training rules decision
[^progression-design]: Progression design decision
[^parent-approval]: Parent approval decision
[^week]: A proposed themed week
[^periodisation]: Youth periodisation and the football year
[^nsca-2009]: NSCA youth resistance training position statement, 2009
[^bosquet-2007]: Bosquet et al., tapering meta-analysis, 2007
[^gabbett-2016]: Gabbett, the training-injury prevention paradox, 2016
