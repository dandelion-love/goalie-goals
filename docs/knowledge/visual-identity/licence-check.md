---
type: Reference
title: Licence check of fonts and token tools
description: The licence of every font, package and tool in the visual-identity research, read at its source repository, with its conditions and a verdict for a public repo and a hosted app.
tags: [visual-identity, licensing, fonts, reference]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: nunito, resource: https://github.com/googlefonts/nunito/blob/main/OFL.txt, title: "Nunito OFL.txt" }
  - { id: fredoka, resource: https://github.com/hafontia/Fredoka-One/blob/gh-pages/OFL.txt, title: "Fredoka OFL.txt" }
  - { id: baloo2, resource: https://github.com/EkType/Baloo2/blob/master/OFL.txt, title: "Baloo 2 OFL.txt" }
  - { id: lexend, resource: https://github.com/googlefonts/lexend/blob/main/OFL.txt, title: "Lexend OFL.txt" }
  - { id: quicksand, resource: https://github.com/andrew-paglinawan/QuicksandFamily/blob/master/OFL.txt, title: "Quicksand OFL.txt" }
  - { id: varela, resource: https://github.com/google/fonts/blob/main/ofl/varelaround/OFL.txt, title: "Varela Round OFL.txt (Google Fonts library)" }
  - { id: mplus, resource: https://github.com/coz-m/MPLUS_FONTS/blob/master/OFL.txt, title: "M+ fonts OFL.txt" }
  - { id: atkinson, resource: https://github.com/googlefonts/atkinson-hyperlegible/blob/main/OFL.txt, title: "Atkinson Hyperlegible OFL.txt" }
  - { id: ofl, resource: https://openfontlicense.org/open-font-license-official-text/, title: "SIL Open Font License 1.1, official text" }
  - { id: ofl-faq, resource: https://openfontlicense.org/ofl-faq/, title: "SIL Open Font License FAQ" }
  - { id: fontsource, resource: https://github.com/fontsource/fontsource/blob/main/LICENSE, title: "Fontsource LICENSE (MIT)" }
  - { id: fonttools, resource: https://github.com/fonttools/fonttools/blob/main/LICENSE, title: "fontTools LICENSE (MIT)" }
  - { id: capsize, resource: https://github.com/seek-oss/capsize/blob/master/LICENSE, title: "Capsize LICENSE (MIT)" }
  - { id: sd, resource: https://github.com/style-dictionary/style-dictionary/blob/main/LICENSE, title: "Style Dictionary LICENSE (Apache-2.0)" }
  - { id: op, resource: https://github.com/argyleink/open-props/blob/main/LICENSE, title: "Open Props LICENSE (MIT)" }
  - { id: jit, resource: https://github.com/GoogleChromeLabs/postcss-jit-props/blob/main/LICENSE, title: "postcss-jit-props LICENSE (Apache-2.0)" }
  - { id: radix, resource: https://github.com/radix-ui/colors/blob/main/LICENSE, title: "Radix Colors LICENSE (MIT)" }
  - { id: leonardo, resource: https://github.com/adobe/leonardo/blob/main/LICENSE, title: "Leonardo LICENSE (Apache-2.0)" }
  - { id: dtcg, resource: https://www.designtokens.org/tr/2025.10/, title: "Design Tokens Community Group: technical reports 2025.10" }
---

# How it was checked

Each licence was read from the project's own repository: the licence file, and for fonts
the copyright line at its head, which is where a Reserved Font Name is declared. The
GitHub licence API was used to find the file; where it reported no match, the file was
read directly. Checked 2026-11-18.

# Fonts

All under the SIL Open Font License 1.1. The OFL allows use, study, modification and
redistribution, including bundling with software and serving from a website; the licence
and copyright notice must travel with the fonts; fonts may not be sold on their own; a
Modified Version (a subset counts) may not use a Reserved Font Name.[^ofl] [^ofl-faq]

| Font | Licence file | Copyright line | Reserved Font Name | Verdict |
|---|---|---|---|---|
| Nunito | OFL 1.1[^nunito] | The Nunito Project Authors, 2014 | none | **Use**; subset freely |
| Fredoka | OFL 1.1[^fredoka] | The Fredoka Project Authors, 2016 | none | Fits; not chosen |
| Baloo 2 | OFL 1.1 (GitHub reports no SPDX match; the file and README say OFL 1.1)[^baloo2] | The Baloo 2 Project Authors, 2019 | none | Fits; not chosen |
| Lexend | OFL 1.1[^lexend] | The Lexend Project Authors, 2018 | "RevReading Lexend" | Fits; not chosen |
| Quicksand | OFL 1.1[^quicksand] | The Quicksand Project Authors, 2011 | "Quicksand" | Fits only if a subset is renamed; not chosen |
| Varela Round | OFL 1.1[^varela] | The Varela Round Project Authors, 2023 | "Varela", "Varela Round" | Fits only if a subset is renamed; not chosen |
| M PLUS Rounded 1c | OFL 1.1[^mplus] | The M+ FONTS Project Authors, 2021 | none | Fits; not chosen |
| Atkinson Hyperlegible | OFL 1.1[^atkinson] | Braille Institute of America, 2020 | none | Fits; kept for a later reading-help setting |

# Packages and tools

| Tool | Licence | Conditions | Used how | Verdict |
|---|---|---|---|---|
| Fontsource (`@fontsource-variable/nunito`) | Package code MIT;[^fontsource] the font files inside keep their OFL 1.1 | keep both notices | build-time dependency; files served from our origin | **Use** |
| fontTools (`pyftsubset`) | MIT[^fonttools] | keep the notice | optional build step | Fits; only if a smaller subset is needed |
| Capsize metrics | MIT[^capsize] | keep the notice | research only (font proportions); optional for fallback metrics | Fits |
| Style Dictionary | Apache-2.0[^sd] | keep the licence and any NOTICE file; mark changed files | not used now | Fits |
| Open Props | MIT[^op] | keep the notice | not used | Fits |
| postcss-jit-props | Apache-2.0[^jit] | as above | not used | Fits |
| Radix Colors | MIT[^radix] | keep the notice | not used | Fits |
| Leonardo | Apache-2.0[^leonardo] | as above | not used | Fits |
| Design tokens format 2025.10 | W3C community group final report[^dtcg] | none for following a format | naming guidance only | Fits |

# What the app must ship

- `OFL.txt` for Nunito next to the font files, or in the app's open-source notices screen.
- The MIT notice for Fontsource if its CSS is shipped as-is.

[^nunito]: Nunito OFL.txt
[^fredoka]: Fredoka OFL.txt
[^baloo2]: Baloo 2 OFL.txt
[^lexend]: Lexend OFL.txt
[^quicksand]: Quicksand OFL.txt
[^varela]: Varela Round OFL.txt
[^mplus]: M+ fonts OFL.txt
[^atkinson]: Atkinson Hyperlegible OFL.txt
[^ofl]: OFL 1.1 official text
[^ofl-faq]: OFL FAQ
[^fontsource]: Fontsource licence
[^fonttools]: fontTools licence
[^capsize]: Capsize licence
[^sd]: Style Dictionary licence
[^op]: Open Props licence
[^jit]: postcss-jit-props licence
[^radix]: Radix Colors licence
[^leonardo]: Leonardo licence
[^dtcg]: Design tokens reports 2025.10
