---
type: Research Finding
title: Immediate feedback
description: Every answer or action gets an instant, specific response, framed around the task rather than the person.
tags: [ux, feedback, learning]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: hattie, resource: https://www.jstor.org/stable/4624888, title: "Hattie and Timperley (2007), The power of feedback, Review of Educational Research 77(1)" }
  - { id: duo-art, resource: https://blog.duolingo.com/shape-language-duolingos-art-style/, title: "Duolingo blog: shape language and art style" }
  - { id: apple-haptics, resource: https://developer.apple.com/design/human-interface-guidelines/playing-haptics, title: "Apple Human Interface Guidelines: Playing haptics" }
  - { id: sdt, resource: https://doi.org/10.1037/0003-066X.55.1.68, title: "Ryan and Deci (2000), Self-determination theory and the facilitation of intrinsic motivation, American Psychologist 55(1)" }
---

# The pattern

After each exercise the screen answers at once: a clear right/wrong state (colour, icon,
short message, often a sound), the correct answer when wrong, and a way to continue.
Mistakes are framed lightly so the learner keeps going.

# Evidence and rationale

- A large synthesis of feedback research finds feedback among the strongest influences on
  learning, but its effect can be positive or negative: feedback about the task and how
  to do it helps most, while praise or criticism of the *person* helps little.[^hattie]
- The reference app's design team says playful, low-stakes visuals are meant to make
  learners less afraid of mistakes, and that clarity matters because a misread screen
  leads to wrong answers.[^duo-art]
- Platform guidance pairs feedback with matching haptics and animation, and warns that
  overusing them dilutes their meaning.[^apple-haptics]
- Specific, informational feedback supports the need for *competence*; controlling or
  judgemental feedback undermines intrinsic motivation.[^sdt]

# Generic description (clean room)

"Instant, specific, task-focused feedback with a correct/incorrect state." Common to most
quiz and tutoring software.

# Relevance to training

There is no auto-graded answer in a physical drill. Feedback comes from two places: the
parent's quick rating of form (a few large buttons, not free text), and the keeper's own
check-in (effort, any pain). Feedback names the cue ("land soft, knees over toes"), not
the person. A pain report is feedback too, and it must end the exercise, not ask for one
more rep; see [UX patterns decision](/decisions/ux-patterns.md).

[^hattie]: Hattie and Timperley (2007)
[^duo-art]: Duolingo blog, shape language
[^apple-haptics]: Apple HIG, Playing haptics
[^sdt]: Ryan and Deci (2000)
