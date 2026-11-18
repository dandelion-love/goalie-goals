---
type: Research Finding
title: Open rounded fonts compared
description: Nunito, Fredoka, Baloo 2, Lexend and four others under the SIL Open Font License, compared on weights, letter proportions, file size as a self-hosted Latin woff2 and reserved names.
tags: [visual-identity, typography, fonts, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: gf-nunito, resource: https://github.com/google/fonts/tree/main/ofl/nunito, title: "Google Fonts library: Nunito (METADATA.pb, OFL.txt)" }
  - { id: gf-fredoka, resource: https://github.com/google/fonts/tree/main/ofl/fredoka, title: "Google Fonts library: Fredoka (METADATA.pb, OFL.txt)" }
  - { id: gf-baloo2, resource: https://github.com/google/fonts/tree/main/ofl/baloo2, title: "Google Fonts library: Baloo 2 (METADATA.pb, OFL.txt)" }
  - { id: gf-lexend, resource: https://github.com/google/fonts/tree/main/ofl/lexend, title: "Google Fonts library: Lexend (METADATA.pb, OFL.txt)" }
  - { id: gf-quicksand, resource: https://github.com/google/fonts/tree/main/ofl/quicksand, title: "Google Fonts library: Quicksand (METADATA.pb, OFL.txt)" }
  - { id: gf-varela, resource: https://github.com/google/fonts/tree/main/ofl/varelaround, title: "Google Fonts library: Varela Round (METADATA.pb, OFL.txt)" }
  - { id: gf-mplus, resource: https://github.com/google/fonts/tree/main/ofl/mplusrounded1c, title: "Google Fonts library: M PLUS Rounded 1c (METADATA.pb)" }
  - { id: gf-atkinson, resource: https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegible, title: "Google Fonts library: Atkinson Hyperlegible (METADATA.pb, OFL.txt)" }
  - { id: lexend-repo, resource: https://github.com/googlefonts/lexend, title: "Lexend source repository" }
  - { id: capsize-metrics, resource: https://github.com/seek-oss/capsize, title: "Capsize: font metrics package (@capsizecss/metrics 4.5.0)" }
  - { id: fontsource-files, resource: https://www.jsdelivr.com/package/npm/@fontsource-variable/nunito, title: "Fontsource packages 5.3.0 on jsDelivr: file listings with byte sizes" }
  - { id: ofl-faq, resource: https://openfontlicense.org/ofl-faq/, title: "SIL Open Font License FAQ" }
---

# What was compared

Eight open families with rounded or friendly letterforms, all under the SIL Open Font
License 1.1 (OFL), read from each family's own `METADATA.pb` and `OFL.txt` in the Google
Fonts library repository.[^gf-nunito] [^gf-fredoka] [^gf-baloo2] [^gf-lexend]
[^gf-quicksand] [^gf-varela] [^gf-mplus] [^gf-atkinson] Proportions are from the Capsize
metrics package, which reads them from the font files.[^capsize-metrics] Sizes are the
byte counts of Fontsource's pre-built Latin woff2 files, read from the package listing
without downloading the fonts.[^fontsource-files]

# Table

| Family | Rounded? | Weights | Axes | Cap height (em) | x-height (em) | Avg. lowercase width (em) | Latin woff2 | Reserved Font Name |
|---|---|---|---|---|---|---|---|---|
| Nunito | Yes, rounded terminals | 200 to 1000, with italics | `wght` | 0.705 | 0.484 | 0.500 | 39,128 B, one variable file for every weight | None |
| Fredoka | Yes, soft and round | 300 to 700 | `wght`, `wdth` 75 to 125 | 0.700 | 0.500 | 0.543 | 29,732 B (weight axis only); 67,820 B with the width axis | None |
| Baloo 2 | Yes, chunky | 400 to 800 | `wght` | 0.602 | 0.460 | 0.645 | 33,188 B | None |
| Lexend | No: geometric, plain terminals | 100 to 900 | `wght` | 0.700 | 0.525 | 0.584 | 39,680 B | "RevReading Lexend" only |
| Quicksand | Yes, light and thin | 300 to 700 | `wght` | 0.700 | 0.503 | 0.584 | 28,244 B | "Quicksand" |
| Varela Round | Yes | 400 only | none | 0.698 | 0.510 | 0.514 | 22,948 B | "Varela", "Varela Round" |
| M PLUS Rounded 1c | Yes | 100 to 900 in seven static files | none | not in the metrics package | not in the metrics package | not in the metrics package | about 22,000 B per weight, so about 67,000 B for 400, 800 and 900 | None |
| Atkinson Hyperlegible | No: built for low vision | 400 and 700, with italics | none | 0.668 | 0.496 | 0.527 | 17,208 B and 17,524 B | None |

# Notes per family

- **Nunito** covers body text and heavy display weights from one variable file. The 900 and
  1000 weights give the bold look without a second family. Its x-height (0.484 em) is the
  lowest of the group, so body text should be set a little larger than with Lexend or
  Fredoka.[^capsize-metrics]
- **Fredoka** is the roundest and the friendliest at display sizes, but stops at 700, so it
  cannot go as heavy as Nunito. It would be a second file next to a body face.[^gf-fredoka]
- **Baloo 2** is built for Indic scripts with a Latin companion. Its Latin cap height is low
  (0.602 em) and its letters are wide (0.645 em), so it takes more room for the same
  legibility, which matters for big timers on a narrow screen.[^capsize-metrics]
  [^gf-baloo2]
- **Lexend** was designed around reading-fluency research, and its large x-height (0.525 em)
  helps at small sizes. Its source repository makes the fluency claim but does not cite the
  studies.[^lexend-repo] It is not rounded, so it does not give the look on its own.
- **Quicksand** and **Varela Round** are rounded but light (Quicksand) or single-weight
  (Varela Round), and both reserve their names under the OFL.[^gf-quicksand] [^gf-varela]
- **M PLUS Rounded 1c** reaches 900 and covers Japanese, but ships as static files, one per
  weight, so three weights cost more than Nunito's whole range.[^gf-mplus]
- **Atkinson Hyperlegible** is not rounded, but its letters are drawn to be told apart
  (l, I and 1; O and 0). It is the candidate for a later "easier reading" setting.[^gf-atkinson]

# Reserved names and subsetting

The OFL FAQ treats a subset or a format change as a Modified Version, which may not carry
a Reserved Font Name.[^ofl-faq] Fonts with no reserved name (Nunito, Fredoka, Baloo 2,
M PLUS Rounded 1c, Atkinson Hyperlegible) can be subset and self-hosted under their own
name. Quicksand and Varela Round would have to be renamed inside the font after subsetting.
Lexend reserves only "RevReading Lexend", so its usual name is free.

# Not measured here

- Whether each family has tabular figures (`tnum`), which a running timer needs so digits
  do not jump. Check in the font build before relying on it.
- Byte sizes after our own subsetting; Fontsource's Latin files are the starting point.

[^gf-nunito]: Nunito metadata and licence
[^gf-fredoka]: Fredoka metadata and licence
[^gf-baloo2]: Baloo 2 metadata and licence
[^gf-lexend]: Lexend metadata and licence
[^gf-quicksand]: Quicksand metadata and licence
[^gf-varela]: Varela Round metadata and licence
[^gf-mplus]: M PLUS Rounded 1c metadata
[^gf-atkinson]: Atkinson Hyperlegible metadata and licence
[^lexend-repo]: Lexend repository
[^capsize-metrics]: Capsize font metrics
[^fontsource-files]: Fontsource file sizes
[^ofl-faq]: OFL FAQ, questions 2.2 and 2.6
