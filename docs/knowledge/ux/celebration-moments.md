---
type: Research Finding
title: Celebration moments
description: Short, earned animations at session end and at milestones that mark progress without turning into a slot machine.
tags: [ux, celebration, animation, milestones]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: duo-streak, resource: https://blog.duolingo.com/how-duolingo-streak-builds-habit, title: "Duolingo blog: how the streak builds habit (2022)" }
  - { id: rive-duo, resource: https://rive.app/blog/creative-technologists-duolingo-s-solution-to-the-designer-to-developer-handoff, title: "Rive blog: creative technologists at Duolingo" }
  - { id: dkr, resource: https://doi.org/10.1037/0033-2909.125.6.627, title: "Deci, Koestner and Ryan (1999), meta-analysis of extrinsic rewards and intrinsic motivation, Psychological Bulletin 125(6)" }
  - { id: ico-games, resource: https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2023/02/new-guidance-to-industry-issued-for-game-developers-on-protecting-children, title: "ICO: guidance for game developers on protecting children (2023)" }
---

# The pattern

When a session ends, a full-screen moment summarises it (time, accuracy, progress) with a
brief animation. Bigger moments mark milestones (a unit finished, a streak length reached).

# Evidence and rationale

- The reference app redesigned its streak-extension animation, adding special milestone
  versions, and reports that new learners became slightly more likely (1.7%) to still be
  active a week later. The motivation: day-to-day gains in a long streak feel tiny, so
  milestones re-inject meaning.[^duo-streak]
- The team builds these reward animations with an interactive animation tool so designers
  can ship them without hand-off losses.[^rive-duo]
- Caution: rewards that are expected and tied to doing or completing a task tend to lower
  later free-choice interest; unexpected, informational recognition does not.[^dkr]
  Celebrations should say *what was achieved*, not pay the user to continue.
- Regulator guidance for games played by children asks for natural stopping points and
  break prompts without pressure or fear of missing out.[^ico-games] A celebration screen
  is the natural place to stop, so it should end with "done for today", not "one more?".

# Generic description (clean room)

"An end-of-session summary with a short celebratory animation, plus larger milestone
moments." No character, art or sound from the reference app is needed.

# Relevance to training

The end of a physical session is also the start of recovery. The celebration should be
quick, show *form* and *consistency* (not reps or volume), celebrate both people, and
offer a cool-down, not another drill. A session stopped early for pain or a warning sign
gets a calm "good call, you stopped safely" screen, never a failure screen; see
[UX patterns decision](/decisions/ux-patterns.md).

[^duo-streak]: Duolingo blog, how the streak builds habit
[^rive-duo]: Rive blog, creative technologists
[^dkr]: Deci, Koestner and Ryan (1999)
[^ico-games]: ICO, guidance for game developers (2023)
