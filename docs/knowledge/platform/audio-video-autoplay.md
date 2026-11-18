---
type: Research Finding
title: Audio and video autoplay rules on iPadOS Safari
description: Muted inline video may autoplay; sound needs a tap; the app starts its audio cues from the session's Start button.
tags: [platform, ipados, media, autoplay, audio]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-05-17T07:00:00Z
sources:
  - { id: webkit-video, resource: https://webkit.org/blog/6784/new-video-policies-for-ios/, title: "WebKit: New video policies for iOS" }
  - { id: mdn-autoplay, resource: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay, title: "MDN: Autoplay guide for media and Web Audio APIs" }
  - { id: webkit-26, resource: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/, title: "WebKit Features in Safari 26.0" }
---

# Rules

- A `<video autoplay>` may start without a gesture only if it is muted or has no audio
  track; if it gains audio or is unmuted without a gesture, it pauses.[^webkit-video]
- `playsinline` keeps video in the page instead of going fullscreen.[^webkit-video]
- Autoplaying video starts only when visible and pauses when scrolled
  off-screen.[^webkit-video]
- Starting Web Audio sound outside a user input event is subject to the same autoplay
  rules, and `play()` returns a promise that rejects (`NotAllowedError`) when autoplay is
  denied.[^mdn-autoplay]
- Safari 26 lets web developers change media volume.[^webkit-26]

# Pattern for a training session

1. The keeper taps **Start session**. In that tap handler the app creates and resumes one
   `AudioContext` and plays a short silent buffer, which unlocks sound for the session.
2. Countdown beeps, "switch" calls and rest timers play through that context.
3. Demo clips are muted, `playsinline`, and loop; a speaker button unmutes with a tap.
4. Every `play()` is awaited and a rejection shows a visible play button.[^mdn-autoplay]

# Fallback

- If audio is blocked (rejected promise, silent mode or a suspended context after the app
  was backgrounded), cues switch to full-screen colour flashes and large numbers, and a
  "tap for sound" chip appears. The session never depends on hearing a cue.

[^webkit-video]: WebKit blog, New video policies for iOS.
[^mdn-autoplay]: MDN, Autoplay guide for media and Web Audio APIs.
[^webkit-26]: WebKit blog, Safari 26.0 features: media volume.
