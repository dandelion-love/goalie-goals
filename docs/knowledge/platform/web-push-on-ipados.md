---
type: Research Finding
title: Web push on iPadOS Home Screen web apps
description: Push works on iPadOS 16.4+ only for an installed web app, after a tap-triggered permission prompt; Declarative Web Push arrives in 18.4.
tags: [platform, ipados, web-push, notifications]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: webkit-push, resource: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/, title: "Web Push for Web Apps on iOS and iPadOS" }
  - { id: webkit-164, resource: https://webkit.org/blog/13966/webkit-features-in-safari-16-4/, title: "WebKit Features in Safari 16.4" }
  - { id: webkit-dwp, resource: https://webkit.org/blog/16535/meet-declarative-web-push/, title: "Meet Declarative Web Push" }
  - { id: webkit-184, resource: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/, title: "WebKit Features in Safari 18.4" }
  - { id: caniuse-push, resource: https://caniuse.com/push-api, title: "Can I use: Push API" }
  - { id: web-push-lib, resource: https://github.com/web-push-libs/web-push, title: "web-push library for Node.js (MPL-2.0)" }
---

# Support

- iPadOS 16.4 added Push, Notifications and Badging APIs for web apps saved to the Home
  Screen; a Safari tab cannot subscribe.[^webkit-164][^webkit-push] Can I use marks Safari
  on iOS as partial support from 16.4 for that reason.[^caniuse-push]
- Requirements: the app is installed first; the permission request comes from a direct tap
  (such as an "Allow reminders" button); no paid Apple developer membership is
  needed.[^webkit-push]
- It is standard W3C Web Push (VAPID keys, encrypted payloads). If outbound traffic is
  filtered, allow the Apple push host family named in the WebKit post.[^webkit-push]
- Notifications show on the Lock Screen and in Notification Center; badge permission comes
  with notification permission.[^webkit-164]
- Declarative Web Push (18.4+) lets the push message itself describe the notification, so
  it shows without running a service worker; old browsers fall back to the classic
  `push` handler with the same JSON.[^webkit-dwp][^webkit-184]

# Relevance here

The keeper's iPad needs push only for "your parent approved today's session". The parent's
phone is the main push target (approval requests, pain reports); see
[parent approval](/decisions/parent-approval.md). The server side reuses the open-source
`web-push` library rather than writing VAPID and payload encryption.[^web-push-lib]

# Fallback

- Not installed, or permission declined: no push. The app shows the same item as an
  in-app banner and a badge on next open, and the parent's dashboard lists pending items.
- Below 18.4: send messages in the declarative JSON shape and keep a small `push` handler
  in the service worker that displays it, which WebKit describes as the compatible
  path.[^webkit-dwp]
- Push is never the only channel for anything safety-related: a pain report also blocks
  training in the app itself until it is cleared.

[^webkit-push]: WebKit blog, Web Push for Web Apps on iOS and iPadOS.
[^webkit-164]: WebKit blog, Safari 16.4 features.
[^webkit-dwp]: WebKit blog, Meet Declarative Web Push.
[^webkit-184]: WebKit blog, Safari 18.4 features.
[^caniuse-push]: Can I use, Push API, Safari on iOS row.
[^web-push-lib]: web-push library repository; licence MPL-2.0 per its package metadata.
