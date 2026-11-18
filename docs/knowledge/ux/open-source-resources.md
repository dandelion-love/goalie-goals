---
type: Reference
title: Open-source building blocks for game-like UX
description: Existing libraries, fonts, icons and art packs, with licences, so the app does not reinvent celebration, animation, sound or icon work.
tags: [ux, open-source, licences, reuse]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
stale_after: 2027-11-18T00:00:00Z
sources:
  - { id: confetti, resource: https://github.com/catdad/canvas-confetti, title: "canvas-confetti (ISC)" }
  - { id: lottie, resource: https://github.com/airbnb/lottie-web, title: "lottie-web (MIT)" }
  - { id: rive, resource: https://github.com/rive-app/rive-wasm, title: "Rive web runtime (MIT)" }
  - { id: howler, resource: https://github.com/goldfire/howler.js, title: "howler.js (MIT)" }
  - { id: mdn-vibrate, resource: https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API, title: "MDN: Vibration API" }
  - { id: lucide, resource: https://github.com/lucide-icons/lucide, title: "Lucide icons (ISC)" }
  - { id: phosphor, resource: https://github.com/phosphor-icons/core, title: "Phosphor icons (MIT)" }
  - { id: nunito, resource: https://fonts.google.com/specimen/Nunito, title: "Nunito typeface (SIL Open Font License 1.1)" }
  - { id: kenney, resource: https://kenney.nl/assets, title: "Kenney game assets, including UI and audio packs (CC0)" }
  - { id: openpeeps, resource: https://www.openpeeps.com/, title: "Open Peeps illustration library (CC0)" }
  - { id: radix, resource: https://github.com/radix-ui/primitives, title: "Radix UI primitives (MIT)" }
  - { id: workbox, resource: https://github.com/GoogleChrome/workbox, title: "Workbox service-worker tooling (MIT)" }
---

Licences are as published by each project at the time of writing; recheck before adding a
dependency (hence `stale_after`).

# Celebration and animation

| Need | Option | Licence | Note |
|---|---|---|---|
| Confetti burst on session end | canvas-confetti[^confetti] | ISC | Small, no dependencies; honours reduced-motion if the caller checks `prefers-reduced-motion`. |
| Designer-made vector animation | lottie-web[^lottie] | MIT | Plays animations exported as JSON. |
| Interactive, state-driven character animation | Rive web runtime[^rive] | MIT (runtime) | The editor is a commercial product; the runtime is open source. |

# Sound and haptics

| Need | Option | Licence | Note |
|---|---|---|---|
| Short cue sounds, sprites, mobile unlock | howler.js[^howler] | MIT | Handles the audio-unlock rules of mobile browsers. |
| Vibration | Vibration API[^mdn-vibrate] | Web standard | Not supported everywhere (for example Safari on iOS); treat as optional. |
| Original sound effects | Kenney audio packs[^kenney] | CC0 | Public-domain UI and game sounds; avoids any resemblance to a brand's jingles. |

# Visual language

| Need | Option | Licence |
|---|---|---|
| Rounded, heavy, readable typeface | Nunito[^nunito] | SIL OFL 1.1 |
| Icon set | Lucide[^lucide] or Phosphor[^phosphor] | ISC / MIT |
| People illustrations to remix into original characters | Open Peeps[^openpeeps] | CC0 |
| UI sprites (buttons, panels) | Kenney UI packs[^kenney] | CC0 |
| Accessible dialogs, toggles, progress | Radix UI primitives[^radix] | MIT |

# Notifications and offline

| Need | Option | Licence |
|---|---|---|
| Offline shell, caching, push plumbing for a web app | Workbox[^workbox] | MIT |

[^confetti]: canvas-confetti
[^lottie]: lottie-web
[^rive]: Rive web runtime
[^howler]: howler.js
[^mdn-vibrate]: MDN, Vibration API
[^lucide]: Lucide
[^phosphor]: Phosphor
[^nunito]: Nunito
[^kenney]: Kenney assets
[^openpeeps]: Open Peeps
[^radix]: Radix UI
[^workbox]: Workbox
