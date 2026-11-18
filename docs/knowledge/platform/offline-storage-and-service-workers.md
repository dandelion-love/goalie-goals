---
type: Research Finding
title: Service workers and offline storage limits on iPadOS
description: How much a Home Screen web app may store, when WebKit evicts it, and how to keep a training session working on patchy wifi.
tags: [platform, ipados, service-worker, offline, storage]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: webkit-storage, resource: https://webkit.org/blog/14403/updates-to-storage-policy/, title: "WebKit: Updates to Storage Policy" }
  - { id: mdn-storage, resource: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria, title: "MDN: Storage quotas and eviction criteria" }
  - { id: workbox, resource: https://github.com/GoogleChrome/workbox, title: "Workbox (MIT)" }
  - { id: vite-pwa, resource: https://github.com/vite-pwa/vite-plugin-pwa, title: "vite-plugin-pwa (MIT)" }
  - { id: dexie, resource: https://github.com/dexie/Dexie.js, title: "Dexie.js IndexedDB wrapper (Apache-2.0)" }
---

# Quotas (Safari 17+, iPadOS 17+)

| Context | Per-origin quota | All origins |
| --- | --- | --- |
| Browser app (Safari) | about 60% of disk | about 80% of disk |
| Home Screen web app | same as a browser app | same as a browser app |
| Other apps' web views | about 15% of disk | about 20% of disk |

Sources: WebKit and MDN.[^webkit-storage][^mdn-storage] Before 17, an origin started with
about 1 GiB and Safari prompted for more.[^mdn-storage] Quota is a ceiling, not a promise:
handle `QuotaExceededError` and read `navigator.storage.estimate()`.[^webkit-storage]

# Eviction

- WebKit evicts whole origins, least recently used first, when the overall quota is hit or
  the device is short of space; origins with an open page or in persistent mode may be
  skipped.[^webkit-storage]
- `navigator.storage.persist()` asks for persistent mode. WebKit grants it by heuristics,
  for example whether the site runs as a Home Screen web app; there is no prompt.
  `persisted()` reports the result.[^webkit-storage][^mdn-storage]
- In Safari with tracking prevention on, script-written data of an origin with no user
  interaction in 7 days of browser use is deleted; server-set cookies are
  exempt.[^mdn-storage] MDN does not say whether persistent mode overrides this.

# What the app stores offline

- App shell and drill media in Cache Storage, precached at build time by Workbox through
  vite-plugin-pwa (both MIT) rather than a hand-written service worker.[^workbox][^vite-pwa]
- Approved sessions for the next 7 days, plus an outbox of finished-set results and pain
  reports, in IndexedDB through Dexie (Apache-2.0).[^dexie]
- Nothing sensitive beyond what a session needs; the server is the system of record.

# Fallback

- Eviction or a fresh install: the app treats local data as a cache. On start it checks
  `persisted()`, and if the approved-session cache is empty and the network is down, it
  shows "Connect to wifi to load today's approved session" instead of guessing.
- An unsent outbox survives only as long as storage does, so the app syncs on every
  reconnect and shows a "not yet saved" marker until the server confirms.
- Video drills are short and compressed; the app shows a still and text cues when a clip
  is not cached.

[^webkit-storage]: WebKit blog, Updates to Storage Policy (Safari 17).
[^mdn-storage]: MDN, Storage quotas and eviction criteria, Safari section.
[^workbox]: Workbox repository, MIT licence.
[^vite-pwa]: vite-plugin-pwa repository, MIT licence.
[^dexie]: Dexie.js repository, Apache-2.0 licence.
