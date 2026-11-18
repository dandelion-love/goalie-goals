---
type: Research Finding
title: Response-time limits and web performance thresholds
description: The 0.1 s, 1 s and 10 s perception limits, and the web's interaction, paint and layout-shift thresholds, give numeric targets that can be timed in a browser on a local run.
tags: [quality, performance, latency, feedback, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
stale_after: 2027-11-18T00:00:00Z
sources:
  - { id: nng-limits, resource: https://www.nngroup.com/articles/response-times-3-important-limits/, title: "Nielsen Norman Group: Response times, the 3 important limits" }
  - { id: rail, resource: https://web.dev/articles/rail, title: "web.dev: Measure performance with the RAIL model" }
  - { id: inp, resource: https://web.dev/articles/inp, title: "web.dev: Interaction to Next Paint (INP)" }
  - { id: lcp, resource: https://web.dev/articles/lcp, title: "web.dev: Largest Contentful Paint (LCP)" }
  - { id: cls, resource: https://web.dev/articles/cls, title: "web.dev: Cumulative Layout Shift (CLS)" }
  - { id: mdn-event-timing, resource: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming, title: "MDN: PerformanceEventTiming" }
  - { id: nng-teens, resource: https://www.nngroup.com/articles/usability-of-websites-for-teenagers/, title: "Nielsen Norman Group: Teenager's UX, designing for teens" }
---

# The perception limits

- **0.1 s:** the limit for the system to feel like it is reacting instantly; no feedback
  other than the result is needed.[^nng-limits]
- **1 s:** the limit for the user's flow of thought to stay uninterrupted, though the
  delay is noticed.[^nng-limits]
- **10 s:** the limit for keeping attention on the task; longer waits need a progress
  indicator and a way out.[^nng-limits]

# Web thresholds

| Measure | Good | Poor | Source |
|---|---|---|---|
| Response to input | within 100 ms (process events in under 50 ms) | | RAIL[^rail] |
| Animation frame | a frame every 16 ms (10 ms of work) | | RAIL[^rail] |
| Interaction to Next Paint | at or under 200 ms | over 500 ms | INP[^inp] |
| Largest Contentful Paint | at or under 2.5 s | over 4 s | LCP[^lcp] |
| Cumulative Layout Shift | at or under 0.1 | over 0.25 | CLS[^cls] |

Event Timing entries in the browser record each input's delay, processing and the time
to the next paint, rounded to 8 ms, so a scripted run can collect them without a
profiler.[^mdn-event-timing]

# How it applies to a two-person training app

- Taps happen mid-exercise ("Set done", a form cue, "Something hurts"); a tap that lags
  past 0.1 s invites a second tap, which can log a set twice. The 0.1 s limit is the bar
  for those taps, with INP's 200 ms as the outer bound.
- Screen changes (start session, finish, approve) should stay under 1 s so the pair's
  flow is not broken.
- A local demo run has no real network, so these numbers isolate the app's own cost.
  Slowing the CPU (as the browser's developer tools allow) stands in for an older iPad,
  and slowing the API stands in for patchy wifi.
- Teens in usability studies abandon slow or buggy pages quickly.[^nng-teens]

[^nng-limits]: Nielsen Norman Group, response times.
[^rail]: web.dev, RAIL model.
[^inp]: web.dev, INP.
[^lcp]: web.dev, LCP.
[^cls]: web.dev, CLS.
[^mdn-event-timing]: MDN, PerformanceEventTiming.
[^nng-teens]: Nielsen Norman Group, Teenager's UX.
