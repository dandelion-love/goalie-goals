---
type: Research Finding
title: Standalone display, safe areas and orientation on iPad
description: How a standalone web app fills the iPad screen, keeps content clear of rounded corners and system bars, and handles portrait and landscape.
tags: [platform, ipados, layout, safe-area, orientation]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: webdev-manifest, resource: https://web.dev/learn/pwa/web-app-manifest, title: "web.dev Learn PWA: Web app manifest" }
  - { id: mdn-env, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/env, title: "MDN: CSS env() and safe-area-inset-*" }
  - { id: mdn-viewport, resource: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport, title: "MDN: viewport meta tag" }
  - { id: caniuse-orientation, resource: https://caniuse.com/screen-orientation, title: "Can I use: Screen Orientation API" }
  - { id: mdn-orientation-lock, resource: https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock, title: "MDN: ScreenOrientation.lock()" }
  - { id: mdn-container, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries, title: "MDN: CSS container queries" }
---

# Display mode

- `standalone` is the usual choice: an app window with no browser chrome. `fullscreen` and
  `minimal-ui` also exist.[^webdev-manifest]
- The page can tell how it is running with the `display-mode` media query (for example
  `(display-mode: standalone)`), which is how the app decides whether to show its install
  guide.[^webdev-manifest]

# Safe areas

- `env(safe-area-inset-top|right|bottom|left)` give the distance from each viewport edge
  to the area not covered by rounded corners, the home indicator or other system
  UI; they are `0` on a plain rectangle.[^mdn-env]
- `viewport-fit=cover` in the viewport meta tag scales the page to fill the whole display,
  and MDN strongly recommends padding with the inset variables when using it.[^mdn-viewport]
- Pattern: pad fixed headers, footers and full-bleed game surfaces with
  `max(16px, env(safe-area-inset-*))`, as MDN's sticky-footer example does.[^mdn-env]

# Orientation

- The manifest `orientation` member is optional (`portrait`, `landscape`, and
  others).[^webdev-manifest]
- Safari on iPadOS reports support for the Screen Orientation API from 16.4,[^caniuse-orientation]
  but `screen.orientation.lock()` is typically enabled only on mobile devices in a
  fullscreen context, and it rejects with `NotSupportedError` when the browser cannot lock
  to the requested orientation; the page must handle the rejection.[^mdn-orientation-lock]
- An iPad app can also run in Split View, Slide Over or a resizable window, so the
  viewport width is not the device width. Container queries let a component lay itself
  out by the space it actually has.[^mdn-container]

# Fallback

- The app does not depend on locking orientation. Every screen works in both portrait and
  landscape; a drill that is clearer in landscape shows a "turn the iPad" hint instead of
  calling `lock()`.
- Layout keys off available width (media and container queries), never off a device name.

[^webdev-manifest]: web.dev, Learn PWA, web app manifest chapter.
[^mdn-env]: MDN, `env()` and the safe-area-inset variables.
[^mdn-viewport]: MDN, viewport meta tag, `viewport-fit`.
[^caniuse-orientation]: Can I use, Screen Orientation API, Safari on iOS row.
[^mdn-orientation-lock]: MDN, `ScreenOrientation.lock()`.
[^mdn-container]: MDN, container queries.
