---
type: Decision
title: UX patterns this app adopts
description: Which game-like learning-app patterns the app adopts, how each is adapted to physical training done by a keeper and a parent together, and which it leaves out and why.
tags: [decision, ux, clean-room, safety, children]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: path, resource: /ux/lesson-path.md, title: The lesson path }
  - { id: bite, resource: /ux/bite-size-sessions.md, title: Bite-size sessions }
  - { id: feedback, resource: /ux/immediate-feedback.md, title: Immediate feedback }
  - { id: celebrate, resource: /ux/celebration-moments.md, title: Celebration moments }
  - { id: tone, resource: /ux/character-and-tone.md, title: Character and tone }
  - { id: sound, resource: /ux/sound-and-haptics.md, title: Sound and haptics }
  - { id: onboarding, resource: /ux/onboarding.md, title: Onboarding }
  - { id: notify, resource: /ux/notifications.md, title: Notifications }
  - { id: visual, resource: /ux/visual-language.md, title: Visual language }
  - { id: oss, resource: /ux/open-source-resources.md, title: Open-source building blocks for game-like UX }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules (research item 3) }
---

# Context

The keeper enjoys a well-known game-like language app (the "reference app"). We borrow
the *mechanisms* that make such apps easy to open every day, not their look. Two
differences shape every choice: the work is **physical** (injury risk, rest needed, phone
on the floor), and it is done by **two people together** (a teen and a parent), so the app
is a shared plan more than a solo game. Safety rules come from the
[training rules](/decisions/training-rules.md) decision[^training-rules] and always win
over anything here.

# Decision: adopted, with adaptations

| Pattern | Adopt? | How it is adapted |
|---|---|---|
| Lesson path[^path] | Yes | A guided path of sessions in a fixed safe order (warm-up, technique, power, cool-down) and units that follow the training plan's weekly progression. Rest and recovery days appear *on* the path as completed-by-resting steps, never as locked or missed ones. Locks only enforce safe ordering (no power work before the technique step is passed), never paywalls. |
| Bite-size sessions[^bite] | Yes | A short minimum session (technique and mobility) counts for the day; longer blocks are optional and only offered when the plan allows. Target: regular weekly frequency, not daily volume. |
| Immediate feedback[^feedback] | Yes | The parent rates form with two or three large buttons after each set; the keeper reports effort and "any pain?" in one tap. Feedback text names the cue, not the person. A pain or warning-sign answer ends the exercise at once and follows the training rules. |
| Celebration moments[^celebrate] | Yes, toned down | One short end-of-session moment that celebrates both people and shows consistency and form, then leads to cool-down and "done for today". No "one more?" prompt. A session stopped for safety gets a calm, positive "good call" screen and counts as a valid session. |
| Character and tone[^tone] | Partly | A warm, coach-like voice is adopted. A mascot is optional and, if made, is original. It never scolds, sulks, pleads or comments on a missed day. |
| Sound and haptics[^sound] | Yes, functional first | Audible cues for start, switch, rest and stop that carry across a room; short success sounds; optional vibration where supported. All mutable; nothing conveyed by sound or vibration alone. Original or CC0 sounds only. |
| Onboarding[^onboarding] | Yes | The parent sets up the plan, safety questions and training days; the keeper's first session is technique-only. No account wall before the first session; no name, birth date, school or club asked; an age band only. |
| Notifications[^notify] | Limited | At most one reminder a day, to the parent by default (the keeper opts in), at the time the pair chose, never in school hours or late evening, none on rest days, and they stop on their own after a few ignored days. Copy is neutral and kind; no guilt, no countdowns, no "your streak will die". |
| Visual language[^visual] | Yes, our own | Bold colour, rounded shapes, heavy rounded type, high contrast. Touch targets at least 44 by 44 CSS pixels, larger for anything tapped mid-exercise; timers readable from a few metres. Our own palette, open-licensed font, original art. |

# Decision: left out, and why

| Left out | Why |
|---|---|
| The reference app's name for any feature, its mascot or cast, art, palette, typeface, sounds, jingles and copy | Clean room (AC4): they are its brand and creative work. Each concept describes the mechanism generically; nothing here depends on copying them. |
| A character that guilts, pleads, looks sad or "chases" the user | Coded as manipulative design in research on children's apps; turns a coach into pressure.[^tone] |
| Reminder copy optimised by experiment for click-through | Optimising for opens tends to select urgency and guilt; teens already get hundreds of notifications a day.[^notify] |
| Energy or lives that run out and stop a session after mistakes | In a physical session a "mistake" is a form break; the right response is coaching or a stop, not a penalty or a wait timer. Also a common route to pay-to-continue. |
| Timed or "beat the clock" pressure on drills | Speed pressure trades away form and safety; timers here only time work and rest intervals. |
| Locked content behind payment, ads, or purchases of any kind | The app is for one family; any purchase flow aimed at a teen is a dark pattern by the regulator guidance cited in the concepts. |
| "One more session" prompts, autoplay of the next session, endless feeds | Contradicts natural stopping points and rest; recovery is part of training. |
| Sound or haptics as the only signal | Accessibility, and the phone is often out of reach or muted. |

# Building blocks (do not reinvent)

Celebration via canvas-confetti (ISC), designer animation via lottie-web (MIT) or the Rive
runtime (MIT), sound via howler.js (MIT) with CC0 Kenney sound packs, icons via Lucide
(ISC) or Phosphor (MIT), the Nunito typeface (OFL), accessible primitives via Radix (MIT),
offline and push plumbing via Workbox (MIT). Details and caveats in the
[open-source reference](/ux/open-source-resources.md).[^oss]

# Consequences

- Screens are designed for the floor, not the hand: large, few, high-contrast.
- Every session-ending path (finished, stopped early, stopped for pain) has its own
  positive end screen, and none of them is a failure state.
- Progression and reward rules live in the
  [progression design](/decisions/progression-design.md) decision; this decision only
  governs how they look and feel.

[^path]: The lesson path
[^bite]: Bite-size sessions
[^feedback]: Immediate feedback
[^celebrate]: Celebration moments
[^tone]: Character and tone
[^sound]: Sound and haptics
[^onboarding]: Onboarding
[^notify]: Notifications
[^visual]: Visual language
[^oss]: Open-source building blocks
[^training-rules]: Training rules decision
