---
type: Research Finding
title: Legibility at a distance
description: How big type must be for a keeper to read a cue or a timer from the floor, worked out from visual angle, and what letter shapes help at a glance.
tags: [visual-identity, typography, legibility, accessibility]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: legge, resource: "https://legge.dl8.umn.edu/sites/legge.psych.umn.edu/files/2020-08/Legge%20Bigelow%202011%20Does%20size%20matter%20for%20reading%3F%20A%20review%20of%20findings%20from%20vision%20science%20and%20typography.pdf", title: "Legge and Bigelow (2011), Does print size matter for reading? A review of findings from vision science and typography, Journal of Vision" }
  - { id: dobres, resource: https://pmc.ncbi.nlm.nih.gov/articles/PMC5213401, title: "Dobres et al. (2016), Utilising psychophysical techniques to investigate the effects of age, typeface design, size and display polarity on glance legibility, Ergonomics" }
  - { id: mit-news, resource: https://news.mit.edu/2012/agelab-automobile-dashboard-fonts-1005, title: "MIT News (2012): humanist typefaces read faster at a glance" }
  - { id: capsize-metrics, resource: https://github.com/seek-oss/capsize, title: "Capsize: font metrics package (@capsizecss/metrics 4.5.0)" }
  - { id: touch, resource: /platform/touch-targets-and-gestures.md, title: Touch targets and gestures for an iPad web app }
---

# The setting

During a session the iPad stands or lies one to three metres from the keeper. The keeper
glances at it between reps: a cue word ("Rest", "Switch"), a count, or a timer. That is
glance reading, not reading a page.

# What the research says

- Reading speed stays at its maximum across a wide range of sizes, from a **critical print
  size** of about 0.2 degrees of x-height up to about 2 degrees. Below the critical size,
  reading slows fast.[^legge]
- In glance tests, a humanist sans (open letters, more space between them) was read at
  shorter exposures than a closed, squared design. The gap grew at the smaller size and
  with age.[^dobres] [^mit-news]
- Dark text on a light ground was read at shorter exposures than light on dark in the same
  tests.[^dobres] The dark theme therefore keeps in-session cues larger, not smaller.

Rounded faces such as Nunito and Fredoka have open, simply drawn letters, which is the
property the glance studies favour; neither was tested in those studies.

# Computation

Glyph height `h` for a visual angle `θ` at distance `d` is `h = 2 · d · tan(θ / 2)`. An
iPad at 264 pixels per inch and a device pixel ratio of 2 draws about 132 CSS px per inch
(0.192 mm per CSS px); iPad mini packs more pixels, so the same CSS size is physically
smaller there. Font size follows from Nunito's x-height (0.484 em) and cap height
(0.705 em).[^capsize-metrics]

| Distance | x-height at 0.2° (critical size) | x-height at 0.4° (twice the critical size) | Digit (cap) height at 0.6° |
|---|---|---|---|
| 1 m | 3.5 mm, Nunito at 37 px | 7.0 mm, Nunito at 75 px | 10.5 mm, Nunito at 77 px |
| 2 m | 7.0 mm, Nunito at 75 px | 14.0 mm, Nunito at 150 px | 20.9 mm, Nunito at 154 px |
| 3 m | 10.5 mm, Nunito at 112 px | 20.9 mm, Nunito at 225 px | 31.4 mm, Nunito at 232 px |

# What follows for the app

- A cue word meant for the floor needs about **80 px** to stay above the critical size at
  2 m, and a timer about **150 to 240 px** to be read at a glance from 2 to 3 m.
- Body text is read at arm's length during set-up, so an 18 px base is enough.
- Few words per in-session screen: at these sizes only one or two words fit a line.
- A judgement, not a tested finding: heavier weights help at a distance only while the
  counters stay open. The heaviest weights start to close up `e`, `a` and `8`, so the timer
  uses 800 rather than 1000. Check it on the device.
- Large touch targets for the same screens are covered in the
  [touch targets](/platform/touch-targets-and-gestures.md) finding.[^touch]

[^legge]: Legge and Bigelow 2011
[^dobres]: Dobres et al. 2016
[^mit-news]: MIT News 2012
[^capsize-metrics]: Capsize font metrics
[^touch]: Touch targets and gestures
