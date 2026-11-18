---
type: Research Finding
title: Points and daily goals
description: Points for each activity plus a user-chosen daily target turn effort into a visible, closable goal; points reward volume unless designed otherwise.
tags: [progression, points, xp, daily-goal, goal-gradient]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: kivetz, resource: https://doi.org/10.1509/jmkr.43.1.39, title: "Kivetz, Urminsky and Zheng (2006), The goal-gradient hypothesis resurrected, Journal of Marketing Research 43(1)" }
  - { id: nunes, resource: https://doi.org/10.1086/500480, title: "Nunes and Dreze (2006), The endowed progress effect, Journal of Consumer Research 32(4)" }
  - { id: dkr, resource: https://doi.org/10.1037/0033-2909.125.6.627, title: "Deci, Koestner and Ryan (1999), meta-analysis of extrinsic rewards and intrinsic motivation, Psychological Bulletin 125(6)" }
  - { id: sailer, resource: https://doi.org/10.1007/s10648-019-09498-w, title: "Sailer and Homner (2020), The gamification of learning: a meta-analysis, Educational Psychology Review 32" }
  - { id: duo-streak, resource: https://blog.duolingo.com/how-duolingo-streak-builds-habit, title: "Duolingo blog: how the streak builds habit (2022)" }
---

# Mechanic

Each completed activity earns experience points; the user picks a daily target (light,
regular, intense) and a ring or bar fills toward it. Points also feed levels and
competitive tables.

# Evidence

- A visible, closable target uses the goal-gradient effect: people speed up as the
  remaining distance shrinks.[^kivetz] Starting the bar slightly filled (endowed progress)
  raised completion in a loyalty-card field experiment.[^nunes]
- Across gamified-learning experiments, points-and-goals designs show small to medium
  positive effects on learning, motivation and behaviour, with the behavioural and
  motivational effects less stable than the learning effect.[^sailer]
- The reference app's daily minimum is deliberately small, so the habit can be kept on a
  busy day.[^duo-streak]

# Risks and evidence gaps (AC4)

- Expected rewards tied to doing or completing a task tend to lower later free-choice
  interest.[^dkr] Points that become the goal can crowd out the activity's own value.
- Points per activity reward *volume*. In a physical setting volume is the variable that
  must be capped for safety, so a points-per-rep or points-per-minute design pushes in the
  wrong direction. No published evidence was found that points improve exercise *quality*.

# Takeaways

Keep the daily goal (small, chosen, closable). Award points for showing up and for good
form, with a hard daily cap, so extra volume earns nothing. See
[progression design](/decisions/progression-design.md).

[^kivetz]: Kivetz, Urminsky and Zheng (2006)
[^nunes]: Nunes and Dreze (2006)
[^dkr]: Deci, Koestner and Ryan (1999)
[^sailer]: Sailer and Homner (2020)
[^duo-streak]: Duolingo blog, how the streak builds habit
