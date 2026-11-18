---
type: Research Finding
title: Visual language
description: Bold colour, rounded shapes, simple illustrations and large touch targets make the app feel friendly and easy to use at a glance.
tags: [ux, visual-design, accessibility, clean-room]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: duo-art, resource: https://blog.duolingo.com/shape-language-duolingos-art-style/, title: "Duolingo blog: shape language and art style" }
  - { id: duo-design, resource: https://design.duolingo.com/illustration, title: "Duolingo design guidelines: illustration" }
  - { id: wcag-target, resource: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, title: "W3C: Understanding WCAG 2.2 success criterion 2.5.8 Target Size (Minimum)" }
  - { id: wcag-target-aaa, resource: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html, title: "W3C: Understanding WCAG 2.2 success criterion 2.5.5 Target Size (Enhanced)" }
---

# The pattern

Saturated colours on white, thick rounded buttons with a solid "pressable" bottom edge,
simple vector illustrations built from a few rounded shapes, a heavy rounded typeface, and
generous tap targets.

# Evidence and rationale

- The reference app's design team moved to simple vector shapes with rounded forms and
  bright colours on white, for speed of production, scaling across screen sizes, and
  clarity: too few details confuse, too many distract.[^duo-art]
- Its public illustration guidance treats rounded corners as a core rule and sharp points
  as off-brand.[^duo-design]
- Accessibility guidance sets a minimum pointer target of 24 by 24 CSS pixels (level AA)
  and recommends 44 by 44 (level AAA).[^wcag-target] [^wcag-target-aaa]

# Clean room (AC4)

The reference app's exact palette, typeface, characters and illustrations are its brand
and are not reused. "Bold colour, rounded shapes, large targets" is a generic, widely
shared style; this app picks its own palette, typeface (an open-licensed one) and art.

# Relevance to training

The app is used mid-exercise: sweaty hands, gloves, the phone on the floor a few metres
away. That argues for the AAA target size or larger for anything tapped during a session,
high contrast, very large timers and counters readable at a distance, and few controls
per screen. Colour must never be the only signal (pair it with an icon or word); see
[UX patterns decision](/decisions/ux-patterns.md).

[^duo-art]: Duolingo blog, shape language
[^duo-design]: Duolingo design guidelines, illustration
[^wcag-target]: WCAG 2.2 SC 2.5.8
[^wcag-target-aaa]: WCAG 2.2 SC 2.5.5
