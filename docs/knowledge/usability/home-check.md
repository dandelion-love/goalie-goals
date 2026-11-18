---
type: Playbook
title: The ten-minute home check
description: How the parent and the keeper check a claimed usability improvement at home in about ten minutes, how the reviewer scores it, the proxy check agents run between checks, and how results stay out of the repo.
tags: [usability, playbook, privacy, proxy-check, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
sources:
  - { id: methods, resource: /usability/usability-methods.md, title: "Lightweight usability methods for one household" }
  - { id: nn-success, resource: https://www.nngroup.com/articles/success-rate-the-simplest-usability-metric/, title: "Nielsen and Budiu 2001, Success rate: the simplest usability metric, Nielsen Norman Group" }
  - { id: nn-think-aloud, resource: https://www.nngroup.com/articles/thinking-aloud-the-1-usability-tool/, title: "Nielsen 2012, Thinking aloud: the number one usability tool, Nielsen Norman Group" }
  - { id: nn-teens, resource: https://www.nngroup.com/articles/usability-of-websites-for-teenagers/, title: "Kendrick and Nielsen 2019, Teenagers' UX: designing for teens, Nielsen Norman Group" }
  - { id: nn-response, resource: https://www.nngroup.com/articles/response-times-3-important-limits/, title: "Nielsen 1993, Response times: the 3 important limits, Nielsen Norman Group" }
  - { id: mu-sus, resource: https://measuringu.com/sus/, title: "Sauro 2011, Measuring usability with the System Usability Scale (SUS), MeasuringU" }
  - { id: kortum-2021, resource: https://pubmed.ncbi.nlm.nih.gov/31913715/, title: "Kortum, Acemyan and Oswald 2021, Is it time to go positive? Assessing the positively worded System Usability Scale, Human Factors" }
  - { id: autonomy, resource: /parent-approval/teen-autonomy-in-youth-sport.md, title: "Age-appropriate autonomy for an early-teens athlete" }
  - { id: baseline, resource: /parent-approval/minors-privacy-regimes.md, title: "Privacy rules for minors' data, compared: common baseline" }
  - { id: demo, resource: https://github.com/dandelion-love/goalie-goals/blob/main/docs/demo.md, title: "The five-minute demo: the local demo run with the invented cast" }
  - { id: aria-snapshots, resource: https://playwright.dev/docs/aria-snapshots, title: "Playwright: ARIA snapshots" }
  - { id: pw-emulation, resource: https://playwright.dev/docs/emulation, title: "Playwright: emulation of devices and viewports" }
  - { id: axe, resource: https://github.com/dequelabs/axe-core, title: "axe-core: accessibility rules engine" }
  - { id: wcag-target, resource: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, title: "W3C: Understanding WCAG 2.2 success criterion 2.5.8 Target Size (Minimum)" }
---

# When to run it

- When a build story claims the app is easier to use, after it is merged and the pair has
  the new version on their own devices.
- At most once a week, and never in place of training: the check rides on the start of a
  normal session, and the session carries on afterwards.
- Between home checks, agents run the proxy check (below) on every story that touches a core-loop screen.

The methods behind each step, and their limits with a sample of two, are in the methods
survey.[^methods]

# Before you start (1 minute)

- The keeper agrees to do it today, and knows it can stop at any time. Say it plainly:
  "We're testing the app, not you. If something's confusing, that's the app's fault."
  Teens tend to blame the app when they fail anyway, and that is the useful
  direction.[^nn-teens] Asking first, and keeping the keeper's choice real, follows the
  autonomy-supportive approach the app is built on.[^autonomy]
- The parent has the private notes open (the owner's own notes, not the app, not the
  repo) and a phone stopwatch. No camera, no microphone, no screen recording.
- The iPad is on the keeper's home screen; the parent's phone is on the parent's home
  screen.
- Read the story's claim and pick the tasks below that it touches, plus K1 and P1 every
  time. A task the story changed goes first, before the pair is warmed up on the rest.

# The core tasks (6 minutes)

Each task is read out as written. Start the stopwatch when you finish reading, stop it
when the person says "done" or gives up. Give a hint only if asked, or after 60 seconds of
no progress; then the result is **with a hint**.

## Five-second look (keeper, 30 seconds)

Show the keeper's home screen for five seconds, then turn the iPad over and ask:
"What would you do first?" Note **yes** if the answer is the screen's main action (today's
session), else **no**.

## Keeper tasks (iPad)

| # | Read out | Done when |
| --- | --- | --- |
| K1 | "Start today's training." | The first step of today's session is on screen. |
| K2 | "Do the first exercise, and tell the app how one set looked." | One set is ended and one cue is tapped. |
| K3 | "Show me where you'd tell me if something hurt. Point, don't tap." | The keeper points at **Something hurts**. |
| K4 | At the end of the session: "Finish up and find our team streak." | The finish screen is closed and the team streak is on screen. |

K3 is point-only so the check never pauses real training. K4 happens when the session
ends, minutes later; it still counts as part of the check.

## Parent tasks (phone)

| # | Read out | Done when |
| --- | --- | --- |
| P1 | "Find what's waiting for you, and approve or decline one." | One request is approved or declined. If nothing is waiting, mark **not run**. |
| P2 | "Find how many days in a row we've trained together." | The team streak is named. |
| P3 | "Show me how you'd clear a pause if training were paused. Point, don't tap." | The parent points at where the pause item and its clear control would appear. |

## Light think-aloud (optional)

If someone stops, ask "What are you looking for?" once.[^nn-think-aloud] Write down the
**app** problem it shows: the screen, the control, what was expected. Never the person's
words, and never who said it.

# What the parent notes

For each task, in the private notes only:

- **Result**: alone, with a hint, not done, or not run.[^nn-success]
- **Time**: seconds, rounded to 5.
- **Wrong taps**: a count.
- **App problem**: one line, about the app ("the approve control sat below the fold"), if
  there was one.

Plus the five-second look (yes or no) and the two questionnaire scores below.

# The questions (2 minutes)

Asked after the tasks, each person on their own, answers written by the person into the
private notes or told to the parent.

## The keeper: plain-words short form

Five statements, each answered **No way / Not really / Kind of / Yeah / Totally** (1 to 5).
No faces: they read as babyish to a teen.[^nn-teens][^methods]

1. "I'd want to use this most days."
2. "It was easy to work out what to do."
3. "I could do it without asking for help."
4. "Things were where I expected them."
5. "I felt sure of what I was doing."

Score: add the five answers, subtract 5, multiply by 5, for 0 to 100. All statements are
positive, so there is nothing to flip.[^kortum-2021] It is not a SUS score and is not
compared with the SUS average; it is compared only with its rubric target.

## The parent: the System Usability Scale

The standard ten-item SUS, or its all-positive version, scored the usual
way.[^mu-sus][^kortum-2021]

# What the reviewer scores

The reviewer session is the judge, against the usability targets in the rubric Decision
(#54). This page does not set those targets; it defines what evidence each kind of target
gets.

1. In the owner's private notes, the owner (or the owner's own session) compares each
   result with its rubric target and marks it **pass** or **fail**. Scores, times and
   answers never leave the notes.
2. The owner gives the reviewer, in a private session, the pass or fail for each target
   and the list of app problems, written about the app with no names and no "the keeper
   said".
3. The reviewer judges each target against the rubric and the app problems against the
   proxy check (did the proxy run see the same problem?), and posts its verdict on the
   story or PR: a table of **target, pass or fail, date**, plus the app problems as
   findings, with its written reasoning.
4. A target the check could not run (for example P1 with nothing waiting) is
   **not run**, not pass. The reviewer scores it from the proxy check and marks it
   **proxy**.

A note for the rubric (#54): a target set per pair ("both complete K1-K4 and P1-P3
alone") reveals less than one set per person. Where a per-person target is needed, its
pass or fail is still the only thing that leaves the notes.

# Privacy

There is one household, so any per-person number in the repo identifies a person. The
rules, which this check never relaxes:

- **No recording of the keeper or the parent**: no video, audio, photo or screen
  recording, no screenshots of their devices during the check, no session-replay or
  analytics tool, no third-party testing service.
- **Results are counts and scores only**: levels, seconds, tap counts, yes or no,
  questionnaire scores. No quotes, no descriptions of the person, no body or mood notes.
- **Results live in the owner's private notes**, outside the repo, the board and the app's
  shared data. They are not pasted into an agent session that writes to the repo, except
  as the pass or fail per target in step 2 above.
- **The repo records only pass or fail against each rubric target, and the date.** Never a
  person's score, time, answers, or which of the two passed or failed. This holds for
  issues, comments, PRs, commit messages, docs and test fixtures.
- App problems are written about the app. "The finish button was missed" is fine; who
  missed it is not written.
- Screenshots that illustrate a finding come from the local demo run with the invented
  cast, never from the family's devices.[^demo]
- Collecting the least needed, keeping it with the parent, and not sharing it follows the
  common baseline of the minors' privacy regimes the app already meets.[^baseline]
- Before posting the verdict, the reviewer's clean-room read checks it holds nothing
  beyond pass or fail per target, the date and app-only findings.

# The proxy check between home checks

Agents run this on the local demo run with the demo household and the mock identity, so
it involves no real person and its results can be posted in full.[^demo] The reviewer
scores it; the builder never scores its own run.

## Setup

- Start the demo server (`npm run demo`) and reset it (`npm run demo:reset`) before each
  run, as in the demo script.[^demo]
- Drive it with the browser automation the session has (a Playwright browser, or the
  app's built-in browser pane), with viewports emulated at:[^pw-emulation]
  - **phone**: 390 x 844, as the parent;
  - **iPad landscape**: 1180 x 820, as the keeper;
  - **iPad portrait**: 820 x 1180, as the keeper.

## Scripted walkthroughs

Run each core task (K1-K4, P1-P3, and the pause and clear from the demo script) as a
scripted walkthrough. Find each control **by its accessible role and name** (for example
the button "Start session", "Something hurts", "Approve", "Clear the pause"), the way a
person scans for a label, never by CSS selector. For each task and viewport, record:

| Measure | Pass when |
| --- | --- |
| Completes | Every step is found by role and name, with no dead end. |
| Steps | Taps and screens match the shortest path the story claims, or fewer. |
| In view | Each step's target is visible without scrolling sideways; on the iPad, the primary action is above the fold. |
| Feedback | Each tap shows a visible change within about 0.1 s; a wait over 1 s shows progress.[^nn-response] |
| Screen ready | Each screen is interactive within the rubric's time target. |

## Accessibility tree checks

- Take an ARIA snapshot of each core screen and compare it with the stored one: roles,
  names and order of the core controls must not change without a story saying
  so.[^aria-snapshots]
- Run an automated rules engine (axe-core) on each core screen: no serious or critical
  violations.[^axe]
- Every core control has an accessible name; every image a person needs has alternative
  text; the player's timer and the pause state are announced as text, not colour alone.
- Touch targets are at least 24 by 24 CSS pixels (WCAG 2.2, 2.5.8, AA),[^wcag-target]
  and the core-loop controls meet the larger target the rubric sets.

## Timings

Timings are machine timings, not people's: time to interactive per screen, time from tap
to visible response, and the scripted task's wall time. Each is run three times and the
median is reported, with the viewport and the commit.

## What the reviewer gets

A table per task and viewport, with pass or fail per measure, the timings, the snapshot
diff (if any) and the rule violations, posted on the story or PR. Screenshots, if any,
are from this demo run only, cropped to the app as the demo page says.[^demo]

# The replacement rule

If any part of a check can't be run without recording a person, it is **replaced by the
proxy check, or dropped**. It is never run with a recording "just this once".

| If a check would need | Then |
| --- | --- |
| A video or screen recording to time or review a task | Replaced: the parent's stopwatch at home; the proxy run's timings for the detail. |
| Audio of a think-aloud | Dropped: the parent notes only the app problem, live. |
| A screenshot of the moment someone got stuck | Replaced: reproduce the step on the demo run and screenshot that. |
| Session replay, heat maps, eye or tap tracking on the family's devices | Dropped; the proxy run's tap counts and accessibility checks stand in. |
| A remote or third-party testing tool | Dropped. |
| A task that would change real training (a real pause, a real approval of a load change) | Replaced by a point-only task at home, and the full flow on the proxy run. |
| Storing a person's answers in the repo to compare over time | Dropped: only pass or fail per target and the date are kept. |

A rubric target that can then be measured only by the proxy check is scored from it and
marked **proxy** in the reviewer's verdict.
