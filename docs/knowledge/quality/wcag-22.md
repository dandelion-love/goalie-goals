---
type: Research Finding
title: WCAG 2.2 criteria that set measurable thresholds
description: The WCAG 2.2 success criteria with numeric or testable thresholds (contrast, target size, resize and reflow, motion, flashing, audio control, names and roles) and which of them bite on a training app used from the floor.
tags: [quality, accessibility, wcag, contrast, motion, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
stale_after: 2027-11-18T00:00:00Z
sources:
  - { id: wcag22, resource: https://www.w3.org/TR/WCAG22/, title: "W3C: Web Content Accessibility Guidelines (WCAG) 2.2" }
  - { id: contrast-min, resource: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html, title: "W3C: Understanding SC 1.4.3 Contrast (Minimum)" }
  - { id: contrast-enh, resource: https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html, title: "W3C: Understanding SC 1.4.6 Contrast (Enhanced)" }
  - { id: non-text, resource: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html, title: "W3C: Understanding SC 1.4.11 Non-text Contrast" }
  - { id: resize, resource: https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html, title: "W3C: Understanding SC 1.4.4 Resize Text" }
  - { id: reflow, resource: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html, title: "W3C: Understanding SC 1.4.10 Reflow" }
  - { id: target-min, resource: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, title: "W3C: Understanding SC 2.5.8 Target Size (Minimum)" }
  - { id: target-enh, resource: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html, title: "W3C: Understanding SC 2.5.5 Target Size (Enhanced)" }
  - { id: anim, resource: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html, title: "W3C: Understanding SC 2.3.3 Animation from Interactions" }
  - { id: flashes, resource: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html, title: "W3C: Understanding SC 2.3.1 Three Flashes or Below Threshold" }
  - { id: audio-control, resource: https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html, title: "W3C: Understanding SC 1.4.2 Audio Control" }
  - { id: sensory, resource: https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html, title: "W3C: Understanding SC 1.3.3 Sensory Characteristics" }
  - { id: consistent-id, resource: https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html, title: "W3C: Understanding SC 3.2.4 Consistent Identification" }
  - { id: name-role, resource: https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html, title: "W3C: Understanding SC 4.1.2 Name, Role, Value" }
  - { id: axe, resource: https://github.com/dequelabs/axe-core, title: "axe-core: accessibility engine for automated web testing (MPL-2.0)" }
---

# What it is

WCAG 2.2 is the W3C's testable standard for web accessibility, organised as success
criteria at levels A, AA and AAA.[^wcag22] Several criteria carry a number or a
pass/fail test, which makes them usable as rubric thresholds.

# Criteria with thresholds

| Criterion | Threshold |
|---|---|
| 1.4.3 Contrast (Minimum), AA | Text at least 4.5:1 against its background; large text (at least 18 pt, or 14 pt bold, which is 24 and about 18.7 CSS px) at least 3:1.[^contrast-min] |
| 1.4.6 Contrast (Enhanced), AAA | 7:1 for text, 4.5:1 for large text.[^contrast-enh] |
| 1.4.11 Non-text Contrast, AA | Control boundaries, states and meaningful graphics at least 3:1 against adjacent colours.[^non-text] |
| 1.4.4 Resize Text, AA | Text can be zoomed to 200% without loss of content or function.[^resize] |
| 1.4.10 Reflow, AA | Content works at 320 CSS px wide without scrolling in two directions.[^reflow] |
| 2.5.8 Target Size (Minimum), AA | Pointer targets at least 24 by 24 CSS px, or spaced so a 24 px circle on each does not overlap another; inline links are exempt.[^target-min] |
| 2.5.5 Target Size (Enhanced), AAA | At least 44 by 44 CSS px.[^target-enh] |
| 2.3.3 Animation from Interactions, AAA | Motion triggered by interaction can be turned off unless essential.[^anim] |
| 2.3.1 Three Flashes or Below Threshold, A | Nothing flashes more than three times in any one second.[^flashes] |
| 1.4.2 Audio Control, A | Audio that plays for more than 3 seconds can be paused or its volume set apart from the system volume.[^audio-control] |
| 1.3.3 Sensory Characteristics, A | Instructions do not rely only on shape, colour, size, position or sound.[^sensory] |
| 3.2.4 Consistent Identification, AA | Components with the same function are identified the same way.[^consistent-id] |
| 4.1.2 Name, Role, Value, A | Every control exposes a name and role to assistive technology.[^name-role] |

# Testing

Part of this can be tested by a machine: the open-source axe-core engine runs rules
tagged by WCAG level in a browser and reports violations by impact (minor, moderate,
serious, critical).[^axe] Automated rules cover only part of WCAG; target size, motion,
sound and wording still need a person reading the page.

# How it applies to a two-person training app

- **Contrast and size, beyond AA.** The keeper reads the screen from the floor, mid-set,
  often in daylight. AA is the floor; in-session text (timer, instruction, set count)
  should meet the AAA 7:1 contrast and be sized for distance (see
  [legibility at a distance](/quality/legibility-at-distance.md)).
- **Targets.** 44 px (AAA) is the app's minimum and 56 px for in-session primary
  controls, as the [touch targets concept](/platform/touch-targets-and-gestures.md)
  already decided.
- **Motion and flashing.** Celebration effects must stay under the flash threshold and
  honour a reduced-motion preference (see [motion](/quality/motion-and-reduced-motion.md)).
- **Sound never alone.** Every audio cue has a visual equivalent, so a muted iPad or a
  noisy room loses nothing.[^sensory]
- **Same words, both devices.** The parent's phone and the keeper's iPad name the same
  action the same way.[^consistent-id]

[^wcag22]: W3C, WCAG 2.2 Recommendation.
[^contrast-min]: W3C, Understanding SC 1.4.3.
[^contrast-enh]: W3C, Understanding SC 1.4.6.
[^non-text]: W3C, Understanding SC 1.4.11.
[^resize]: W3C, Understanding SC 1.4.4.
[^reflow]: W3C, Understanding SC 1.4.10.
[^target-min]: W3C, Understanding SC 2.5.8.
[^target-enh]: W3C, Understanding SC 2.5.5.
[^anim]: W3C, Understanding SC 2.3.3.
[^flashes]: W3C, Understanding SC 2.3.1.
[^audio-control]: W3C, Understanding SC 1.4.2.
[^sensory]: W3C, Understanding SC 1.3.3.
[^consistent-id]: W3C, Understanding SC 3.2.4.
[^name-role]: W3C, Understanding SC 4.1.2.
[^axe]: axe-core on GitHub.
