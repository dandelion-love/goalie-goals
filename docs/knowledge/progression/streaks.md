---
type: Research Finding
title: Streaks and streak protection
description: A count of consecutive active days motivates through visible progress and then loss aversion; protection items soften breaks, and broken streaks demotivate.
tags: [progression, streaks, habit, loss-aversion, children]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: duo-streak, resource: https://blog.duolingo.com/how-duolingo-streak-builds-habit, title: "Duolingo blog: how the streak builds habit (2022)" }
  - { id: duo-streak-research, resource: https://blog.duolingo.com/duolingo-streak-research/, title: "Duolingo blog: streak research (2024)" }
  - { id: duo-friend-streak, resource: https://blog.duolingo.com/product-lessons-friend-streak/, title: "Duolingo blog: product lessons from the shared friend streak" }
  - { id: silverman, resource: https://doi.org/10.1093/jcr/ucac029, title: "Silverman and Barasch (2023), On or off track: how (broken) streaks affect consumer decisions, Journal of Consumer Research 49(6)" }
  - { id: sharif, resource: https://anderson-review.ucla.edu/wp-content/uploads/2021/03/Sharif-Shu_EmergencyReserveFailure_OBHDP2019.pdf, title: "Sharif and Shu (2021), Nudging persistence after failure through emergency reserves, Organizational Behavior and Human Decision Processes 163" }
  - { id: lally, resource: https://doi.org/10.1002/ejsp.674, title: "Lally et al. (2010), How are habits formed, European Journal of Social Psychology 40(6)" }
  - { id: ico-nudge, resource: https://www.hunton.com/privacy-and-cybersecurity-law-blog/age-appropriate-design-ico-issues-draft-code-of-practice-for-online-services-used-by-children/, title: "Hunton: the ICO draft age appropriate design code (2019), nudge techniques" }
  - { id: fiverights, resource: https://5rightsfoundation.com/uploads/Disrupted-Childhood-2023-v2.pdf, title: "5Rights Foundation (2023), Disrupted Childhood: the cost of persuasive design" }
---

# Mechanic

A counter of consecutive days on which the user did at least the minimum. Variants:
protection items that cover a missed day, paid or earned repair of a broken streak, and a
shared streak kept jointly with a friend.

# Evidence that it builds a habit

- Daily repetition in a stable context drives automaticity; a single missed day did not
  measurably harm habit formation, while frequent inconsistency did.[^lally] So the
  *behaviour* tolerates misses even if a strict counter does not.
- The reference app reports that learners who reached a week-long streak were several
  times more likely to finish a course (a correlation, not proof of cause), and that its
  milestone animations slightly raised one-week retention.[^duo-streak]
- It describes a two-phase motivation: early days feel like big relative gains; later,
  loss aversion keeps people going to protect what they have.[^duo-streak-research]
- In seven studies, an intact streak shown in a log raised later engagement relative to a
  broken one, independent of actual past behaviour. People valued the streak itself and
  would pay costs to repair it; the drop after a break was larger when people blamed
  themselves and smaller when repair was possible.[^silverman]
- Built-in slack ("emergency reserves") made people more persistent after a missed
  subgoal in a step-count field study.[^sharif] The reference app cites this line of work
  for its protection items, and reports a small rise in daily activity when it allowed
  two protection items at once, without more days off.[^duo-streak]
- A shared streak: the reference app reports learners with at least one shared streak
  were more likely to do their daily lesson.[^duo-friend-streak]

# Evidence of harm to young users (AC4)

- The UK regulator's draft children's code named streaks among reward loops that can
  extend children's use of a service.[^ico-nudge]
- A children's-rights report singles out a shared day-count between two young people on a
  social app as a persuasive design feature that keeps children online.[^fiverights]
- The same loss aversion that sustains a long streak makes its loss feel heavy, and the
  demand to "repair" it is a known monetisation path.[^silverman]

# Takeaways

Streaks work, mostly through visible progress early and loss aversion late. The safe form
counts *planned* days (so rest is not a break), builds in free slack, never sells repair,
and never frames a break as a failure. See
[progression design](/decisions/progression-design.md).

[^duo-streak]: Duolingo blog, how the streak builds habit
[^duo-streak-research]: Duolingo blog, streak research
[^duo-friend-streak]: Duolingo blog, friend streak product lessons
[^silverman]: Silverman and Barasch (2023)
[^sharif]: Sharif and Shu (2021)
[^lally]: Lally et al. (2010)
[^ico-nudge]: Hunton on the ICO draft code (2019)
[^fiverights]: 5Rights Foundation (2023)
