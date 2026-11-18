---
type: Research Finding
title: Legibility at a distance
description: Character height is judged by the visual angle it subtends; display ergonomics standards ask for at least 16 and prefer 20 to 22 minutes of arc, which turns into a minimum digit height for a timer read from the floor.
tags: [quality, typography, legibility, ergonomics, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
sources:
  - { id: komischke, resource: https://www.uxmatters.com/mt/archives/2009/01/text-treatment-and-the-user-interface.php, title: "Komischke (2009), Text treatment and the user interface, UXmatters (quoting ISO 9241-3)" }
  - { id: nng-teens, resource: https://www.nngroup.com/articles/usability-of-websites-for-teenagers/, title: "Nielsen Norman Group: Teenager's UX, designing for teens" }
  - { id: mdn-measure, resource: https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics/actualBoundingBoxAscent, title: "MDN: TextMetrics.actualBoundingBoxAscent" }
---

# The rule

Display ergonomics (ISO 9241-3, as quoted by Komischke) prefers character heights of 20
to 22 minutes of arc for most tasks, with 16 minutes of arc as the minimum.[^komischke]
A visual angle turns into a physical height for a given distance:

```text
height = distance x tan(angle)
20 arcmin at 2.5 m: 2500 mm x tan(20/60 degree) = 2500 x 0.00582 = 14.5 mm
```

# Turning it into CSS pixels on an iPad

iPads draw one CSS pixel as two device pixels at about 264 pixels per inch, so one CSS
pixel is about 0.19 mm (25.4 / 132). At 2.5 m, 20 minutes of arc is about 76 CSS px of
digit height. A digit's height is close to the font's cap height, roughly 0.7 of the
font size in most sans-serif faces, so a countdown read from 2.5 m needs a font size of
about 108 CSS px. The glyph height can be measured directly in the browser with a canvas
text measurement.[^mdn-measure]

| Distance | 16 arcmin (minimum) | 20 arcmin (preferred) |
|---|---|---|
| 1.5 m | 37 CSS px | 46 CSS px |
| 2.5 m | 61 CSS px | 76 CSS px |
| 3.0 m | 73 CSS px | 91 CSS px |

Heights are rounded up to the next whole CSS pixel. The 0.19 mm figure is approximate and varies slightly by iPad model; the rubric fixes it
so the same number is used every time.

# How it applies to a two-person training app

- The keeper glances at the timer and set count from a mat or a goal mouth a few metres
  away; those two numbers are the only text that must pass at distance. Instructions and
  cues are read up close between sets.
- Teens dislike small type and move quickly through screens, which argues for generous
  sizes everywhere, not only on the timer.[^nng-teens]

[^komischke]: Komischke (2009), UXmatters, quoting ISO 9241-3.
[^nng-teens]: Nielsen Norman Group, Teenager's UX.
[^mdn-measure]: MDN, TextMetrics.actualBoundingBoxAscent.
