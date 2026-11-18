---
type: Research Finding
title: Goal-gradient and endowed progress
description: People work harder as a visible goal gets closer, and a head start on progress increases completion; both can be used kindly or to drive volume.
tags: [progression, goal-gradient, science, motivation]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: kivetz, resource: https://doi.org/10.1509/jmkr.43.1.39, title: "Kivetz, Urminsky and Zheng (2006), The goal-gradient hypothesis resurrected, Journal of Marketing Research 43(1)" }
  - { id: nunes, resource: https://doi.org/10.1086/500480, title: "Nunes and Dreze (2006), The endowed progress effect, Journal of Consumer Research 32(4)" }
  - { id: duo-streak, resource: https://blog.duolingo.com/how-duolingo-streak-builds-habit, title: "Duolingo blog: how the streak builds habit (2022)" }
---

# Science

- Field data from a reward programme showed people accelerated as they neared a reward,
  effort scaling with the share of the distance remaining; even an illusion of progress
  produced acceleration. Those who accelerated more were also more likely to
  return.[^kivetz]
- Customers given a card with some stamps already filled were more likely to finish it
  than those with an empty card requiring the same number of purchases.[^nunes]
- The reference app notes the reverse problem: in a long streak each extra day is a tiny
  fraction of the total, so it adds milestones to restore a near goal.[^duo-streak]

# Risks (AC4)

The same effect pushes people to "just finish" when close to a goal. In a physical
session, the last few reps are where fatigue and form break-down peak. A progress bar
that is one set from full is a pressure to ignore warning signs.

# Takeaways

Use near goals across *days and weeks* (sessions this week, unit checkpoints), not inside
a session's reps. Never let a within-session bar reward finishing. See
[progression design](/decisions/progression-design.md).

[^kivetz]: Kivetz, Urminsky and Zheng (2006)
[^nunes]: Nunes and Dreze (2006)
[^duo-streak]: Duolingo blog, how the streak builds habit
