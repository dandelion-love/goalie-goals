---
type: Research Finding
title: Motion durations and reduced motion
description: Interface animations work best between about 100 and 400 ms, should honour a reduced-motion preference, and must stay under the flash threshold; all three can be read from the browser during a run.
tags: [quality, motion, animation, accessibility, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
sources:
  - { id: nng-duration, resource: https://www.nngroup.com/articles/animation-duration/, title: "Nielsen Norman Group: Executing UX animations, duration and motion characteristics" }
  - { id: hig-motion, resource: https://developer.apple.com/design/human-interface-guidelines/motion, title: "Apple Human Interface Guidelines: Motion" }
  - { id: anim, resource: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html, title: "W3C: Understanding SC 2.3.3 Animation from Interactions" }
  - { id: flashes, resource: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html, title: "W3C: Understanding SC 2.3.1 Three Flashes or Below Threshold" }
  - { id: mdn-reduce, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion, title: "MDN: prefers-reduced-motion" }
  - { id: mdn-get-anims, resource: https://developer.mozilla.org/en-US/docs/Web/API/Document/getAnimations, title: "MDN: Document.getAnimations()" }
  - { id: rail, resource: https://web.dev/articles/rail, title: "web.dev: Measure performance with the RAIL model" }
---

# Durations

- About 100 ms for simple feedback such as a toggle; 200-300 ms for larger screen
  changes; most interface animations fall in 100-400 ms, and beyond about 500 ms they
  feel sluggish. Entering motion runs slightly longer than exiting.[^nng-duration]
- Motion should be brief, purposeful and never block the person from acting.[^hig-motion]
- Smooth motion needs a new frame about every 16 ms.[^rail]

# Reduced motion and flashing

- People can ask the system for reduced motion; pages read it through the
  `prefers-reduced-motion` media query.[^mdn-reduce] WCAG 2.2 asks that motion triggered
  by interaction can be turned off unless essential.[^anim]
- Nothing may flash more than three times in any one second.[^flashes]

# Measuring it

Every running CSS animation, CSS transition and Web Animations effect is listed by
`document.getAnimations()`, with its timing and keyframes.[^mdn-get-anims] Sampling it
during a scripted run gives each animation's duration and the properties it moves, both
with and without a reduced-motion preference emulated.

# How it applies to a two-person training app

- Feedback motion (a pressed button, a set ticked off) sits at the short end; the
  end-of-session celebration may run longer, but the "Done for today" button is usable
  while it runs.
- A long celebration costs the pair time between sets; the 100-400 ms range is the norm
  for everything except that one moment.
- With reduced motion, movement is replaced by a fade or removed; nothing that carries
  information (the timer, the set count) depends on motion.

[^nng-duration]: Nielsen Norman Group, animation duration.
[^hig-motion]: Apple HIG, Motion.
[^anim]: W3C, Understanding SC 2.3.3.
[^flashes]: W3C, Understanding SC 2.3.1.
[^mdn-reduce]: MDN, prefers-reduced-motion.
[^mdn-get-anims]: MDN, Document.getAnimations().
[^rail]: web.dev, RAIL model.
