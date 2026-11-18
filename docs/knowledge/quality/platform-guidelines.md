---
type: Research Finding
title: Platform human interface guidelines as a quality floor
description: Apple's and Android's design guidelines set concrete floors for hit size, type, contrast, motion, feedback and audio that a polished iPad web app is expected to meet.
tags: [quality, platform, hig, ipados, android, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: hig-buttons, resource: https://developer.apple.com/design/human-interface-guidelines/buttons, title: "Apple Human Interface Guidelines: Buttons" }
  - { id: hig-type, resource: https://developer.apple.com/design/human-interface-guidelines/typography, title: "Apple Human Interface Guidelines: Typography" }
  - { id: hig-color, resource: https://developer.apple.com/design/human-interface-guidelines/color, title: "Apple Human Interface Guidelines: Color" }
  - { id: hig-motion, resource: https://developer.apple.com/design/human-interface-guidelines/motion, title: "Apple Human Interface Guidelines: Motion" }
  - { id: hig-feedback, resource: https://developer.apple.com/design/human-interface-guidelines/feedback, title: "Apple Human Interface Guidelines: Feedback" }
  - { id: hig-audio, resource: https://developer.apple.com/design/human-interface-guidelines/playing-audio, title: "Apple Human Interface Guidelines: Playing audio" }
  - { id: hig-layout, resource: https://developer.apple.com/design/human-interface-guidelines/layout, title: "Apple Human Interface Guidelines: Layout" }
  - { id: android-a11y, resource: https://developer.android.com/guide/topics/ui/accessibility/apps, title: "Android Developers: Make apps more accessible" }
  - { id: m3-motion, resource: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs, title: "Material Design 3: Easing and duration" }
---

# What it is

Each major platform publishes human interface guidelines. They are written for native
apps, but people judge a home-screen web app against the native apps beside it, so the
guidelines are a fair floor for "feels at home on the iPad". Android's guidance is
included so the rubric does not lean on one vendor alone.

# Floors that can be measured

| Topic | Guidance |
|---|---|
| Hit size | A hit region of at least 44 by 44 points (Apple);[^hig-buttons] at least 48 by 48 dp, larger is better (Android).[^android-a11y] |
| Text contrast | Android recommends 4.5:1 for small text and 3:1 for larger or bold text, the same thresholds as WCAG AA.[^android-a11y] Apple asks for sufficient contrast and checks in both light and dark appearance.[^hig-color] |
| Type | Use a small number of sizes and weights to build a clear hierarchy, and support text size settings.[^hig-type] |
| Layout | Keep content inside the safe area and adapt to orientation and size changes.[^hig-layout] |
| Motion | Motion should be purposeful, brief, and optional for people who turn on reduced motion.[^hig-motion] Material sets duration tokens that grow with the size and distance of the change.[^m3-motion] |
| Feedback | Every action gets a clear response, and status is shown without interrupting.[^hig-feedback] |
| Audio | Respect silent and volume settings, and do not interrupt other audio needlessly.[^hig-audio] |

# How it applies to a two-person training app

- The keeper's screen is the iPad in landscape and portrait; the parent's is a phone.
  A rubric checks both, at the window sizes the repo's demo script (`docs/demo.md`)
  already uses, with the breakpoints from the
  [front-end Decision](/decisions/frontend-approach.md).
- Haptics are part of platform feedback guidance, but Safari on iPadOS has no Vibration
  API, so this app cannot use them (see [haptics](/platform/haptics-availability.md)).
  A rubric for this app scores sound and visuals and leaves haptics out.
- Guidelines give floors, not polish. Polish shows up in how consistently the floors
  are met across every screen, which a rubric can count.

[^hig-buttons]: Apple HIG, Buttons.
[^hig-type]: Apple HIG, Typography.
[^hig-color]: Apple HIG, Color.
[^hig-motion]: Apple HIG, Motion.
[^hig-feedback]: Apple HIG, Feedback.
[^hig-audio]: Apple HIG, Playing audio.
[^hig-layout]: Apple HIG, Layout.
[^android-a11y]: Android Developers, Make apps more accessible.
[^m3-motion]: Material Design 3, Easing and duration.
