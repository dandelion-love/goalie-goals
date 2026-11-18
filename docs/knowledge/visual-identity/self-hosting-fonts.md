---
type: Research Finding
title: Self-hosting open fonts
description: Why the app serves its fonts from its own origin, never a font CDN at runtime, and how to keep them small with woff2, Latin subsets and one variable file.
tags: [visual-identity, typography, privacy, performance, offline]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: ofl, resource: https://openfontlicense.org/open-font-license-official-text/, title: "SIL Open Font License 1.1, official text" }
  - { id: ofl-faq, resource: https://openfontlicense.org/ofl-faq/, title: "SIL Open Font License FAQ" }
  - { id: fontsource, resource: https://github.com/fontsource/fontsource, title: "Fontsource: self-hostable open fonts as npm packages (MIT)" }
  - { id: fontsource-files, resource: https://www.jsdelivr.com/package/npm/@fontsource-variable/nunito, title: "Fontsource packages 5.3.0 on jsDelivr: file listings with byte sizes" }
  - { id: fonttools, resource: https://github.com/fonttools/fonttools, title: "fontTools, including the pyftsubset subsetter (MIT)" }
  - { id: mdn-unicode-range, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range, title: "MDN: unicode-range" }
  - { id: mdn-font-display, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display, title: "MDN: font-display" }
  - { id: offline, resource: /platform/offline-storage-and-service-workers.md, title: Service workers and offline storage limits on iPadOS }
  - { id: minors, resource: /parent-approval/minors-privacy-regimes.md, title: Minors' privacy regimes }
---

# Why not a font CDN

- Every request to a third-party font host sends that host the device's IP address, user
  agent and the page that asked. For an app used by a minor, the app should not hand that
  to anyone it does not need to; the
  [minors' privacy regimes](/parent-approval/minors-privacy-regimes.md) finding sets the
  general rule of collecting and sharing as little as possible.[^minors]
- A font fetched from another origin is one more thing that can fail offline. Fonts served
  by the app are precached by the service worker with the rest of the shell (see
  [offline storage](/platform/offline-storage-and-service-workers.md)).[^offline]
- The OFL lets the fonts be bundled and redistributed with software, so self-hosting needs
  no permission; the licence text travels with the font files.[^ofl]

# How to keep them small

- **woff2 only.** Every browser the app supports reads woff2; no woff or ttf fallbacks.
- **One variable file.** Nunito's weight axis puts 200 to 1000 in one Latin woff2 of
  39,128 bytes, against roughly 20 KB per weight for static files.[^fontsource-files]
- **Latin first, extended on demand.** Separate `@font-face` rules with `unicode-range`
  make the browser fetch the Latin Extended file only when such a character appears on the
  page.[^mdn-unicode-range]
- **No italics** until a screen needs them; that drops a second file.
- **`font-display: swap`** shows the fallback at once and swaps when the font arrives, so a
  slow load never hides a cue.[^mdn-font-display] A fallback face with matched metrics
  (`size-adjust`, `ascent-override`) keeps the swap from shifting the layout.

# Two ways to get the files

| Route | What it is | Fit |
|---|---|---|
| Fontsource npm package, for example `@fontsource-variable/nunito` | Pre-subset woff2 files and `@font-face` CSS, imported into the Vite build and served from the app's own origin. Package code MIT, fonts under their own OFL.[^fontsource] | Simplest; no build step of our own. |
| `pyftsubset` from fontTools | Subset the upstream variable font to exactly the characters the app uses and write woff2.[^fonttools] | Smallest files; a build step to maintain. Needed only if the Fontsource file proves too big. |

A subset is a Modified Version under the OFL, so a font with a Reserved Font Name would
need a new name inside the file. Nunito has none.[^ofl-faq]

[^ofl]: OFL 1.1, permission and conditions 1 and 2
[^ofl-faq]: OFL FAQ, questions 2.2 and 2.6
[^fontsource]: Fontsource
[^fontsource-files]: Fontsource file sizes
[^fonttools]: fontTools
[^mdn-unicode-range]: MDN unicode-range
[^mdn-font-display]: MDN font-display
[^offline]: Offline storage finding
[^minors]: Minors' privacy regimes finding
