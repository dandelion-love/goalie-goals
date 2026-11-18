---
type: Research Finding
title: Haptics in a web app on iPad
description: Safari on iPadOS has no Vibration API, so the app gives feedback with sound and visuals only.
tags: [platform, ipados, haptics, vibration]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: caniuse-vibration, resource: https://caniuse.com/vibration, title: "Can I use: Vibration API" }
  - { id: mdn-vibrate, resource: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate, title: "MDN: Navigator.vibrate()" }
---

# Finding

- Safari on iOS and iPadOS does not support the Vibration API in any version listed,
  through the 27.x releases.[^caniuse-vibration]
- MDN marks the API as not Baseline; where it exists it needs a prior user gesture and is a
  no-op on devices without vibration.[^mdn-vibrate]
- The parent's phone may be Android, where `navigator.vibrate` can work; it must be
  feature-detected.[^mdn-vibrate]

# Fallback

- The keeper's iPad: no haptics. Feedback is a sound cue (see
  [autoplay](/platform/audio-video-autoplay.md)) plus a visual flash.
- The parent's phone: call `navigator.vibrate` only when `"vibrate" in navigator`, and
  never as the only signal.

[^caniuse-vibration]: Can I use, Vibration API, Safari on iOS row (not supported).
[^mdn-vibrate]: MDN, `Navigator.vibrate()`.
