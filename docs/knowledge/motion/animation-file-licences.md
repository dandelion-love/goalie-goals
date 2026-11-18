---
type: Research Finding
title: Animation file licences, checked apart from runtimes
description: Why an MIT player does not license the animations played on it, what the public Lottie and Rive file libraries actually grant, and which animation files this app may ship.
tags: [motion, animation, licensing, lottie, rive, clean-room]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: lottie-licence-page, resource: https://lottiefiles.com/page/license, title: "LottieFiles: Lottie Simple License" }
  - { id: lottie-help, resource: https://help.lottiefiles.com/animation-licensing-basics-, title: "LottieFiles help: animation licensing basics" }
  - { id: rive-marketplace, resource: https://rive.app/docs/community/marketplace-overview, title: "Rive docs: Marketplace overview" }
  - { id: cc-by-4, resource: https://creativecommons.org/licenses/by/4.0/, title: "CC BY 4.0 licence deed" }
  - { id: cc0, resource: https://creativecommons.org/publicdomain/zero/1.0/, title: "CC0 1.0" }
  - { id: confetti, resource: https://github.com/catdad/canvas-confetti, title: "canvas-confetti README" }
  - { id: runtimes, resource: /motion/libraries-and-runtimes.md, title: "Open motion libraries and runtimes compared" }
  - { id: video, resource: /exercise-media/video-and-animation.md, title: "Video and animation sources" }
  - { id: storage, resource: /exercise-media/storage-format.md, title: "Media storage format and metadata" }
---

# Summary

A runtime's licence covers its code, not the files it plays. lottie-web, dotlottie-web and
the Rive runtime are MIT,[^runtimes] but the public file libraries for them carry their own
terms: LottieFiles uses a custom licence, and the Rive Marketplace uses CC BY 4.0 with
provenance resting on each uploader. This app ships only animation it makes itself, or
CC0 files whose source page says so; motion drawn by code (CSS, the Web Animations API,
canvas-confetti's built-in shapes) has no file to license.

# Two licences, always

| Layer | What it covers | Where to check |
| --- | --- | --- |
| Runtime (player or library) | The JavaScript and WebAssembly shipped in the bundle | The project's LICENSE file[^runtimes] |
| Animation file (`.json`, `.lottie`, `.riv`, SVG) | The drawing, timing and any characters in it | The file's own source page, per file |

A file is cleared only when its own licence is clear, its author is named, and nothing in
it copies someone else's character or brand. The runtime passing says nothing about the
file.

# Public file libraries

| Library | Licence of the files | Conditions that matter | Fit here |
| --- | --- | --- | --- |
| LottieFiles free animations | Lottie Simple License, a custom licence by the platform's owner[^lottie-licence-page] | Commercial use allowed; derivatives under the same licence; no collecting or compiling files to build a similar service; attribution optional but encouraged[^lottie-licence-page][^lottie-help] | Refused: a custom licence, and provenance rests on each uploader. Already on the media Decision's never-used list.[^video] |
| Rive Marketplace (formerly Community) | CC BY 4.0 for every file, per the docs[^rive-marketplace][^cc-by-4] | Attribution required; the uploader's right to grant it is not checked by the platform | Not used: the licence is clear, but provenance per file is not, and a remix of a third-party character would carry that risk. A specific file could be reconsidered by a person, with its author credited. |
| CC0 files with a stated source | Public domain dedication[^cc0] | None; credit still recorded | Allowed, file by file, with the source page and check date in the credits manifest.[^storage] |

# Motion with no file

- **CSS and the Web Animations API** animate the app's own SVG and DOM; the only asset is
  the app's own art.
- **canvas-confetti** draws squares, circles and stars from code. Its `shapeFromPath` and
  `shapeFromText` helpers turn a path or a text glyph into a shape;[^confetti] a path the
  app draws is its own art, but a glyph rendered from a platform emoji font is that font
  vendor's artwork, so the app keeps to the built-in shapes and its own paths.

# Rule of thumb

Before any animation file enters the repo: its own source page names the licence and the
author, the licence is the app's own or CC0, a credits entry exists (`origin: own` or
`as-is`, `checked_at`),[^storage] and a person has looked at it for anything resembling
another product's characters.

[^lottie-licence-page]: LottieFiles, Lottie Simple License
[^lottie-help]: LottieFiles help, licensing basics
[^rive-marketplace]: Rive docs, Marketplace overview
[^cc-by-4]: CC BY 4.0
[^cc0]: CC0 1.0
[^confetti]: canvas-confetti README
[^runtimes]: Open motion libraries and runtimes compared
[^video]: Video and animation sources
[^storage]: Media storage format and metadata
