---
type: Research Finding
title: Badges and achievements
description: Collectible markers for milestones give recognition and goals; informational badges help, controlling or volume badges can backfire.
tags: [progression, badges, achievements, recognition]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: hanus, resource: https://doi.org/10.1016/j.compedu.2014.08.019, title: "Hanus and Fox (2015), Assessing the effects of gamification in the classroom, Computers and Education 80" }
  - { id: dkr, resource: https://doi.org/10.1037/0033-2909.125.6.627, title: "Deci, Koestner and Ryan (1999), meta-analysis of extrinsic rewards and intrinsic motivation, Psychological Bulletin 125(6)" }
  - { id: hamari, resource: https://doi.org/10.1109/HICSS.2014.377, title: "Hamari, Koivisto and Sarsa (2014), Does gamification work? HICSS" }
  - { id: openbadges, resource: https://www.imsglobal.org/spec/ob/v3p0, title: "1EdTech Open Badges 3.0 specification" }
---

# Mechanic

A badge is awarded when the user meets a condition (first session, a month of training,
a technique mastered) and is collected on a profile.

# Evidence

- Results are context-dependent: a review of empirical studies found mostly positive but
  very context- and user-dependent effects.[^hamari]
- In a classroom study, badges combined with a leaderboard lowered intrinsic motivation
  over a semester.[^hanus]
- Rewards perceived as *informational* (telling you that you have become competent) are
  less harmful to intrinsic motivation than those perceived as *controlling* (paying you
  to do the task).[^dkr]

# Evidence gaps (AC4)

No published evidence was found that badges alone build a habit.

# Takeaways

Badges for competence and consistency (technique milestones, months trained, safe
choices such as stopping when something hurt) are informational. Badges for volume
("1,000 jumps") are refused. An open standard exists if badges ever need to be portable.[^openbadges]
See [progression design](/decisions/progression-design.md).

[^hanus]: Hanus and Fox (2015)
[^dkr]: Deci, Koestner and Ryan (1999)
[^hamari]: Hamari, Koivisto and Sarsa (2014)
[^openbadges]: Open Badges 3.0
