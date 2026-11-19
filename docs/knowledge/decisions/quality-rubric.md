---
type: Decision
title: Quality rubric for look, feel and usability
description: The rubric the reviewer scores to judge polish - 37 items across visual consistency, type and colour, layout and touch, motion, sound, feedback latency, copy tone and usability, each 0-3 with anchors, a numeric target and a repeatable method on a local demo-data run - plus the pair-check targets and the baseline scores from the reviewer's first audit.
tags: [decision, quality, rubric, clean-room, accessibility, performance]
status: draft
generated: { by: codex/gpt-6, at: 2026-11-19T00:29:45Z }
sources:
  - { id: quality, resource: /quality/index.md, title: Quality measures for a game-like training app }
  - { id: heuristics, resource: /quality/usability-heuristics.md, title: Usability heuristics and severity ratings }
  - { id: sus, resource: /quality/system-usability-scale.md, title: The System Usability Scale and child-adapted versions }
  - { id: wcag, resource: /quality/wcag-22.md, title: WCAG 2.2 criteria that set measurable thresholds }
  - { id: platform, resource: /quality/platform-guidelines.md, title: Platform human interface guidelines as a quality floor }
  - { id: juice, resource: /quality/game-feel-and-juice.md, title: Game feel and juiciness }
  - { id: latency, resource: /quality/response-time-limits.md, title: Response-time limits and web performance thresholds }
  - { id: motion, resource: /quality/motion-and-reduced-motion.md, title: Motion durations and reduced motion }
  - { id: distance, resource: /quality/legibility-at-distance.md, title: Legibility at a distance }
  - { id: sound, resource: /quality/sound-levels-and-sync.md, title: Sound levels and audio-visual sync }
  - { id: visual, resource: /quality/visual-consistency.md, title: "Visual consistency, design tokens and the aesthetic-usability effect" }
  - { id: copy, resource: /quality/copy-tone-and-plain-language.md, title: Copy tone and plain language }
  - { id: measures, resource: /quality/usability-measures.md, title: "Usability measures - effectiveness, efficiency and satisfaction" }
  - { id: touch, resource: /platform/touch-targets-and-gestures.md, title: Touch targets and gestures for an iPad web app }
  - { id: ux, resource: /decisions/ux-patterns.md, title: UX patterns this app adopts }
  - { id: cdp-throttle, resource: https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setCPUThrottlingRate, title: "Chrome DevTools Protocol: Emulation.setCPUThrottlingRate" }
  - { id: pw-media, resource: https://playwright.dev/docs/api/class-page#page-emulate-media, title: "Playwright: page.emulateMedia()" }
  - { id: pw-network, resource: https://playwright.dev/docs/network, title: "Playwright: Network (routing and offline)" }
  - { id: axe, resource: https://github.com/dequelabs/axe-core, title: "axe-core: accessibility engine for automated web testing (MPL-2.0)" }
  - { id: ffmpeg-astats, resource: https://ffmpeg.org/ffmpeg-filters.html#astats, title: "FFmpeg filters documentation: astats" }
---

# Context

The owner wants the app to feel as polished and effortless on the iPad as the game-like
language app the keeper already enjoys (the "reference app"). "Polished" has to be
checkable, so this Decision turns it into a rubric with numbers. The reviewer session is
the judge: it runs the audit, scores every item and signs the result. The builder never
scores its own work.

The research behind each item is in the [quality concepts](/quality/index.md).[^quality]

## The reference app as a bar, in words only

The reference app sets the level of ambition, described here in words and never
measured: every tap answers at once, with a press you can see and often a sound; one bold,
consistent visual system runs through every screen; success gets short, layered motion
and sound, and the next step is always obvious; copy is short, warm and never a form's
voice; nothing feels like a settings page. The rubric measures **this app only**. None of
the reference app's screenshots, recordings, palette, type, sounds, copy or measured
values enter the repo, an issue or a PR, and no item compares against them
([UX Decision](/decisions/ux-patterns.md), clean room).[^ux]

# Decision

## How scoring works

- 37 items in eight groups. Each item scores 0, 1, 2 or 3 against written anchors, and
  each has a **target** level. The polish epic is done when every item scores at or
  above its target in a signed audit, and the pair check meets its targets.
- An item that measures a property of something the app does not have yet (sound files,
  motion) scores **0**, never "not applicable".
- Timing items take the **median of three runs**. Every other item is a single
  measurement, because it is deterministic.
- The reviewer posts the audit as one signed review comment: the commit, the browser
  and axe-core versions, then per item the score, the raw number or count, and a
  one-line note. A re-audit carries the previous findings forward and says, per item,
  what changed.
- A score is disputed only by the reviewer's written reasoning against this rubric;
  only the owner overrides it.

## The audit rig

Every audit runs the same way, so two runs of the same commit give the same scores.

- **App and data:** the commit under audit, started with `npm run demo` on the reviewer's
  machine; `npm run demo:reset` before each pass. Only the invented demo household (Kai
  and Sam, accounts at example.com) is used. No deployed service, no family data.
- **Browser:** Playwright's bundled Chromium, `deviceScaleFactor: 2`, headed where it
  launches. The audit records the version and whether the browser ran **headed or
  headless**. Headless Chromium grants no screen wake lock, so every player screen (K2 to
  K5) also shows the app's wake-lock fallback notice ("Screen may dim: ..."). In a headless
  run that notice is measured like any other element, since it is what a device without a
  wake lock shows, and the audit says so in its rig notes. Scores are compared across
  audits only in the same mode, as with the machine.
- **Viewports:** keeper screens at 1180 x 820 (iPad landscape) and 820 x 1180 (iPad
  portrait); parent screens at 390 x 844 (phone). These are the demo script's sizes.
- **CPU:** 4x slowdown through the DevTools protocol for every timing item, standing in
  for an older iPad.[^cdp-throttle] Other items run unthrottled.
- **Evidence:** screenshots of the demo household only, cropped to the app, PNG with no
  metadata. Recordings, if any, only of the demo cast on this local run. Evidence stays
  on the reviewer's machine unless the reviewer attaches a demo-data screenshot to the
  audit comment.

### Reliable timing and test runs

Before approving a new timing criterion, the reviewer records the reference commit,
baseline result and rig, the visible failure the limit represents, and the rule for
noise and inconclusive runs. Run the proposed criterion on the reference build first;
if the baseline cannot meet it or the measurement cannot distinguish noise from the
failure, send the plan back for revision before implementation.

The builder and reviewer coordinate so only one measurement or deploy-test run uses
the shared host at a time. Do not run either alongside a heavy build; run at most two
builds at once, and each builder stops the demo processes it started. For timed audits,
record host CPU load before and during the run, alongside the commit, rig and results.
When load exceeds about 15%, do not score an absolute timing result from that run.
If a comparison is useful, interleave reference and current builds back to back under
the same conditions, report each pair and the median difference, and label the result
as comparative. A paired result cannot establish an absolute ceiling: repeat that
measurement on a quiet host before claiming the absolute criterion passes. If load or
other interference differs materially between pairs, hold the result and rerun.

**Worked timing record:** In the [#54 interim audit](https://github.com/dandelion-love/goalie-goals/issues/54#issuecomment-6983710853),
background load made absolute timing unscorable. The [paired audit](https://github.com/dandelion-love/goalie-goals/issues/54#issuecomment-6984081470)
interleaved reference `7a201de` and current `2361cf6` at 4x CPU with demo data;
host load was 35.5% median (19–60%). The reference's quiet FL1 baseline was 72 ms.
The user-visible failure under examination was a delayed response to a tap. The paired
run reported the difference, not a clean absolute pass, and deferred the absolute reread
to a quiet audit. A new criterion would record that baseline and noise rule *before*
plan approval; this historical record illustrates the method, not such an approval.

For an unexplained flaky test, the builder records the exact test name, failing run and
evidence at the first sighting. At a second unexplained failure, open or update a
root-cause issue and pause overlapping work when confidence in the affected screens is
impaired. Preserve assertions and coverage; do not skip, retry, loosen assertions or
extend timeouts to manufacture a pass. A deploy remains blocked while its required
suite fails, until the root cause is fixed and the required verification passes.

**Worked test record:** [#122](https://github.com/dandelion-love/goalie-goals/issues/122)
names the Recovery and WeekPanel failures and the later expanded first-render failures,
including ApprovalScreens and TrainingDays. Those failures block deployment; the
inbox growth mentioned there is a hypothesis, not a confirmed cause. The issue requires
reproduction before the fix, preserved coverage and twenty consecutive full web runs.

### Audited screens

| Id | Screen | Who, viewport |
|---|---|---|
| P1 | Parent home, inbox with requests | parent, phone |
| P2 | Parent home after an approval | parent, phone |
| P3 | Parent inbox with the urgent pause item | parent, phone |
| K1 | Keeper home, Today's path | keeper, both iPad |
| K2 | Player, warm-up move on a countdown | keeper, both iPad |
| K3 | Player, timed hold set (Front plank) | keeper, both iPad |
| K4 | Player, rep set: Glute bridge set 2, after rating set 1 and skipping rest | keeper, both iPad |
| K5 | Player, rest between sets: the Front plank rest after the first rating | keeper, both iPad |
| K6 | Finish, Session done | keeper, both iPad |
| K7 | Something hurts, the report form | keeper, both iPad |
| K8 | Keeper home, training paused | keeper, both iPad |
| K9 | Keeper home after the pause is cleared | keeper, both iPad |

The **core loop run** is the demo script's sections 1 to 5 in order, from a fresh reset,
which passes through every screen above. When a later build adds a screen to the core
loop, the reviewer adds it here in the same PR that adds the screen.

### Fixed for every audit

Set in the baseline audit (#54) and reused unchanged, so later audits repeat it:

- **K4** is Glute bridge set 2, reached by rating set 1 and skipping rest.
- **K5** is the Front plank rest after the first rating.
- **Script C markers** (FL2), control label then marker text: Start session, "Knees up,
  arms swing"; Next, "Small circles, then big"; Set done, "How did set 1 look?"; the last
  Next, "Session done"; Done for today, "Keeper home"; Approve, "Parent approved Starter
  plan"; Tell my parent, "Your parent has been told"; Clear the pause, "Parent cleared the
  training pause".
- **Script H selector** (TC4): `.timer-time, .counter-value`.

## Visual consistency

**VC1 Colour palette in use.** Measure: distinct opaque colours from Script A, unioned
over all screens; plus colour literals (`#hex`, `rgb(`, `hsl(`) in `web/src` outside the
token file, counted with a search. The token file is the one stylesheet or module a build
story names as the home of the design tokens; until it exists, every literal counts. 3: at most 12 colours and no literals outside the
token file. 2: at most 16 and at most 5 literals. 1: at most 24. 0: more than 24.
**Target 3.**[^visual]

**VC2 Spacing scale.** Measure: distinct non-zero padding and gap values from Script A
(rounded to 0.5 px), unioned. 3: at most 8 values, all multiples of 4 px. 2: at most 12,
all multiples of 2 px. 1: at most 20. 0: more than 20. **Target 3.**[^visual]

**VC3 Shape.** Measure: distinct corner radii and distinct box shadows from Script A.
3: at most 4 radii and 3 shadows. 2: at most 6 radii and 5 shadows. 1: at most 10 radii.
0: more than 10 radii. **Target 3.**[^visual]

**VC4 Button styles.** Measure: distinct button looks from Script A (background, text
colour, border, radius, font size, weight, shadow), unioned over both devices.
3: at most 4 looks. 2: at most 6. 1: at most 9. 0: more than 9. **Target 3.**[^visual]

**VC5 Exercise figures.** Measure: on K2 to K4, for every exercise step of the demo
session, whether a figure (an image, SVG or canvas in the media area) and a credit line
are shown, and the figure box size. 3: every step has both, and every figure box is the
same size within 2 px. 2: every step has both. 1: at least half have a figure. 0: fewer
than half. **Target 3.**[^visual]

## Type and colour

**TC1 Text contrast.** Measure: axe-core rules `color-contrast` (AA) on every screen and
`color-contrast-enhanced` (AAA) on K2 to K5, counting failing nodes.[^axe] 3: no AA
failures, and no AAA failures on K2 to K5. 2: no AA failures. 1: 1 to 3 AA failures.
0: more than 3. **Target 3.**[^wcag]

**TC2 Control contrast.** Measure: for each button look from VC4 and each form control,
the contrast of its fill, or else its border, against the background behind it (Script
F). A radio or checkbox wrapped in a `<label>` is measured by the label's fill and border,
since the label is what the user sees and taps; a wrapped text field, textarea or select
is measured by its own border. This app's own threshold, stricter than WCAG 1.4.11,
because controls are found at a glance from the floor. 3: every control at least 3:1.
2: one control below 3:1, not a primary or safety control. 1: two or three below.
0: a primary or safety control below 3:1, or more than three below. **Target 3.**[^wcag]

**TC3 Type scale.** Measure: distinct font sizes, weights and families of text from
Script A. 3: 4 to 6 sizes, each at least 1.2 times the next smaller, 2 or 3 weights,
at most 2 families. 2: at most 8 sizes and at most 4 weights. 1: at most 12 sizes.
0: more than 12 sizes, or a single size and weight (no hierarchy). **Target 3.**[^platform]

**TC4 Timer and counter at a distance.** Measure: the rendered height of the digit 0 in
the countdown and the set or rep counter on K2 to K5 (Script H), in both iPad
orientations, smallest value. 3: at least 76 CSS px (20 arcmin at 2.5 m). 2: at least
61 px (16 arcmin at 2.5 m). 1: at least 46 px (20 arcmin at 1.5 m). 0: below 46 px.
**Target 3.**[^distance]

**TC5 Smallest text.** Measure: the smallest font size of visible text from Script A,
per screen. 3: at least 16 CSS px everywhere and at least 20 px on K2 to K5. 2: at least
14 px everywhere. 1: at least 12 px. 0: below 12 px. **Target 3.**[^platform]

## Layout and touch

**LT1 Target size.** Measure: Script D with a 44 px threshold on every screen, and with
56 px on the in-session controls of K2 to K5 (start, end or done, next, skip rest, the
form cues, Something hurts, Stop). A native input wrapped in a `<label>` is measured by
the label's box, since the label is what the user taps. Links inside running text are
exempt. 3: everything at least 44 by 44 and the in-session controls at least 56 by 56.
2: everything at least 44 by 44. 1: everything at least 24 by 24. 0: anything below 24.
**Target 3.**[^touch]

**LT2 Target spacing.** Measure: the closest gap between two separate targets on each
screen, from Script D. 3: at least 8 px everywhere. 2: at least 4 px. 1: more than 0 px.
0: two targets touch or overlap. **Target 3.**[^wcag]

**LT3 Fits the screen.** Measure: on K2 to K5 in both iPad orientations, whether the
timer or counter, the exercise name, the primary action, Something hurts and Stop are
fully inside the viewport without scrolling; and whether `overflowX` from Script D is above 0 on any
screen. 3: all in view everywhere, no horizontal scroll. 2: no horizontal scroll; one
non-safety element needs a scroll in one orientation. 1: up to three such elements.
0: horizontal scroll anywhere, Something hurts or Stop out of view, or more than three
elements out of view. **Target 3.**[^platform]

**LT4 Zoom and reflow.** Measure: keeper screens at 590 x 410 (the iPad landscape view at
200% zoom) and parent screens at 320 x 640 (the WCAG reflow width): count screens where
content or a control is lost or cut off, or where the page scrolls sideways.
3: none. 2: one screen scrolls sideways, nothing lost. 1: content lost on one or two
screens. 0: more, or a safety control lost. **Target 3.**[^wcag]

## Motion

**MO1 Motion coverage.** Measure: with Script E loaded, whether an animation
starts within 500 ms of each of seven moments: a set logged, a form cue rated, a step
advanced on the path, rest starting, the session finishing, the streak or XP changing,
and an approval leaving the parent's inbox. 3: all 7. 2: 5 or 6. 1: 2 to 4. 0: 0 or 1.
**Target 3.**[^juice]

**MO2 Pressed state.** Measure: Script G on one button of each look from VC4: whether its
computed style while held down differs from its hover style. 3: every look. 2: at least
three quarters. 1: at least a quarter. 0: fewer. **Target 3.**[^juice]

**MO3 Durations.** Measure: the finite animations Script E records during the core loop,
apart from the end-of-session celebration, and the celebration's length and whether
"Done for today" works while it runs. 3: every animation at most 400 ms; celebration at
most 2.5 s and never blocking. 2: every animation at most 500 ms; celebration at most
4 s and never blocking. 1: some animation over 500 ms. 0: any over 1 s, the celebration
blocks the button, or no motion at all. **Target 3.**[^motion]

**MO4 Reduced motion and flashing.** Measure: rerun the core loop with
`reducedMotion: 'reduce'` emulated[^pw-media] and Script E loaded; list animations that
still move (transform, translate, scale, rotate, top, left, width, height). In both modes,
list anything that flashes: an animation changing opacity or colour whose iteration lasts
under 333 ms and repeats at least 3 times. 3: nothing moves under reduced motion,
nothing flashes. 2: one movement remains, nothing flashes. 1: more remain, nothing
flashes. 0: anything flashes, or no motion at all. **Target 3.**[^motion]

**MO5 Smoothness.** Measure: with the 4x CPU slowdown, the share of animation frames
longer than 20 ms (Script E's frame log) during the session-done celebration and one
step change. 3: at most 5%. 2: at most 15%. 1: at most 30%. 0: more than 30%, or no
animation. **Target 3.**[^latency]

## Sound

Haptics are left out: Safari on iPadOS has no Vibration API.[^platform]

**SO1 Cue coverage.** Measure: Script E's sound log during the core loop, matched to seven
moments: session start, set start, set end, rest start, the last three seconds of rest,
session done, and a safety stop or pain report. 3: all 7 have a cue, and the safety cue
is a different sound from every success cue. 2: 5 or 6. 1: 1 to 4. 0: none.
**Target 3.**[^sound]

**SO2 Even levels.** Measure: peak and RMS level of every cue, by one of two methods. A
cue file the app ships is read with
`ffmpeg -hide_banner -i <file> -af astats=metadata=0 -f null -` (overall
section).[^ffmpeg-astats] A cue the app synthesises in the browser with Web Audio is
rendered with an `OfflineAudioContext` through the app's own cue code and read from the
rendered buffer (Script K). Both give peak and RMS in dBFS, scored together against the
same anchors. Each cue's tier and target RMS are those of the
[sound format](/cc0-media/sound-format.md): functional -16, celebration -18, calm -22
dBFS. The tiers are a design choice, so calm cues are meant to be quieter.
3: each cue's RMS within 1.5 dB of its tier's target, every peak at most -1.0 dB.
2: each within 3 dB. 1: each within 5 dB. 0: a peak above -0.1 dB (clipping), a cue
further off, or no files. **Target 3.**[^sound]

**SO3 Sync.** Measure: for each cue in Script E's log, its time minus the time of the
screen change for the same moment (Script E's mutation log); negative means early.
3: every cue between -45 and +125 ms. 2: every cue between -90 and +185 ms. 1: the
median within -90 to +185 ms. 0: worse, or no cues. **Target 3.**[^sound]

**SO4 Control and redundancy.** Measure four checks: a sound on/off control within two
taps of any player screen; the setting survives a reload; no sound is logged before the
first tap; every cue's moment also changes the screen. 3: all four. 2: three, including
the last. 1: two. 0: the last check fails, or no sound. **Target 3.**[^sound]

## Feedback latency

All with the 4x CPU slowdown, Script B loaded and Script E not loaded, median of three
runs.

**FL1 Tap response.** Measure: the longest interaction in the core loop (Script B,
`maxInteractionMs`). 3: at most 100 ms. 2: at most 200 ms. 1: at most 500 ms. 0: over
500 ms. **Target 3.**[^latency]

**FL2 Screen change.** Measure: Script C for eight transitions: Start session; Next on a
warm-up move; Set done to the rating; the last step to Session done; Done for today;
Approve; Tell my parent; Clear the pause. The marker text for each is the one under
"Fixed for every audit". Slowest of the eight. 3: at most 300 ms. 2: at most 1 s. 1: at most
3 s. 0: over 3 s. **Target 3.**[^latency]

**FL3 Opening the app.** Measure: reload Keeper home with the service worker installed;
Script B's `lcpMs`. 3: at most 1.0 s. 2: at most 2.5 s. 1: at most 4.0 s. 0: over 4 s.
**Target 3.**[^latency]

**FL4 Layout stability.** Measure: Script B's `cls` over the core loop and the reload.
Every tap in the core loop is a trusted Playwright click (Script C), which the browser
counts as input like a real tap, so only shifts a user would see as unexpected count.
3: at most 0.05. 2: at most 0.1. 1: at most 0.25. 0: over 0.25. **Target 3.**[^latency]

**FL5 Slow server.** Measure: with every `/api/` response delayed by 2 s through
Playwright routing,[^pw-network] tap Approve, Done for today, Tell my parent and Clear the
pause, each followed by a second tap 300 ms later, counting requests sent. For each, note
whether a pending state (disabled control, `aria-busy`, or a visible indicator) shows
within 100 ms; and whether the keeper's pause shows within 100 ms of Tell my parent.
3: pending shown for all four, no action sent twice, pause immediate. 2: pending shown for
three, no action sent twice. 1: no action sent twice. 0: any action sent twice.
**Target 3.**[^latency]

## Copy tone

Strings come from Script I on every screen; CT2 also searches the user-facing text in
`web/src` (not tests) with Script J.

**CT1 Short text.** Measure: words (whitespace-separated) per control label and per
sentence. Rules: control labels at most 3 words; sentences on K2 to K5 at most 12 words;
elsewhere at most 20. Share of strings that meet their rule. 3: 100%. 2: at least 95%.
1: at least 85%. 0: below 85%. **Target 3.**[^copy]

**CT2 No pressure.** Measure: case-insensitive matches of this list: "don't lose", "you'll
lose", "lose your", "you missed", "missed a day", "hurry", "last chance", "only N left",
"before it's too late", "don't give up", "you failed", "lazy", "disappointed", "we miss
you", "your streak will", "one more", "!!". In `web/src` only string literals and JSX
text count (Script J), never operators such as `!!` or comments. 3: none. 2: one, on a
parent-only screen. 1: one or two anywhere else. 0: three or more, or any on K7, K8 or a
stop screen. **Target 3.**[^copy]

**CT3 Feedback names the cue.** Measure: the strings shown after a form-cue rating (K3,
K4) and on K6. Each either names a cue, an exercise or an action, or grades the person
("great job", "you're amazing", "bad"). Share that name a cue, exercise or action.
3: 100%. 2: at least 90%. 1: at least 75%. 0: below 75%. **Target 3.**[^copy]

**CT4 One name per thing.** Measure: on both devices, uses of a synonym in place of a
glossary word: session (not workout), set (not round), rest (not break), XP (not points),
pause (not lock or freeze), keeper (not kid, child or player), parent, approve (not
accept or allow); and whether each action has the same label on both devices.
3: no synonyms, same labels. 2: one. 1: two or three. 0: more. **Target 3.**[^copy]

## Usability (reviewer-measured)

**US1 Heuristic problems.** Measure: walk the core loop against the ten heuristics; log
each problem with heuristic, screen, severity 0-4 and a one-line evidence note; re-check
the previous audit's list first. A severity change from the last audit needs a written
reason.[^heuristics] 3: no problem of severity 2 or more. 2: none of 3 or more. 1: one
of severity 3, none of 4. 0: any 4, or two or more of 3. **Target 3.**

**US2 Taps to finish a task.** Measure: taps on the shortest path (scrolling not counted)
from the stated screen. Targets: approve one request from P1, 2; start today's session
from K1, 1; log a set with a rating from the set screen, 3; report pain from any player
screen, 3; leave Session done, 1; clear the pause from P3, 2. 3: every task at or under.
2: one task over by one tap. 1: two tasks over, or one over by two or more. 0: the
pain-report or clear-pause task over its target. **Target 3.**[^measures]

**US3 Where am I.** Measure: whether each of these is on screen: step position on the
path and exercise name (K2 to K5); set number of total (K3, K4); time or reps left (K2 to
K4); that rest is running and for how long (K5); the number waiting (P1); that training
is paused and what happens next (K8). 3: all 6. 2: 5. 1: 3 or 4. 0: fewer.
**Target 3.**[^heuristics]

**US4 Accessibility tree.** Measure: axe-core with tags `wcag2a`, `wcag2aa`, `wcag21a`,
`wcag21aa`, `wcag22aa` on every screen, contrast rules excluded (TC1 has them); violating
nodes by impact.[^axe] 3: none. 2: no serious or critical. 1: at most 2 serious, no
critical. 0: any critical, or more than 2 serious. **Target 3.**[^wcag]

**US5 Recovery.** Measure five checks: offline (`setOffline`[^pw-network]), Keeper home
reloads and shows today's approved session with an offline note; offline, a set can be
played and logged; Stop mid-session ends on a calm screen that keeps the day; a parent's
approval can be undone or reversed from the app; a forced 500 on one API call shows a
plain message with a retry, not a blank screen or raw error. 3: all five. 2: four.
1: two or three. 0: one or none. **Target 3.**[^heuristics]

## Pair check targets (not scored in the audit)

Task success and satisfaction need the pair, so they are measured in the separate
usability check, which owns its method; this Decision sets only its targets. They are not
scored by the reviewer's audit and are not in the baseline table.[^measures]

| Measure | Target |
|---|---|
| Core tasks (approve, play a session, finish, report pain, clear a pause), each done by the person it belongs to, without help | met for the pair: every task |
| Satisfaction: the parent's SUS and the keeper's plain-words form (see the usability check) | met for the pair: both at or above the top-tenth SUS mark of 80.3 (grade A); the keeper's form is read as a signal, not against the adult benchmark[^sus] |

Targets are set for the pair, not per person. With one household, any per-person score
identifies a person, so the repo records only "met" or "not met" for each target and the
date. Scores and answers stay in the owner's private notes (usability check, AC3).

# Computation

The scripts are run by the reviewer, in a scratch folder outside the repo. Scripts A, D,
F, H and I are pasted into the page (DevTools console or Playwright `page.evaluate`);
B and E are added before the first navigation with `context.addInitScript`; C and G are
Playwright code; K runs with `page.evaluate` once the app has loaded.

## Setup

```js
// Playwright, run from a scratch folder. Timing passes: Script B only.
const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
await context.addInitScript({ path: 'script-b.js' });           // add script-e.js for motion and sound passes
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });  // timing items only
await page.goto('http://localhost:8080/api/dev/as?account=kai@example.com');
await page.goto('http://localhost:8080/');
// MO4: await page.emulateMedia({ reducedMotion: 'reduce' });
// FL5: await page.route('**/api/**', async r => { await new Promise(s => setTimeout(s, 2000)); await r.continue(); });
// US5: await context.setOffline(true);
```

## Script A: style census (one screen)

```js
(() => {
  const seen = { colours: new Set(), spacing: new Set(), radii: new Set(), shadows: new Set(),
    sizes: new Set(), weights: new Set(), families: new Set(), buttons: new Set() };
  const clear = c => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    if (!r.width || !r.height || s.visibility === 'hidden' || s.opacity === '0') continue;
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      seen.colours.add(s.color); seen.sizes.add(parseFloat(s.fontSize));
      seen.weights.add(s.fontWeight); seen.families.add(s.fontFamily);
    }
    if (!clear(s.backgroundColor)) seen.colours.add(s.backgroundColor);
    if (parseFloat(s.borderTopWidth) > 0 && !clear(s.borderTopColor)) seen.colours.add(s.borderTopColor);
    if (e instanceof SVGElement) for (const p of ['fill', 'stroke']) if (s[p] !== 'none' && !clear(s[p])) seen.colours.add(s[p]);
    for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'rowGap', 'columnGap']) {
      const v = parseFloat(s[p]); if (v > 0) seen.spacing.add(Math.round(v * 2) / 2);
    }
    if (parseFloat(s.borderTopLeftRadius) > 0) seen.radii.add(s.borderTopLeftRadius);
    if (s.boxShadow !== 'none') seen.shadows.add(s.boxShadow);
    if (e.matches('button, [role="button"]') && !e.disabled) seen.buttons.add([s.backgroundColor, s.color,
      `${s.borderTopWidth} ${s.borderTopColor}`, s.borderTopLeftRadius, s.fontSize, s.fontWeight, s.boxShadow].join(' | '));
  }
  return Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v].sort()]));
})()
```

## Script B: timing probe (init script)

```js
(() => {
  const a = (window.__audit = { events: [], lcp: 0, shifts: [] });
  const observe = (type, fn, opts = {}) => {
    try { new PerformanceObserver(l => l.getEntries().forEach(fn)).observe({ type, buffered: true, ...opts }); } catch {}
  };
  observe('event', e => { if (e.interactionId) a.events.push({ id: e.interactionId, name: e.name, ms: e.duration }); }, { durationThreshold: 16 });
  observe('largest-contentful-paint', e => { a.lcp = e.startTime; });
  observe('layout-shift', e => { if (!e.hadRecentInput) a.shifts.push({ at: e.startTime, v: e.value }); });
  a.summary = () => {
    const byId = {}; for (const e of a.events) byId[e.id] = Math.max(byId[e.id] || 0, e.ms);
    let cls = 0, cur = 0, start = -1, last = -1;
    for (const s of a.shifts) {
      if (start < 0 || s.at - last > 1000 || s.at - start > 5000) { cur = 0; start = s.at; }
      cur += s.v; last = s.at; cls = Math.max(cls, cur);
    }
    return { maxInteractionMs: Math.max(0, ...Object.values(byId)), lcpMs: Math.round(a.lcp), cls: +cls.toFixed(3) };
  };
})();
```

Read the result with `page.evaluate(() => window.__audit.summary())` at the end of the
run. Interactions under 16 ms are not recorded, which only hides fast ones.

## Script C: tap to next screen (Playwright)

```js
async function tapToScreen(page, label, marker, timeoutMs = 10000) {
  const controls = 'button, a, [role="button"]';
  const exact = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
  const control = page.locator(controls).filter({ hasText: exact })
    .or(page.locator(`:is(${controls})[aria-label="${label}"]`)).first();
  if (!(await control.count())) return { label, error: 'control not found' };
  const armed = await page.evaluate(([marker, timeoutMs]) => {
    if (document.body.innerText.includes(marker)) return false;
    window.__tap = new Promise(done => addEventListener('pointerdown', e => {
      const t0 = e.timeStamp;   // the tap itself, not Playwright's round trip
      const tick = () => {
        if (document.body.innerText.includes(marker)) return requestAnimationFrame(() => done(Math.round(performance.now() - t0)));
        if (performance.now() - t0 > timeoutMs) return done(Infinity);
        requestAnimationFrame(tick);
      };
      tick();
    }, { capture: true, once: true }));
    return true;
  }, [marker, timeoutMs]);
  if (!armed) return { label, error: 'marker already on screen' };
  await control.click();   // a trusted click: the browser counts it as input, like a real tap
  return { label, ms: await page.evaluate(() => window.__tap) };
}
```

Script C clicks with Playwright's `locator.click()`, never the page's `element.click()`.
A trusted click marks the layout shifts right after it as caused by input, as a real tap
does, so FL4 counts only the shifts a user would see as unexpected. The time runs from
the click's `pointerdown` to the frame after the marker text appears.

## Script D: targets, spacing and sideways scroll

```js
((min = 44) => {
  const sel = 'button, a[href], input, select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [tabindex]:not([tabindex="-1"])';
  const inText = e => e.matches('a[href]') && getComputedStyle(e).display === 'inline' && e.parentElement.closest('p, li');
  const hit = e => (e.matches('input, select, textarea') && e.closest('label')) || e;   // a wrapped native input is its label
  const boxes = [...new Set([...document.querySelectorAll(sel)].filter(e => !inText(e)).map(hit))]
    .map(e => ({ e, r: e.getBoundingClientRect(), name: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 40) }))
    .filter(b => b.r.width > 0 && b.r.height > 0);
  const small = boxes.filter(b => b.r.width < min - 0.01 || b.r.height < min - 0.01)
    .map(b => ({ name: b.name, w: Math.round(b.r.width), h: Math.round(b.r.height) }));
  const gap = (p, q) => Math.max(0, Math.max(p.left, q.left) - Math.min(p.right, q.right), Math.max(p.top, q.top) - Math.min(p.bottom, q.bottom));
  let closest = { px: Infinity };
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    if (boxes[i].e.contains(boxes[j].e) || boxes[j].e.contains(boxes[i].e)) continue;
    const px = gap(boxes[i].r, boxes[j].r);
    if (px < closest.px) closest = { px: Math.round(px), a: boxes[i].name, b: boxes[j].name };
  }
  return { targets: boxes.length, small, closest, overflowX: document.scrollingElement.scrollWidth - innerWidth };
})(44)
```

## Script E: motion and sound probe (init script)

```js
(() => {
  const a = (window.__motion = { anims: new Map(), sounds: [], changes: [], frames: [] });
  setInterval(() => {
    for (const x of document.getAnimations()) {
      const t = x.effect?.getComputedTiming?.() ?? {};
      const props = [...new Set((x.effect?.getKeyframes?.() ?? []).flatMap(k => Object.keys(k)))]
        .filter(k => !['offset', 'computedOffset', 'easing', 'composite'].includes(k));
      const name = x.animationName || x.transitionProperty || x.id || 'script';
      const key = `${name}|${t.duration}|${props}`;
      if (!a.anims.has(key)) a.anims.set(key, { name, ms: t.duration, iterations: t.iterations, props, at: Math.round(performance.now()) });
    }
  }, 50);
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) { a.sounds.push({ at: performance.now(), src: this.currentSrc || this.src }); return play.apply(this, args); };
  if (window.AudioBufferSourceNode) {
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) { a.sounds.push({ at: performance.now(), src: 'webaudio', s: this.buffer?.duration }); return start.apply(this, args); };
  }
  addEventListener('DOMContentLoaded', () => new MutationObserver(() => a.changes.push(performance.now()))
    .observe(document.body, { subtree: true, childList: true, characterData: true }));
  let last = performance.now();
  const frame = t => { a.frames.push({ at: t, ms: t - last }); last = t; requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
})();
```

MO1 and MO3 read `[...window.__motion.anims.values()]`; MO5 reads the share of `frames`
with `ms > 20` between the two moments; SO1 and SO3 pair each `sounds` entry with the
nearest `changes` time. Script E adds work to every frame, so it is never loaded during
a latency pass.

## Script F: contrast of a control against what is behind it

```js
(() => {
  const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (p, q) => { const [x, y] = [lum(p), lum(q)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
  const clear = c => c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);
  const behind = e => { for (let n = e.parentElement; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (!clear(c)) return c; } return 'rgb(255, 255, 255)'; };
  const hit = e => (e.matches('input[type="radio"], input[type="checkbox"]') && e.closest('label')) || e;   // a wrapped radio or checkbox is its label; a field, textarea or select is itself
  return [...new Set([...document.querySelectorAll('button, [role="button"], input, select, textarea')].map(hit))].map(e => {
    const s = getComputedStyle(e), bg = behind(e);
    const fill = clear(s.backgroundColor) ? 1 : ratio(s.backgroundColor, bg);
    const border = parseFloat(s.borderTopWidth) > 0 && !clear(s.borderTopColor) ? ratio(s.borderTopColor, bg) : 1;
    return { name: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 40), ratio: Math.max(fill, border) };
  });
})()
```

## Script K: levels of synthesised cues (Playwright `page.evaluate`)

```js
async () => {
  // The app's sound module exposes window.__cues = { names, render(ctx, name), seconds(name) }:
  // render() schedules the named cue at time 0 on ctx.destination of any BaseAudioContext,
  // the same function the app calls with its live AudioContext.
  const cues = window.__cues;
  if (!cues) return { error: 'no window.__cues hook' };
  const rate = 48000, floor = 0.001;   // -60 dBFS: leading and trailing samples below it are trimmed
  const db = v => (v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -Infinity);
  const out = [];
  for (const name of cues.names) {
    const seconds = (cues.seconds?.(name) ?? 3) + 0.5;
    const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
    await cues.render(ctx, name);
    const buf = await ctx.startRendering();
    const chans = [...Array(buf.numberOfChannels)].map((_, c) => buf.getChannelData(c));
    const loud = i => chans.some(d => Math.abs(d[i]) >= floor);
    let first = 0, last = buf.length - 1;
    while (first < buf.length && !loud(first)) first++;
    while (last > first && !loud(last)) last--;
    let peak = 0, sum = 0, n = 0;
    for (const d of chans) for (let i = first; i <= last; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++; }
    out.push({ name, peakDb: db(peak), rmsDb: db(n ? Math.sqrt(sum / n) : 0), ms: Math.round(((last - first + 1) / rate) * 1000) });
  }
  return out;
}
```

The render length is set by the audit, not by the cue, so Script K trims the silence before
and after the cue before taking RMS; a shipped file is read whole by ffmpeg. Synthesised
cues with no `window.__cues` hook cannot be measured, so SO2 scores 0 for them, as for no
files.

## Script G: pressed state (Playwright)

```js
async function looksPressed(page, locator) {
  const props = ['transform', 'translate', 'scale', 'backgroundColor', 'boxShadow', 'borderTopColor', 'filter', 'opacity'];
  const read = () => locator.evaluate((e, ps) => { const s = getComputedStyle(e); return ps.map(p => s[p]).join('|'); }, props);
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  const hover = await read();
  await page.mouse.down();
  await page.waitForTimeout(150);
  const held = await read();
  await page.mouse.move(0, 0);   // leave before releasing, so no click fires
  await page.mouse.up();
  return hover !== held;
}
```

## Script H: digit height

```js
(async selector => {
  await document.fonts.ready;
  const e = document.querySelector(selector), s = getComputedStyle(e);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const m = ctx.measureText('0');
  return { fontSize: s.fontSize, digitPx: +(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent).toFixed(1) };
})('.timer-time, .counter-value')
```

## Script I: visible strings

```js
(() => {
  const shown = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const controls = [...document.querySelectorAll('button, a[href], [role="button"]')].filter(shown)
    .map(e => (e.innerText || e.getAttribute('aria-label') || '').trim()).filter(Boolean);
  const text = [...document.querySelectorAll('body *')]
    .filter(e => shown(e) && !e.closest('button, a[href], [role="button"]'))
    .map(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim())
    .filter(Boolean);
  return { controls, sentences: text.flatMap(t => t.split(/(?<=[.!?])\s+/)) };
})()
```

## Script J: user-facing text in the source (Node)

```js
// node script-j.mjs <path to web/src>: prints CT2 matches in string literals and JSX text only.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const terms = ["don't lose", "you'll lose", 'lose your', 'you missed', 'missed a day', 'hurry', 'last chance',
  /only \d+ left/, "before it's too late", "don't give up", 'you failed', 'lazy', 'disappointed', 'we miss you',
  'your streak will', 'one more', '!!'];
const files = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; })
  .filter(p => /\.(tsx?|jsx?)$/.test(p) && !/\.test\.|__tests__/.test(p));
const texts = src => {   // string and template literals, then JSX text, with comments removed
  const out = []; let code = '', i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; continue; }
    if ((c === '"' || c === "'" || c === '`') && !/[a-z0-9]/i.test(src[i - 1] || '')) {   // not an apostrophe in a word
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') { s += src[j + 1]; j += 2; } else s += src[j++]; }
      out.push(s); code += ' '; i = j + 1; continue;
    }
    code += c; i++;
  }
  for (const m of code.matchAll(/>((?:(?![<>{}]).)+)</gs)) if (/[a-z]/i.test(m[1])) out.push(m[1].trim());
  return out;
};
for (const f of files(process.argv[2] || 'web/src')) for (const t of texts(readFileSync(f, 'utf8'))) {
  const low = t.toLowerCase();
  for (const term of terms) if (typeof term === 'string' ? low.includes(term) : term.test(low)) console.log(`${f}: ${term} :: ${t.slice(0, 80)}`);
}
```

Script J reads JSX text as the text between a `>` and the next `<` outside braces and
quotes. An apostrophe straight after a letter or digit (as in "don't") is text, not a
quote. A comparison such as `a > b < c` in code can surface as a hit; the reviewer drops
any hit that is not copy and says so in the note. Template literals are read whole,
`${...}` included.

## axe-core

Install axe-core in the scratch folder, add `axe.min.js` to the page with
`page.addScriptTag`, then run `axe.run(document, { runOnly: { type: 'tag', values: [...] } })`
for US4, and `axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast', 'color-contrast-enhanced'] } })`
for TC1.[^axe]

# Items reworded or dropped (AC5)

| Item | Outcome | Why |
|---|---|---|
| "Feels as polished as the reference app" | Dropped | No method or threshold without measuring the reference app, which the clean room forbids. The bar is described in words; the 37 items are what is scored. |
| Tone of voice on the four dimensions | Dropped | Two readings of the same screen can place it differently.[^copy] Replaced by CT1 to CT4, which count. |
| Reading grade by formula | Reworded as CT1 | Formula tools count syllables differently, so the same text scores differently by tool. Word counts do not. |
| Illustration style matching | Reworded as VC5 | "Same style" is taste; presence, credit and a fixed figure box are countable. |
| Haptics | Dropped | Safari on iPadOS has no Vibration API.[^platform] |
| Safe-area insets | Dropped from the audit | Chromium reports zero insets, so the local rig cannot measure them; the platform concept covers them. |
| Pair satisfaction and task success | Moved out of the audit | They need the pair; the pair check owns them, with the targets above. |
| Delight or fun as rated by the reviewer | Dropped | A single rater's taste, not repeatable. |

# Baseline

Scores are copied from the reviewer's signed audit comment on #54; the builder never writes scores.

| Audit | Date (UTC) | Commit | Signed comment | VC1 | VC2 | VC3 | VC4 | VC5 | TC1 | TC2 | TC3 | TC4 | TC5 | LT1 | LT2 | LT3 | LT4 | MO1 | MO2 | MO3 | MO4 | MO5 | SO1 | SO2 | SO3 | SO4 | FL1 | FL2 | FL3 | FL4 | FL5 | CT1 | CT2 | CT3 | CT4 | US1 | US2 | US3 | US4 | US5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Target (from this Decision, not a score) | | | | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |
| Baseline | 2026-11-18 | 8bb86c7 | [#54 audit](https://github.com/dandelion-love/goalie-goals/issues/54#issuecomment-6970879591) | 1 | 1 | 1 | 3 | 1 | 0 | 0 | 0 | 2 | 1 | 0 | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 3 | 3 | 0 | 3 | 1 | 3 | 2 | 3 | 0 | 3 | 2 | 0 | 1 |
| Re-audit | 2026-11-18 | e735b71 | [#54 re-audit](https://github.com/dandelion-love/goalie-goals/issues/54#issuecomment-6977002578) | 3 | 2 | 3 | 1 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3* | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 |
| Re-audit | 2026-11-18 | 34134c3 | [#54 re-audit](https://github.com/dandelion-love/goalie-goals/issues/54#issuecomment-6978009382) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 |

\* The reviewer scored SO2 by its tier ruling, which the SO2 rule now states (method
changes below). The e735b71 re-audit totals 103 of 111, with 30 of 37 items at target, per
the reviewer's correction on #54. The 34134c3 re-audit totals 108 of 111, with 34 of 37 items
at target.

## Method changes

**2026-11-18 (UTC).** Made after the baseline audit and before any re-audit, from the
reviewer's method notes on #54. They do not change the baseline scores above.

- Scripts D and F (LT1, TC2): a native input wrapped in a `<label>` is measured by the
  label's box and colours.
- LT3: anchor 0 also covers more than three elements out of view, so the anchors leave
  no gap.
- CT2: `web/src` is searched only in user-facing string literals and JSX text (Script
  J), not operators or comments.
- SO2: cues synthesised with Web Audio are rendered with an `OfflineAudioContext` through
  the app's own cue code and read from the buffer (Script K), against the same anchors;
  shipped files are still read with ffmpeg.
- Rig: each audit records headed or headless, and a headless run measures the wake-lock
  fallback notice like any other element; the Script C markers, the Script H selector
  and the K4 and K5 definitions from the baseline are fixed for every audit.

**2026-11-18 (UTC), after the e735b71 re-audit.** Made after the full re-audit at
e735b71 and before the next audit, from the reviewer's method notes and SO2 ruling on
#54. They do not change any score above.

- Script C (FL2, FL4) dispatches trusted clicks (Playwright `locator.click()`, not
  `element.click()`), so FL4 counts only shifts users would see.
- Script F (TC2) measures a wrapped textarea or select by its own border, not its
  label's; the label rule stays for radios and checkboxes.
- SO2: each cue's RMS within 1.5 dB of its tier's target in sound-format.md (functional
  -16, celebration -18, calm -22 dBFS), every peak at most -1.0 dB. The 2, 1 and 0
  anchors widen the tolerance to 3 dB, 5 dB and more. This replaces the "within 3 dB of
  each other" rule, per the judge's ruling.

# Consequences

- Build stories in the polish epic each name the rubric items they raise and the score
  they aim for; a story passes when the reviewer's audit shows the item at target.
- Some anchors are this app's own thresholds (VC1 to VC4 counts, CT1 word limits, TC2 on
  every control). They are written down so the score is repeatable; changing one is a
  change to this Decision, made before an audit, never to rescue a score.
- The rig is Chromium; Safari on iPadOS can differ in rendering, audio and timing. An
  item that looks fine in the rig but not on the iPad is raised by the owner and becomes
  a rig change here.
- Timing scores depend on the reviewer's machine. Each audit records it, and an item's
  score is compared across audits only on the same machine.

[^quality]: Quality concepts index.
[^heuristics]: Usability heuristics and severity ratings.
[^sus]: The System Usability Scale and child-adapted versions.
[^wcag]: WCAG 2.2 criteria with thresholds.
[^platform]: Platform guidelines as a quality floor.
[^juice]: Game feel and juiciness.
[^latency]: Response-time limits and web thresholds.
[^motion]: Motion durations and reduced motion.
[^distance]: Legibility at a distance.
[^sound]: Sound levels and audio-visual sync.
[^visual]: Visual consistency and design tokens.
[^copy]: Copy tone and plain language.
[^measures]: Usability measures.
[^touch]: Touch targets and gestures.
[^ux]: UX patterns Decision.
[^cdp-throttle]: Chrome DevTools Protocol, CPU throttling.
[^pw-media]: Playwright, emulateMedia.
[^pw-network]: Playwright, network routing and offline.
[^axe]: axe-core on GitHub.
[^ffmpeg-astats]: FFmpeg, astats filter.

**2026-11-18 (UTC), after the 34134c3 re-audit.** From the judge's LT1 ruling on #102.
It does not change any score above: LT1 stays 2 in the 34134c3 row.

- Script D (LT1) ignores sub-pixel rounding under 0.01 px: a box counts as small only
  below the minimum by more than 0.01 px, so a press transform's floating-point noise is
  not read as a short button.
