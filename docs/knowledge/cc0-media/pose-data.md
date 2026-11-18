---
type: Research Finding
title: Open 3D animation and motion data as pose references
description: A CC0 animation library offers a rigged figure to read joint angles from, but no exercise clips; the best-known motion-capture database is not CC0.
tags: [cc0-media, exercise-media, pose-reference, animation]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: quaternius, resource: https://quaternius.com/packs/universalanimationlibrary.html, title: "Quaternius, Universal Animation Library (checked 2026-11-18)" }
  - { id: quaternius-2, resource: https://quaternius.com/packs/universalanimationlibrary2.html, title: Quaternius, Universal Animation Library 2 }
  - { id: cmu, resource: http://mocap.cs.cmu.edu/, title: CMU Graphics Lab motion capture database }
  - { id: figures, resource: /exercise-media/drawn-and-generated-figures.md, title: Drawn and generated figures }
---

# Why it matters

The app poses one parametric vector figure by joint angles.[^figures] A rigged 3D figure with open animations would let those angles be read off directly instead of copied from a drawing.

# What was found

| Source | Licence as stated | Exercise content | Verdict |
|---|---|---|---|
| Quaternius Universal Animation Library | CC0; free in personal, educational and commercial projects[^quaternius] | Locomotion, jogging, sprinting, pushing, crawling, swimming, sitting, combat, emotes; no exercise clips listed[^quaternius] | **Passes** as a rig to pose by hand; a second library adds parkour moves, also CC0[^quaternius-2] |
| CMU Graphics Lab motion capture database | Reported by third parties as free for research and for use inside products, but not for resale; the site's own page could not be loaded (certificate error)[^cmu] | Many everyday and sport motions captured from real performers | **Fails** this survey's gate: not CC0, and not verified at the source |

Date checked: 2026-11-18. No AI involvement is stated for either.

# Use

A CC0 rig can be posed by hand into a plank, a bridge or a dive and the angles copied into the app's pose data. It is a tool, not a shipped asset, so nothing from it appears in the app.

[^quaternius]: Quaternius, Universal Animation Library
[^quaternius-2]: Quaternius, Universal Animation Library 2
[^cmu]: CMU Graphics Lab motion capture database
[^figures]: Drawn and generated figures
