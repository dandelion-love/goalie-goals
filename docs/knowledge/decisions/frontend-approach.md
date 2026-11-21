---
type: Decision
title: Front-end approach for the iPad web app
description: React and Vite as an installable web app with an offline session cache, iPad-first breakpoints, iPadOS 18.4 as the minimum, and sign-in run inside the installed app behind the proxy.
tags: [decision, platform, frontend, pwa, ipados, sign-in]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T09:50:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: react, resource: https://github.com/facebook/react, title: "React (MIT)" }
  - { id: vite, resource: https://github.com/vitejs/vite, title: "Vite (MIT)" }
  - { id: vite-pwa, resource: https://github.com/vite-pwa/vite-plugin-pwa, title: "vite-plugin-pwa (MIT)" }
  - { id: workbox, resource: https://github.com/GoogleChrome/workbox, title: "Workbox (MIT)" }
  - { id: dexie, resource: https://github.com/dexie/Dexie.js, title: "Dexie.js (Apache-2.0)" }
  - { id: web-push-lib, resource: https://github.com/web-push-libs/web-push, title: "web-push (MPL-2.0)" }
  - { id: google-auth-lib, resource: https://github.com/googleapis/google-auth-library-nodejs, title: "google-auth-library-nodejs (Apache-2.0)" }
  - { id: webkit-184, resource: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/, title: "WebKit Features in Safari 18.4" }
  - { id: webkit-26, resource: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/, title: "WebKit Features in Safari 26.0" }
  - { id: iap-sessions, resource: https://docs.cloud.google.com/iap/docs/sessions-howto, title: "Identity-Aware Proxy: Managing sessions" }
  - { id: mdn-container, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries, title: "MDN: CSS container queries" }
---

# Decision

Build one installable web app (a PWA) in **TypeScript with React and Vite**, served by the
same container as the API, used on the keeper's iPad from the Home Screen and on the
parent's phone in the browser or from the Home Screen.

# Framework and reused libraries

| Need | Library | Licence |
| --- | --- | --- |
| UI | React[^react] | MIT |
| Build and dev server | Vite[^vite] | MIT |
| Manifest, service worker generation | vite-plugin-pwa[^vite-pwa] over Workbox[^workbox] | MIT |
| Offline data (approved sessions, outbox) | Dexie.js over IndexedDB[^dexie] | Apache-2.0 |
| Server push | web-push[^web-push-lib] | MPL-2.0 |
| Verify the proxy's signed header | google-auth-library[^google-auth-lib] | Apache-2.0 |

Why: mainstream, open source, large hiring and answer pool, and no native wrapper or app
store. A native iPad app was ruled out: it would need an Apple developer account and
review for a two-person app.

# PWA scope

In scope:

- Manifest (`display: standalone`, `id`, `start_url`, `scope` set to the app root, opaque
  square icons), linked with `crossorigin="use-credentials"`
  ([manifest](/platform/home-screen-install-and-manifest.md)).
- Precached app shell and drill media; Dexie cache of the next 7 days of **approved**
  sessions; outbox for results and pain reports
  ([offline](/platform/offline-storage-and-service-workers.md)).
- Web push for approval requests and approvals ([push](/platform/web-push-on-ipados.md)).
- Wake lock during a session ([wake lock](/platform/screen-wake-lock.md)); audio cues
  unlocked by the Start tap ([autoplay](/platform/audio-video-autoplay.md)).

What the device may keep, and nothing else:

- The signed-in role, which picks the home to show, and today's **approved** session.
- The training pause, with an unsent pain report until the server takes it.
- **Queued session events**: the start and the finish of a session, kept in the outbox in the
  order they were made and sent in that order when the network is back. Each holds only the
  date, the session id and version, the outcome, and the form ratings (the approved cue tapped
  for a rated set; their count is the rated-set count). A finish also carries the session's
  history record: for each card, its id and version, the sets done and the **cue ids** rated
  good (a cue's position in that card version's cue list, never its text). The record goes to
  the server's session history after the finish, under the finish's id, and the server keeps
  it once. A new session carries an opaque occurrence id from start to its history record.
  After a start is confirmed, its acknowledged marker remains in the outbox until the matching
  finish and history are confirmed, including across a reload; reset deletes the marker. It
  carries no notes or free text and does not prove performance or order. Other confirmed events
  are deleted; an empty outbox leaves nothing on the device.
  A Stop is queued at the tap and held while Resume is offered, so it survives the app
  closing; Resume deletes it.
- The figures of today's approved cards, in their own cache. The app keeps exactly today's
  set; the service worker reads it only when the network fails and never writes to it.

History, recent sessions, the audit log, the inbox and progress always come from the network and are never
stored on the device or in a service-worker cache.

A start that reaches the server late, after the parent undid an approval it uses, still
counts: the server records it, audits it as started before the undo reached the device, and
keeps the keeper's XP. An undo after a start has landed is refused.

Out of scope: background sync, periodic sync, haptics on the iPad
([haptics](/platform/haptics-availability.md)), orientation locking, any offline approval
(approvals always need the server).

# Breakpoints

Width-based, from the space the app actually has, with container queries for components
so Split View and resizable windows work.[^mdn-container]

| Name | Width (CSS px) | Main use | Layout |
| --- | --- | --- | --- |
| compact | below 600 | parent's phone; iPad Slide Over | one column, bottom tab bar |
| medium | 600 to 899 | iPad portrait; iPad in Split View | one wide column, drill video above controls |
| expanded | 900 and up | iPad landscape | two panes: drill and timer left, set log right |

Touch targets: 44 px minimum, 56 px for in-session controls
([touch](/platform/touch-targets-and-gestures.md)).

# Minimum iPadOS

**iPadOS 18.4**, tested primarily on the current release (26 and later).

- 18.4 is the first version where Screen Wake Lock works in Home Screen web apps and where
  Declarative Web Push exists.[^webkit-184]
- On 26 and later every Home Screen site opens as a web app; below 26 the manifest
  `display` is what makes it one, so the app ships the manifest regardless.[^webkit-26]
- Below 18.4 the app still loads in Safari with a banner asking for an update; no
  feature is promised there.

# Fallbacks on the minimum version

| Feature | State on 18.4 | Fallback |
| --- | --- | --- |
| Opens as web app | only with manifest `display: standalone` | manifest shipped; install guide when `display-mode: browser` |
| Web push | install plus tap-granted permission only | in-app banner and badge; parent dashboard list |
| Wake lock | supported, may reject | notice plus tap-to-keep-awake timers |
| Autoplay with sound | needs a gesture | Start tap unlocks audio; visual cues if blocked |
| Vibration | not supported | sound and visual cues only |
| Orientation lock | may reject | both orientations always work; rotate hint |
| Persistent storage | heuristic grant | local data is a cache; server is the record |
| Session-refresh window shares cookie | unverified in standalone | top-level navigation to `start_url` |

# Sign-in behind the proxy

The proxy in front of the container admits only listed Google accounts; the app decides
the role (parent or keeper) from its own data after verifying the proxy's signed
header.[^google-auth-lib] On the installed app:

1. The person installs from Safari, then opens the Home Screen icon and signs in there once:
   the installed app has its own cookie partition
   ([sign-in](/platform/sign-in-in-home-screen-app.md)).
2. API calls send `X-Requested-With: XMLHttpRequest` with same-origin credentials so an
   expired session is a `401`.[^iap-sessions]
3. On `401` the app saves work to the outbox, shows **Reconnect**, tries the documented
   session-refresh window and polls; if that fails it navigates the app window to
   `start_url` so the proxy's redirect runs in place.[^iap-sessions]
4. The service worker passes live navigations to the network and never caches a redirect
   or a sign-in page.

No project, domain, client id, service URL or allowlisted account appears in the repo;
they live in deployment configuration outside it.

# Consequences

- One codebase for both people and devices.
- The installed-app cookie partition and the refresh-window behaviour must be checked on a
  real iPad before launch; the top-level-navigation fallback works either way.

[^react]: React repository, MIT.
[^vite]: Vite repository, MIT.
[^vite-pwa]: vite-plugin-pwa repository, MIT.
[^workbox]: Workbox repository, MIT.
[^dexie]: Dexie.js repository, Apache-2.0.
[^web-push-lib]: web-push repository; MPL-2.0 per package metadata.
[^google-auth-lib]: google-auth-library-nodejs repository, Apache-2.0.
[^webkit-184]: WebKit blog, Safari 18.4 features.
[^webkit-26]: WebKit blog, Safari 26.0 features.
[^iap-sessions]: Identity-Aware Proxy docs, Managing sessions.
[^mdn-container]: MDN, container queries.
