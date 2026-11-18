---
type: Research Finding
title: Usability measures - effectiveness, efficiency and satisfaction
description: ISO 9241-11 defines usability by effectiveness, efficiency and satisfaction; task success, steps or time on task, and a short post-task question are the standard measures, and only some of them can be taken without participants.
tags: [quality, usability, metrics, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
sources:
  - { id: iso-9241-11, resource: https://www.iso.org/standard/63500.html, title: "ISO 9241-11:2018 Ergonomics of human-system interaction, Part 11: Usability, definitions and concepts" }
  - { id: mu-seq, resource: https://measuringu.com/seq10/, title: "MeasuringU: 10 things to know about the Single Ease Question (SEQ)" }
  - { id: nng-success, resource: https://www.nngroup.com/articles/success-rate-the-simplest-usability-metric/, title: "Nielsen Norman Group: Success rate, the simplest usability metric" }
  - { id: mu-sus, resource: https://measuringu.com/sus/, title: "MeasuringU: Measuring usability with the System Usability Scale" }
---

# The definition

ISO 9241-11 defines usability as the extent to which specified users can use a product
to achieve specified goals with effectiveness, efficiency and satisfaction in a
specified context of use.[^iso-9241-11]

# Standard measures

| Aspect | Measure | Needs participants? |
|---|---|---|
| Effectiveness | Task success rate: share of attempts completed without help[^nng-success] | Yes |
| Efficiency | Time on task; or, without participants, the number of steps (taps) on the shortest path | Steps: no |
| Satisfaction | A post-task question such as the seven-point Single Ease Question[^mu-seq]; a post-test questionnaire such as SUS[^mu-sus] | Yes |

# How it applies to a two-person training app

- The reviewer's audit, from a local demo-data run, can measure the participant-free
  parts: tap counts for the core tasks, whether safety controls are reachable, how
  the app recovers from mistakes and network trouble.
- Task success and satisfaction need the pair; they belong to the separate usability
  check, which sets its own method. The rubric sets only the targets that check must
  meet.
- The "specified users" are two: a keeper in early teens, mid-exercise, and a parent on
  a phone. Each core task is measured on the device its user holds.

[^iso-9241-11]: ISO 9241-11:2018.
[^mu-seq]: MeasuringU, Single Ease Question.
[^nng-success]: Nielsen Norman Group, success rate.
[^mu-sus]: MeasuringU, SUS.
