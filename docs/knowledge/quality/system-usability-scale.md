---
type: Research Finding
title: The System Usability Scale and child-adapted versions
description: SUS is a ten-item questionnaire scored 0-100 with published benchmarks; child-adapted versions exist but have thin validity evidence, so the keeper's score needs care.
tags: [quality, usability, satisfaction, questionnaire, youth]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
sources:
  - { id: mu-sus, resource: https://measuringu.com/sus/, title: "MeasuringU: Measuring usability with the System Usability Scale" }
  - { id: sustory, resource: https://www.drhu.eu/publications/2024-CUI-SUStory.pdf, title: "Chen, Markopoulos and Hu (2024), SUStory: usability evaluation of conversational interfaces for children with a narrative on a game board, CUI 2024" }
  - { id: nng-teens, resource: https://www.nngroup.com/articles/usability-of-websites-for-teenagers/, title: "Nielsen Norman Group: Teenager's UX, designing for teens" }
---

# What it is

Ten statements, alternating positive and negative, each answered on a five-point
agreement scale, converted to a single 0-100 score. Across many published studies the
average score is 68, and a score above 80.3 sits in roughly the top tenth, graded A on
the curved scale.[^mu-sus]

# Child and teen versions

- A child-adapted SUS (Putnam and colleagues, 2020) rewords the items for
  primary-school-age children. Later work reports that its validity evidence is limited
  and that children tend to pick the extreme answers, and proposes presenting the items
  as a story on a game board to reduce that bias.[^sustory]
- No adapted version found has strong validity evidence for early teens. Teens read less
  fluently than adults, are less patient, and dislike being talked down to, so a
  version for the keeper should use plain words without looking childish.[^nng-teens]

# How it applies to a two-person training app

- SUS measures satisfaction with the app as a whole after real use. It needs the people
  who use it, so it belongs to the pair's usability check, not to the reviewer's audit of
  screenshots and timings.
- The parent can answer the standard SUS. For the keeper, the safer reading is the
  standard ten items in plain words with the same scoring, reported separately, and
  read as a trend rather than against the adult benchmark.[^sustory]
- With two respondents, a SUS score is a signal, not a statistic; benchmarks describe
  averages across many studies.[^mu-sus]

[^mu-sus]: MeasuringU, SUS overview and curved grading scale.
[^sustory]: Chen, Markopoulos and Hu (2024), SUStory, which reviews the child-adapted SUS.
[^nng-teens]: Nielsen Norman Group, Teenager's UX.
