---
type: Reference
title: Open-source references for habit and progression mechanics
description: Existing open-source habit trackers, scoring methods, standards and libraries, with licences, to reuse rather than reinvent.
tags: [progression, open-source, licences, reuse]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
stale_after: 2027-11-18T00:00:00Z
sources:
  - { id: loop, resource: https://github.com/iSoron/uhabits, title: "Loop Habit Tracker (GPL-3.0)" }
  - { id: loop-faq, resource: https://loophabits.org, title: "Loop Habit Tracker site and FAQ" }
  - { id: habitica, resource: https://github.com/HabitRPG/habitica, title: "Habitica (code GPL-3.0; assets CC BY-NC-SA 3.0)" }
  - { id: openbadges, resource: https://www.imsglobal.org/spec/ob/v3p0, title: "1EdTech Open Badges 3.0 specification" }
  - { id: datefns, resource: https://github.com/date-fns/date-fns, title: "date-fns (MIT)" }
  - { id: webpush, resource: https://github.com/web-push-libs/web-push, title: "web-push for Node (MPL-2.0)" }
  - { id: workbox, resource: https://github.com/GoogleChrome/workbox, title: "Workbox service-worker tooling (MIT)" }
---

Licences as published at the time of writing; recheck before adding a dependency.

# Mechanic references

| Project | Licence | What to learn or reuse |
|---|---|---|
| Loop Habit Tracker[^loop] | GPL-3.0 | A *habit strength* score using exponential smoothing: recent repetitions count more, each repetition strengthens and each miss weakens it, and a strong habit recovers quickly after a short break.[^loop-faq] This is a forgiving alternative to a strict streak and supports non-daily schedules (for example 4 times a week). Reimplement the idea from its description rather than copying GPL code into a differently licensed app. |
| Habitica[^habitica] | Code GPL-3.0; art CC BY-NC-SA 3.0 | An open-source gamified habit app with parties and shared quests; useful as a design reference for cooperative play. Its art is non-commercial share-alike and is not reused. |
| Open Badges 3.0[^openbadges] | Open standard | A portable format for achievement records, if badges ever need to leave the app. Not needed for a single-family app. |

# Libraries

| Need | Option | Licence |
|---|---|---|
| Calendar logic for training days, weeks, local dates | date-fns[^datefns] | MIT |
| Sending web push from a server | web-push[^webpush] | MPL-2.0 |
| Service worker, offline, push receipt | Workbox[^workbox] | MIT |

[^loop]: Loop Habit Tracker repository
[^loop-faq]: Loop Habit Tracker FAQ
[^habitica]: Habitica repository
[^openbadges]: Open Badges 3.0
[^datefns]: date-fns
[^webpush]: web-push
[^workbox]: Workbox
