---
type: Research Finding
title: The lesson path
description: A single guided route through the content, shown as a sequence of steps, so the learner never has to choose what to do next.
tags: [ux, navigation, lesson-path, guidance]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: duo-path, resource: https://blog.duolingo.com/new-duolingo-home-screen-design/, title: "Duolingo blog: the new home screen design (2022)" }
  - { id: path-backlash, resource: https://piunikaweb.com/2022/10/17/duolingo-app-update-with-path-ui-faces-backlash-from-users/, title: "PiunikaWeb: path UI update faces user backlash (2022)" }
  - { id: fogg, resource: https://behaviormodel.org/, title: "Fogg Behavior Model (B = MAP)" }
  - { id: kivetz, resource: https://doi.org/10.1509/jmkr.43.1.39, title: "Kivetz, Urminsky and Zheng (2006), The goal-gradient hypothesis resurrected, Journal of Marketing Research 43(1)" }
---

# The pattern

The home screen is one winding route of steps (nodes). Each node is a short session;
finished nodes are filled in, the next one is highlighted, later ones are visibly locked.
Nodes are grouped into units, and each unit ends in a checkpoint or review.

# Evidence and rationale

- The reference app replaced a grid of skills with a single path in late 2022. Its stated
  reason: learners asked for more guidance and less complexity, and many were unsure they
  were using the app the "right" way. Each node mixes new material with review.[^duo-path]
- Removing choice raises *ability* in the behaviour-model sense: the easier the next step
  is to start, the less motivation is needed to start it.[^fogg]
- Seeing the remaining distance to a visible goal shrink is linked to faster effort near
  the goal (the goal-gradient effect), which a path with a unit checkpoint exploits.[^kivetz]
- Trade-off: experienced users disliked losing the freedom to pick what to practise, and
  reported the change as forcing a single route.[^path-backlash]

# Generic description (clean room)

Described here as a "guided step path": an ordered list of sessions, the current one
emphasised, completed ones marked, future ones previewed. No layout, artwork or naming
from the reference app is needed to build it; this is a standard progress-stepper idea
stretched into a vertical route.

# Relevance to training

Physical training already has an order (warm-up, technique, power, cool-down; and a
progression across weeks). A path makes that order visible and removes the "what should
we do today?" negotiation between the keeper and the parent. Locking must never block a
rest or recovery day; see [UX patterns decision](/decisions/ux-patterns.md).

[^duo-path]: Duolingo blog, the new home screen design (2022)
[^path-backlash]: PiunikaWeb, path UI update faces user backlash (2022)
[^fogg]: Fogg Behavior Model
[^kivetz]: Kivetz, Urminsky and Zheng (2006)
