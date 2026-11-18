---
type: Research Finding
title: Quests
description: Small daily, monthly and shared challenges give variety and short goals; shared quests add cooperation, but evidence on habit is thin.
tags: [progression, quests, challenges, cooperation]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: duo-friends-quests, resource: https://blog.duolingo.com/friends-quests/, title: "Duolingo blog: shared quests with friends" }
  - { id: duo-highlights, resource: https://blog.duolingo.com/product-highlights/, title: "Duolingo blog: product highlights" }
  - { id: sailer, resource: https://doi.org/10.1007/s10648-019-09498-w, title: "Sailer and Homner (2020), The gamification of learning: a meta-analysis, Educational Psychology Review 32" }
  - { id: kivetz, resource: https://doi.org/10.1509/jmkr.43.1.39, title: "Kivetz, Urminsky and Zheng (2006), The goal-gradient hypothesis resurrected, Journal of Marketing Research 43(1)" }
---

# Mechanic

A few small challenges each day ("finish two sessions", "get five perfect answers"), a
monthly challenge built from them, and a weekly challenge done jointly with a friend,
with a shared progress bar.

# Evidence

- The reference app runs shared weekly challenges between two friends that count toward a
  monthly goal, and lets users opt out.[^duo-friends-quests] It later matched learners
  without friends into such challenges and raised rewards for completing all daily
  challenges.[^duo-highlights]
- Short, concrete goals produce goal-gradient effort.[^kivetz]
- Cooperative-competitive designs and a light story frame were associated with larger
  effects in gamified learning.[^sailer]

# Evidence gaps (AC4)

No peer-reviewed evidence was found that quests build a lasting habit. They add variety
and short goals; the risk is that quest wording ("do 3 sessions today") pushes volume.

# Takeaways

Quests are useful as *variety and cooperation*: a weekly quest the pair completes
together, built only from things that are safe to repeat (form, consistency, a technique
focus), never from volume. See [progression design](/decisions/progression-design.md).

[^duo-friends-quests]: Duolingo blog, shared quests with friends
[^duo-highlights]: Duolingo blog, product highlights
[^sailer]: Sailer and Homner (2020)
[^kivetz]: Kivetz, Urminsky and Zheng (2006)
