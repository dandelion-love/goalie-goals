---
type: Research Finding
title: Leagues and leaderboards
description: Weekly ranked tables of similar users with promotion and demotion raise time spent, but evidence in education is mixed and can lower motivation.
tags: [progression, leaderboards, competition, social-comparison]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: duo-leagues, resource: https://blog.duolingo.com/duolingo-leagues-leaderboards/, title: "Duolingo blog: leagues and leaderboards" }
  - { id: hanus, resource: https://doi.org/10.1016/j.compedu.2014.08.019, title: "Hanus and Fox (2015), Assessing the effects of gamification in the classroom, Computers and Education 80" }
  - { id: sailer, resource: https://doi.org/10.1007/s10648-019-09498-w, title: "Sailer and Homner (2020), The gamification of learning: a meta-analysis, Educational Psychology Review 32" }
  - { id: hamari, resource: https://doi.org/10.1109/HICSS.2014.377, title: "Hamari, Koivisto and Sarsa (2014), Does gamification work? HICSS" }
---

# Mechanic

Users are placed weekly into small groups of strangers ranked by points; the top move up
a tier, the bottom move down, and the table resets.

# Evidence

- The reference app introduced ranked weekly tables after testing and expanded the number
  of tiers by experiment; users can opt out by making their profile private.[^duo-leagues]
- A semester-long classroom study found that the section with leaderboards and badges
  reported *lower* intrinsic motivation, satisfaction and empowerment over time, and
  slightly lower exam scores, than the same course without them.[^hanus]
- A meta-analysis found that designs combining competition with collaboration did better
  than purely competitive ones.[^sailer] An earlier review found gamification effects
  depend heavily on context and users.[^hamari]

# Harms and evidence gaps (AC4)

- Ranking by points rewards volume; in exercise, that means rewarding more load, the
  variable a youth plan caps.
- Strangers on a table means social contact with unknown people, which a child-facing
  service should avoid by default.
- No published evidence was found that leaderboards build a durable habit, as opposed to
  short-term time on the app.

# Takeaways

Not a fit for a two-person home training app. The cooperative alternative (the pair
against their own past weeks) keeps the social pull without ranking. See
[progression design](/decisions/progression-design.md).

[^duo-leagues]: Duolingo blog, leagues and leaderboards
[^hanus]: Hanus and Fox (2015)
[^sailer]: Sailer and Homner (2020)
[^hamari]: Hamari, Koivisto and Sarsa (2014)
