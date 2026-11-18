---
type: Research Finding
title: Touch targets and gestures for an iPad web app
description: Minimum hit sizes, removing tap delay, one input model for finger and pencil, and which gestures to leave to the system.
tags: [platform, ipados, touch, accessibility]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-05-17T07:00:00Z
sources:
  - { id: hig-buttons, resource: https://developer.apple.com/design/human-interface-guidelines/buttons, title: "Apple Human Interface Guidelines: Buttons" }
  - { id: wcag-target, resource: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, title: "W3C Understanding WCAG 2.2: Target Size (Minimum)" }
  - { id: mdn-touch-action, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action, title: "MDN: touch-action" }
  - { id: mdn-pointer, resource: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events, title: "MDN: Pointer events" }
---

# Target size

- Apple's general rule is a hit region of at least 44 by 44 points.[^hig-buttons]
- WCAG 2.2 sets 24 by 24 CSS px as the minimum (2.5.8) and 44 by 44 CSS px as the enhanced
  level (2.5.5).[^wcag-target]
- On iPad a CSS px maps to a point, so 44 CSS px meets both. A keeper in gloves, sweaty or
  mid-drill, needs more: the app uses 56 px for primary in-session controls (start, next,
  pain report) and 44 px elsewhere.

# Gestures and input

- `touch-action: manipulation` keeps pan and pinch-zoom but drops double-tap zoom, so taps
  fire without waiting for a second tap.[^mdn-touch-action]
- `touch-action: none` hands every gesture on an element to the app; use it only on a
  drawing or drag surface, since it also blocks zoom for people who need it.[^mdn-touch-action]
- Pointer events cover finger, pencil and trackpad with one set of handlers, and
  `pointerType` tells them apart.[^mdn-pointer]

# Rules the app follows

- No custom edge swipes: the screen edges belong to the system (home indicator, Slide
  Over, Control Center), so swipe navigation stays inside the content area.
- Every swipe or long-press has a visible button that does the same thing.
- Page zoom stays enabled (no `user-scalable=no`).

# Fallback

None needed: these are CSS and DOM features supported on every iPadOS version the
[front-end Decision](/decisions/frontend-approach.md) allows.[^mdn-pointer]

[^hig-buttons]: Apple HIG, Buttons, best practices.
[^wcag-target]: W3C, Understanding SC 2.5.8 Target Size (Minimum), with 2.5.5 for the enhanced level.
[^mdn-touch-action]: MDN, `touch-action`.
[^mdn-pointer]: MDN, Pointer events overview.
