---
type: Pattern
title: Motion principles for this app
description: Durations, easing, which moments move (button press, set done, XP gain, streak, finish, pause) and what stays still during a set, so motion rewards the work without pulling eyes off form.
tags: [motion, animation, ux, accessibility, safety]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
sources:
  - { id: nng, resource: https://www.nngroup.com/articles/animation-duration/, title: "Laubheimer (2020), Executing UX animations: duration and motion characteristics, Nielsen Norman Group" }
  - { id: hig, resource: https://developer.apple.com/design/human-interface-guidelines/motion, title: "Apple Human Interface Guidelines: Motion" }
  - { id: m3-durations, resource: https://api.flutter.dev/flutter/material/Durations-class.html, title: "Material duration tokens (Flutter API reference)" }
  - { id: m3-standard, resource: https://api.flutter.dev/flutter/material/Easing/standard-constant.html, title: "Material standard easing (Flutter API reference)" }
  - { id: m3-decel, resource: https://api.flutter.dev/flutter/material/Easing/emphasizedDecelerate-constant.html, title: "Material emphasized decelerate easing (Flutter API reference)" }
  - { id: webkit-motion, resource: https://webkit.org/blog/7551/responsive-design-for-motion/, title: "Craig (2017), Responsive design for motion, WebKit blog" }
  - { id: wcag-233, resource: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html, title: "WCAG 2.2 Understanding 2.3.3 Animation from Interactions" }
  - { id: wcag-231, resource: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html, title: "WCAG 2.2 Understanding 2.3.1 Three Flashes or Below Threshold" }
  - { id: webdev-anim, resource: https://web.dev/articles/animations-guide, title: "web.dev: How to create high-performance CSS animations" }
  - { id: celebrate, resource: /ux/celebration-moments.md, title: "Celebration moments" }
  - { id: training-rules, resource: /decisions/training-rules.md, title: "Training rules decision" }
  - { id: ux-decision, resource: /decisions/ux-patterns.md, title: "UX patterns decision" }
---

# Summary

Motion in this app says "that counted" and then gets out of the way. Feedback is about
100 ms, state changes 150 to 300 ms, and nothing that blocks a tap lasts longer than
400 ms; the one longer effect, a confetti burst at the end of a session, never blocks.
While a set runs, only the timer moves. Every moving moment has a still version for
reduced motion that carries the same information.

# Durations

| Use | Duration | Basis |
| --- | --- | --- |
| Press feedback on a button | 100 ms | Simple feedback near 100 ms; the more often an animation is seen, the shorter it should be[^nng] |
| Small state change (a check mark, a chip appearing) | 150 to 250 ms | Material short and medium tokens run 50 to 400 ms in 50 ms steps[^m3-durations] |
| A panel or summary card entering | 300 ms; leaving 200 to 250 ms | Entrances slightly longer than exits; 200 to 300 ms for substantial changes[^nng] |
| Upper limit for anything a person waits on | 400 ms | Around 500 ms animations start to feel like a drag[^nng] |
| Celebration particles at session end | about 1.5 to 2 s, never blocking | Decorative; buttons stay live underneath |

# Easing

- **Entering:** decelerate, so the element arrives fast and settles:
  `cubic-bezier(0.05, 0.7, 0.1, 1)` (Material emphasized decelerate).[^m3-decel]
- **Moving on screen or changing size:** `cubic-bezier(0.2, 0, 0, 1)` (Material
  standard).[^m3-standard]
- **Leaving:** the CSS `ease-in` keyword, short.
- **Springs:** only for the reward "bump" (streak, level), critically damped or with one
  small overshoot; no wobble that keeps moving.
- **Properties:** animate `transform` and `opacity` only, so the browser can composite
  them without layout or paint work.[^webdev-anim]

# Which moments move

| Moment | Motion | Why it is allowed |
| --- | --- | --- |
| Button press | Scale to about 0.96 and darken for 100 ms on press | Confirms the tap at once; frequent actions should feel immediate[^hig] |
| Set done | The set row's check draws in and the row settles, 200 ms | Marks progress at a natural break, after the work stops |
| XP gain | A "+N XP" chip rises a few pixels and fades; the bar fills over 400 to 600 ms after the set or at session end | Information first: the number is shown at once, the fill only repeats it |
| Streak | The streak count bumps once (scale 1 to about 1.15 and back, 300 ms) at session end, larger at a milestone | Milestones carry meaning in a long streak[^celebrate] |
| Finish | The summary card enters (300 ms), then one confetti burst; "Done for today" is tappable at once | One short moment that ends the session, not a "one more?"[^ux-decision] |
| Pause or stop (including a pain report) | A calm crossfade, 200 ms; no bounce, no confetti, no sound sting | A safe stop is a good call, never a failure or a reward screen[^training-rules] |

# What stays still during a set

The keeper looks at the iPad from a few metres away, mid-movement, and the parent watches
form. Anything moving in view competes for that attention; peripheral motion is also a
known vestibular trigger.[^webkit-motion]

- The **countdown** is the only thing that moves: its ring or bar advances linearly, and
  digits change without flips or slides.
- The exercise figure's demo loop plays **before** the set and in rest; during the work
  interval it holds a still key pose.
- No XP, streak, badge or confetti animation fires until the set ends; points earned
  mid-set wait for the break.
- No pulsing, shaking or attention-seeking motion on any control during a set, and the
  stop and pain buttons never move.
- Nothing flashes more than three times a second, anywhere.[^wcag-231]

# Reduced motion

When the device asks for reduced motion (iPadOS Settings, Accessibility, Motion), large
movement, scaling and spinning are swapped for a short crossfade or an instant change; the
same text and numbers appear.[^hig][^webkit-motion] This follows WCAG's Animation from
Interactions technique of honouring `prefers-reduced-motion`.[^wcag-233] An in-app switch
in settings can turn motion down further for either person. The fallback for each moment
is set in the [motion Decision](/decisions/motion-libraries.md).

[^nng]: Laubheimer (2020), Nielsen Norman Group
[^hig]: Apple HIG, Motion
[^m3-durations]: Material duration tokens
[^m3-standard]: Material standard easing
[^m3-decel]: Material emphasized decelerate easing
[^webkit-motion]: Craig (2017), WebKit blog
[^wcag-233]: WCAG 2.2, 2.3.3
[^wcag-231]: WCAG 2.2, 2.3.1
[^webdev-anim]: web.dev, high-performance CSS animations
[^celebrate]: Celebration moments
[^training-rules]: Training rules decision
[^ux-decision]: UX patterns decision
