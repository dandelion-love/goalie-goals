---
type: Research Finding
title: Habit loops
description: Habits form when a behaviour is repeated in a stable context until the cue triggers it automatically; it takes weeks to months and tolerates the odd miss.
tags: [progression, habit, science, cue, automaticity]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: lally, resource: https://doi.org/10.1002/ejsp.674, title: "Lally et al. (2010), How are habits formed, European Journal of Social Psychology 40(6)" }
  - { id: wood, resource: https://doi.org/10.1037/0033-295X.114.4.843, title: "Wood and Neal (2007), A new look at habits and the habit-goal interface, Psychological Review 114(4)" }
  - { id: gardner, resource: https://doi.org/10.3399/bjgp12X659466, title: "Gardner, Lally and Wardle (2012), Making health habitual, British Journal of General Practice 62(605)" }
  - { id: fogg, resource: https://behaviormodel.org/, title: "Fogg Behavior Model (B = MAP)" }
  - { id: kaushal, resource: https://pubmed.ncbi.nlm.nih.gov/25851609/, title: "Kaushal and Rhodes (2015), Exercise habit formation in new gym members, Journal of Behavioral Medicine" }
---

# Science

- A habit is a learned link between a context cue and a response, built by repetition,
  so that the cue starts the behaviour with little deliberation.[^wood]
- In a real-world study, automaticity grew with each repetition and levelled off after a
  median of about two months, ranging widely between people; one missed opportunity did
  not significantly set people back.[^lally]
- Practical guidance: pick a simple action, tie it to a fixed daily cue, repeat it in
  that context; it gets easier with time.[^gardner]
- The behaviour model frames each occurrence as motivation, ability and a prompt
  coinciding; small, easy actions need less motivation.[^fogg]
- For exercise, about four sessions a week sustained for six weeks predicted habit
  formation in new gym members.[^kaushal]

# What this means for app mechanics

- The habit is the *cue-to-training link*, not the app. Mechanics should point attention
  to the real-world cue (same days, same time, same place).
- Strict daily counters are not required by the science; consistent weekly frequency is
  enough for exercise, and an occasional miss does not undo progress.

See [progression design](/decisions/progression-design.md).

[^lally]: Lally et al. (2010)
[^wood]: Wood and Neal (2007)
[^gardner]: Gardner, Lally and Wardle (2012)
[^fogg]: Fogg Behavior Model
[^kaushal]: Kaushal and Rhodes (2015)
