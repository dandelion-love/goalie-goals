---
type: Research Finding
title: Lightweight usability methods for one household
description: Task success, time on task, think-aloud, the System Usability Scale with a plain-words youth form, and five-second tests, and what each can and cannot tell a pair of users at home.
tags: [usability, methods, sus, youth, measurement]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-11-18T00:00:00Z
sources:
  - { id: nn-five-users, resource: https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/, title: "Nielsen 2000, Why you only need to test with 5 users, Nielsen Norman Group" }
  - { id: nn-success, resource: https://www.nngroup.com/articles/success-rate-the-simplest-usability-metric/, title: "Nielsen and Budiu 2001, Success rate: the simplest usability metric, Nielsen Norman Group" }
  - { id: nn-think-aloud, resource: https://www.nngroup.com/articles/thinking-aloud-the-1-usability-tool/, title: "Nielsen 2012, Thinking aloud: the number one usability tool, Nielsen Norman Group" }
  - { id: nn-response, resource: https://www.nngroup.com/articles/response-times-3-important-limits/, title: "Nielsen 1993, Response times: the 3 important limits, Nielsen Norman Group" }
  - { id: nn-teens, resource: https://www.nngroup.com/articles/usability-of-websites-for-teenagers/, title: "Kendrick and Nielsen 2019, Teenagers' UX: designing for teens, Nielsen Norman Group" }
  - { id: nn-first-impressions, resource: https://www.nngroup.com/articles/first-impressions-human-automaticity/, title: "Fessenden 2017, First impressions matter, Nielsen Norman Group" }
  - { id: mu-sus, resource: https://measuringu.com/sus/, title: "Sauro 2011, Measuring usability with the System Usability Scale (SUS), MeasuringU" }
  - { id: mu-seq, resource: https://measuringu.com/seq10/, title: "Sauro 2012, 10 things to know about the Single Ease Question (SEQ), MeasuringU" }
  - { id: kortum-2021, resource: https://pubmed.ncbi.nlm.nih.gov/31913715/, title: "Kortum, Acemyan and Oswald 2021, Is it time to go positive? Assessing the positively worded System Usability Scale, Human Factors" }
  - { id: read-horton-2025, resource: https://knowledge.lancashire.ac.uk/54967, title: "Read and Horton 2025, Using the Smileyometer to measure UX with children, Interacting with Computers" }
  - { id: hall-2016, resource: https://core.ac.uk/download/81672911.pdf, title: "Hall, Hume and Tazzyman 2016, Five degrees of happiness: effective smiley face Likert scales for evaluating with children, IDC 2016" }
  - { id: kuric-2023, resource: https://www.smashingmagazine.com/2023/12/five-second-testing-case-study/, title: "Kuric 2023, Five-second testing: taking a closer look at first impressions, Smashing Magazine" }
---

# Findings

The app has one parent and one keeper. Every method below has to work with a sample of
two, at home, in about ten minutes, without recording anyone. That rules out most of what
a usability lab does, and it changes what the numbers mean.

## What a sample of two can and cannot show

- Small, repeated tests find most of the problems a design has: a handful of users
  uncovers most issues, so many small rounds beat one large one.[^nn-five-users]
- The same source warns that a fix can fail or introduce new problems, so each change
  needs a fresh test.[^nn-five-users] For one household this means a check per claimed
  improvement, not one big study.
- Two people give no statistics. Scores from one pair are directional evidence about the
  app, never a measure of how usable it is for everyone, and never a measure of the
  people. A target is met or missed; there is no average to report.
- The pair learns the app. A task that was hard the first time will be easier the second
  time even if nothing changed, so a check is most informative on a screen or flow that
  is new or that changed.

## Task success

- The simplest usability metric: each person either completes the task or does not, and
  the success rate is the share who did.[^nn-success]
- Partial credit is allowed as named levels (for example: done alone, done with a minor
  issue, done with a major issue, not done). Report each level by name; do not turn the
  levels into numbers and average them, because they are ordinal labels.[^nn-success]
- For the home check, three levels are enough: **alone**, **with a hint**, **not done**.
  "Without help" in the epic's outcome check means **alone**.

## Time on task

- Time is measured from the moment the task is read out to the moment the person says
  they are done, with a phone stopwatch. No screen capture is needed.
- With two people, a time is only useful against a fixed bar written before the check
  (the rubric's target), or against the same task's time on the proxy run. It is noisy:
  talking, a dropped tablet or a question all add seconds. Round to 5 seconds.
- Response-time limits give the machine side of the bar: about 0.1 s feels instant,
  about 1 s keeps the user's flow of thought, and beyond about 10 s attention is
  lost.[^nn-response] These are measured on the proxy run, not with people.

## Think-aloud

- The person says what they are looking for and thinking while doing the task; the
  facilitator stays mostly quiet. It is cheap, robust and shows why a person got
  stuck.[^nn-think-aloud]
- Its weaknesses: talking continuously is unnatural, people filter what they say, and
  prompts from the facilitator can change behaviour.[^nn-think-aloud]
- Teen users tend to blame the site rather than themselves when they fail a task, so a
  teen's complaint is often a real design problem, and findings need careful
  reading.[^nn-teens]
- At home, think-aloud is **light and optional**: the parent asks "what are you looking
  for?" only when the keeper stops, and writes down the app problem it reveals (which
  screen, which control), never the keeper's words. Nothing is recorded.

## System Usability Scale (SUS)

- Ten statements answered on a five-point agree scale, scored to 0-100. Odd items count
  as the response minus 1, even items as 5 minus the response; the sum is multiplied by
  2.5.[^mu-sus]
- The average across about 500 studies is 68; above that is above
  average.[^mu-sus]
- Sample size does not affect its reliability, so it can be used with very few people,
  but a tiny sample gives an imprecise estimate.[^mu-sus]
- The standard form alternates positive and negative statements. A positively worded
  version gives similar scores, with fewer answering and scoring
  mistakes.[^kortum-2021] That matters for a quick check on a phone, and for a younger
  reader.
- **For the parent**: the standard or the all-positive SUS, answered privately after the
  check.

## A youth-friendly form

- The Smileyometer, a row of faces from awful to brilliant, has been used to rate
  children's experiences of technology since 2002. A recent review reports it can be
  adapted for young children, that ratings can drift when several things are rated in a
  row (an order effect), and that it does let children tell products
  apart.[^read-horton-2025]
- Five-point smiley-face Likert scales are the usual form for evaluating with
  children.[^hall-2016]
- These tools were built for younger children. Teens resist anything that feels babyish,
  read less willingly and want short text,[^nn-teens] so faces may put an early-teens
  keeper off. The better fit is a **plain-words short form**: five positively worded
  statements drawn from the SUS's positive items, short sentences, and five answer words
  ("No way" to "Totally") instead of faces.
- Gap: no validated teen rewording of the SUS was found. The short form gives a 0-100
  number on the same arithmetic as the positive SUS, but it is not a SUS score and is not
  compared with 68. The rubric target for it should be set as its own bar.
- After each task, a single question ("How easy was that?") is a lighter option. The
  Single Ease Question uses a 7-point scale asked right after a task, and averages sit
  around 5.3 to 5.6, above the midpoint.[^mu-seq] At home a five-word version is enough.

## Five-second test

- A screen is shown for five seconds, then hidden, and the viewer is asked what they
  remember or what they would do first. It is good for testing whether a screen's main
  message lands, and poor for screens with several purposes.[^kuric-2023]
- Judgements about how a screen looks form within a fraction of a second and rarely
  change with more time.[^nn-first-impressions]
- At home the parent shows the keeper's home screen for five seconds and asks "what would
  you do first?". Nothing is captured: the parent notes only whether the answer was the
  screen's main action.

# What fits one household

| Method | At home | Recording needed? | What goes in the private notes |
| --- | --- | --- | --- |
| Task success | yes | no | a level per task |
| Time on task | yes | no, a stopwatch | seconds, rounded to 5 |
| Think-aloud | light, optional | no, if only app problems are noted | the screen and control that caused trouble |
| SUS (parent) | yes | no | the score |
| Plain-words short form (keeper) | yes | no | the score |
| Single ease question | optional | no | a word per task |
| Five-second test | yes | no | main action named, yes or no |
| Session replay, eye tracking, video review | no | yes | replaced by the proxy check, or dropped |

How these are combined into a ten-minute check, and where the results go, is in the
[ten-minute home check](/usability/home-check.md).
