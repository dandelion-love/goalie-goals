---
type: Research Finding
title: Keeping the iPad screen on during a session
description: Screen Wake Lock works in Safari from 16.4 but only in Home Screen web apps from 18.4; it is released when the app is hidden and must be re-requested.
tags: [platform, ipados, wake-lock]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: caniuse-wakelock, resource: https://caniuse.com/wake-lock, title: "Can I use: Screen Wake Lock API" }
  - { id: webkit-184, resource: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/, title: "WebKit Features in Safari 18.4" }
  - { id: mdn-wakelock, resource: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API, title: "MDN: Screen Wake Lock API" }
---

# Finding

- Safari on iOS and iPadOS supports `navigator.wakeLock` from 16.4.[^caniuse-wakelock]
- In Home Screen web apps it did not work until 18.4, which lists "Fixed Screen Wake Lock
  API for Home Screen Web Apps".[^webkit-184]
- It needs a secure context; the system releases the lock when the page is hidden, so the
  app re-requests it on `visibilitychange`; a request can fail (for example low
  battery).[^mdn-wakelock]

# Pattern

Request the lock on **Start session**, keep a "wanted" flag, re-request when the page
becomes visible, release on session end.[^mdn-wakelock]

# Fallback

- Below 18.4 in a Home Screen app, or when the request rejects: the session screen shows a
  small notice ("Screen may dim: tap the timer to keep it awake"), and every rest timer
  needs a tap at least once a minute, which also keeps the screen awake. No silent-video
  hacks.

[^caniuse-wakelock]: Can I use, Screen Wake Lock API, Safari on iOS row.
[^webkit-184]: WebKit blog, Safari 18.4 features: resolved issues.
[^mdn-wakelock]: MDN, Screen Wake Lock API.
