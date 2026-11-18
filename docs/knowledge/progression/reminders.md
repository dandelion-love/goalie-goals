---
type: Research Finding
title: Reminders
description: Daily reminders act as the prompt in the habit loop and measurably bring people back, but optimised reminder copy drifts toward pressure, and teens are already overloaded.
tags: [progression, reminders, notifications, prompt, children]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: yancey, resource: https://research.duolingo.com/papers/yancey.kdd20.pdf, title: "Yancey and Settles (2020), A sleeping, recovering bandit algorithm for optimizing recurring notifications, KDD" }
  - { id: fogg, resource: https://behaviormodel.org/, title: "Fogg Behavior Model (B = MAP)" }
  - { id: gardner, resource: https://doi.org/10.3399/bjgp12X659466, title: "Gardner, Lally and Wardle (2012), Making health habitual, British Journal of General Practice 62(605)" }
  - { id: csm, resource: https://www.commonsensemedia.org/press-releases/teens-are-bombarded-with-hundreds-of-notifications-a-day, title: "Common Sense Media (2023), Constant Companion: teens and notifications" }
  - { id: silverman, resource: https://doi.org/10.1093/jcr/ucac029, title: "Silverman and Barasch (2023), On or off track: how (broken) streaks affect consumer decisions, Journal of Consumer Research 49(6)" }
---

# Mechanic

A daily push message, often streak-aware ("practise to keep your streak"), sent at a
chosen or learned time; templates selected by experiment.

# Evidence

- A prompt is required for a behaviour; reminders are the prompt.[^fogg]
- The reference app's bandit-chosen reminders measurably increased lessons completed, with
  the best gains among new learners; novelty wears off and is managed by spacing
  repeats.[^yancey]
- Habit guidance for health behaviour recommends tying the behaviour to a stable cue in
  daily life (a time, a place, a preceding routine), so that the cue, not a phone alert,
  eventually triggers it.[^gardner]

# Harms and evidence gaps (AC4)

- Teens received a median of over two hundred notifications a day in a 2023 study,
  including at night.[^csm]
- Highlighting a *broken* streak lowers engagement more than highlighting an intact
  one;[^silverman] "you lost your streak" messages are counterproductive as well as
  unkind.
- No published evidence was found that app reminders by themselves produce a lasting habit
  once they stop; the habit literature points to context cues instead.

# Takeaways

Use one reminder at a planned time, written as a plan ("training at the usual time
today"), and move toward a real-world cue (after school snack, before dinner). See
[progression design](/decisions/progression-design.md).

[^yancey]: Yancey and Settles (2020)
[^fogg]: Fogg Behavior Model
[^gardner]: Gardner, Lally and Wardle (2012)
[^csm]: Common Sense Media (2023)
[^silverman]: Silverman and Barasch (2023)
