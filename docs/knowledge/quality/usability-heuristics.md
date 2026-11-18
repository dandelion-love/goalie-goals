---
type: Research Finding
title: Usability heuristics and severity ratings
description: Nielsen's ten heuristics and the 0-4 severity scale give a published, repeatable way for one evaluator to find and rank usability problems without recruiting users.
tags: [quality, usability, heuristic-evaluation, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
sources:
  - { id: nng-heuristics, resource: https://www.nngroup.com/articles/ten-usability-heuristics/, title: "Nielsen Norman Group: 10 usability heuristics for user interface design" }
  - { id: nng-severity, resource: https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/, title: "Nielsen Norman Group: severity ratings for usability problems" }
  - { id: nng-how-to, resource: https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/, title: "Nielsen Norman Group: how to conduct a heuristic evaluation" }
---

# What it is

Ten broad rules of thumb for interaction design: visibility of system status; match
between the system and the real world; user control and freedom; consistency and
standards; error prevention; recognition rather than recall; flexibility and efficiency
of use; aesthetic and minimalist design; help users recognise, diagnose and recover from
errors; help and documentation.[^nng-heuristics]

Each problem found is rated on a 0-4 scale: 0 not a problem, 1 cosmetic, 2 minor, 3
major (important to fix), 4 catastrophe (must fix before release). The rating combines
how often the problem occurs, its impact, and whether it persists once users know of
it.[^nng-severity]

# Repeatability

- One evaluator finds only part of the problems; several evaluators working
  independently find more, and their findings are merged afterwards.[^nng-how-to]
- Severity is a judgement, so the same evaluator rating against a written problem list
  is more stable than a fresh pass each time. A rubric that uses heuristics should
  therefore carry the previous audit's problem list forward and re-check each item, then
  add new ones.[^nng-severity]

# How it applies to a two-person training app

| Heuristic | What it means here |
|---|---|
| Visibility of system status | During a set, the keeper sees the step, set number, time or reps left, and whether rest is running, from a few metres away. |
| Match with the real world | Training words the pair already use (set, rep, rest, hold); no game jargon for safety actions. |
| User control and freedom | Stop and "something hurts" are always one tap away; a mis-tapped approval can be undone. |
| Consistency and standards | The same action has the same label and look on the parent's phone and the keeper's iPad. |
| Error prevention | Safety stops never ask "are you sure"; consequential parent actions (approve, clear a pause) can be reversed or are confirmed once. |
| Aesthetic and minimalist design | Few controls per in-session screen, so a glance is enough. |

The heuristics fit this app's audit because they need no participants: the reviewer can
apply them to a local demo-data run. They do not measure satisfaction, which needs the
pair themselves (see [the System Usability Scale](/quality/system-usability-scale.md)).

[^nng-heuristics]: Nielsen Norman Group, 10 usability heuristics.
[^nng-severity]: Nielsen Norman Group, severity ratings for usability problems.
[^nng-how-to]: Nielsen Norman Group, how to conduct a heuristic evaluation.
