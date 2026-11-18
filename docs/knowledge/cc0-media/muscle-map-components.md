---
type: Research Finding
title: Open muscle-map components and their art
description: Nine React and plain-JavaScript body-highlighter packages, with the code licence and the art's licence and origin checked separately; one package has clean art, most share one drawing whose origin is unanswered.
tags: [cc0-media, anatomy, muscle-map, licensing, npm]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T07:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: bm-repo, resource: https://github.com/vulovix/body-muscles, title: "body-muscles repository and README (checked 2026-11-18)" }
  - { id: bm-licence, resource: https://github.com/vulovix/body-muscles/blob/main/LICENSE, title: body-muscles LICENSE (Apache-2.0) }
  - { id: bm-notice, resource: https://github.com/vulovix/body-muscles/blob/main/NOTICE, title: body-muscles NOTICE }
  - { id: bm-data, resource: https://github.com/vulovix/body-muscles/tree/main/src/data, title: "body-muscles path data and muscle groups" }
  - { id: bm-demo, resource: https://vulovix.github.io/body-muscles/, title: body-muscles live demo }
  - { id: bm-themes-pr, resource: https://github.com/vulovix/body-muscles/pull/1, title: "body-muscles pull request 1, swappable art themes (closed unmerged)" }
  - { id: bm-npm, resource: https://www.npmjs.com/package/body-muscles, title: body-muscles on npm }
  - { id: rnbh-repo, resource: https://github.com/HichamELBSI/react-native-body-highlighter, title: react-native-body-highlighter repository }
  - { id: rnbh-licence, resource: https://github.com/HichamELBSI/react-native-body-highlighter/blob/main/LICENSE, title: react-native-body-highlighter LICENSE (MIT) }
  - { id: rnbh-issue, resource: https://github.com/HichamELBSI/react-native-body-highlighter/issues/102, title: "react-native-body-highlighter issue 102, licence question about the anatomy path data" }
  - { id: rbh-repo, resource: https://github.com/giavinh79/react-body-highlighter, title: react-body-highlighter repository and README }
  - { id: rbh-npm, resource: https://www.npmjs.com/package/react-body-highlighter, title: react-body-highlighter on npm }
  - { id: bh-repo, resource: https://github.com/lahaxearnaud/body-highlighter, title: body-highlighter repository and README }
  - { id: rmh-repo, resource: https://github.com/soroojshehryar/react-muscle-highlighter, title: react-muscle-highlighter repository, README and LICENSE }
  - { id: amxn-readme, resource: "https://www.npmjs.com/package/@amxn88/muscle-map/v/3.0.0", title: "@amxn88/muscle-map 3.0.0 on npm, README credits section" }
  - { id: mm-repo, resource: https://github.com/Jsplice/MuscleMap, title: MuscleMap repository, README and LICENSE scope }
  - { id: vue-readme, resource: "https://www.npmjs.com/package/@lucawahlen/vue-human-muscle-anatomy/v/1.1.0", title: vue-human-muscle-anatomy 1.1.0 on npm, README }
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media decision }
---

# Summary

Searched npm and GitHub on 2026-11-18 for "body highlighter", "muscle map", "muscle
highlighter" and "human body" components. For each package the code licence was read from
its LICENSE file and the art's licence and origin from its README, NOTICE, licence scope
and issues. Path data was compared between packages to find shared drawings.

Most packages descend from one drawing, the one in react-native-body-highlighter. Its
MIT licence covers the repository, but a public question asking whether the path data is
the author's own work, and whether the MIT licence is meant to cover it, has had no answer
from the author since 2026-08-16.[^rnbh-issue] Under the media Decision an unclear origin is
a rejection.[^media-decision] One package, body-muscles, ships its own drawing under
Apache-2.0 with no such question.

# Licence table

| Package | Code licence | Art licence and origin | Maintained | Restyle and per-muscle highlight | Verdict |
|---|---|---|---|---|---|
| **body-muscles** (npm 1.0.0, plain TypeScript, no dependencies) | Apache-2.0[^bm-licence] | Same file covers the whole repository; NOTICE names the package author as copyright holder; no source or tracing reference is stated.[^bm-notice][^bm-repo] | Last push 2026-04; one release[^bm-npm] | Yes: path data is exported per muscle (`FRONT_MUSCLES`, `BACK_MUSCLES`) with ids and a group table, 89 regions[^bm-data] | **Passes.** Apache-2.0 is on the credits check's list. |
| react-native-body-highlighter (3.2.0) | MIT[^rnbh-licence] | Origin not stated; the licence question in issue 102 is unanswered.[^rnbh-issue] | Active (2026-10) | Yes, per slug, but built for React Native SVG[^rnbh-repo] | **Rejected:** art origin unclear. |
| react-body-highlighter (2.0.5, React) | MIT | README says its SVG polygons were taken from react-native-body-highlighter.[^rbh-repo] | Last npm release 2022[^rbh-npm] | Yes, per muscle, through a `data` prop with frequency colours | **Rejected:** same unclear art. |
| body-highlighter (plain JS) | MIT | A fork of react-body-highlighter, same art.[^bh-repo] | Active (2026-11) | Yes | **Rejected:** same unclear art. |
| react-muscle-highlighter (1.2.0, React) | MIT, licence file names no copyright holder[^rmh-repo] | All 89 front paths are byte-identical to react-native-body-highlighter's, with no credit to it; the README says only "SVG body illustrations". | 2026-01 | Yes | **Rejected:** copied art, upstream notice missing, origin unclear. |
| @amxn88/muscle-map (3.0.0, web component) | MIT in package metadata; no LICENSE file in the tarball; the repository link returns 404 | Credits say the path data is derived from react-muscle-highlighter.[^amxn-readme] | Unknown | Yes | **Rejected:** same chain, no licence file. |
| MuscleMap (`@musclemap/*`, React) | MIT, with a scope note covering the path data[^mm-repo] | Paths traced over body images the maintainer generated with an image model; photoreal "hybrid" bodies ship in the package.[^mm-repo] | Active, "early alpha" | Yes, but designed as a 0 to 100 heat map of training scores | **Rejected:** AI-derived art (the media Decision needs a person's ruling per asset), realistic bodies, and a design built to track a person's load. |
| vue-human-muscle-anatomy (1.1.0) | MIT in package; repository link returns 404 | README says the author drew the SVG.[^vue-readme] | Unknown | Yes | **Not usable:** Vue only, and the source cannot be read. |

# body-muscles in detail

- **Figure:** one faceted, low-poly figure in a neutral grey, front and back, with a plain
  head and no face, hair, skin or sex characteristics.[^bm-demo] It reads as a diagram,
  not a realistic body.
- **Regions:** 40 front and 49 back regions, each a single path with an id such as
  `quads-left` or `gluteus-medius-right`; a `MUSCLE_GROUPS` table groups them into seven
  areas.[^bm-data] Glute medius, hip flexors, tibialis and quadratus lumborum have their own
  regions, which the goalkeeper cards need and the other packages lack.
- **Size:** the two path-data files are about 25 KB of TypeScript together.[^bm-data]
- **Restyling:** the bundled `BodyChart` class draws its own colours (a 0 to 10 intensity
  scale from slate to red), glow filters and a drop shadow.[^bm-repo] None of that fits the
  app. The path data is exported on its own, so the app can render it with its own React
  component and tokens and ignore the renderer.
- **Themes proposal:** a 2026 pull request proposed bundling the react-muscle-highlighter
  art and CC BY-SA themes beside the default; it was closed without merging, so the
  published package holds only the author's own drawing.[^bm-themes-pr]
- **Apache-2.0 duties:** keep the licence text and the NOTICE with the copied data, and mark
  changed files as changed. The licence grants no trademark rights; the app would not use
  the package name in its interface.[^bm-licence][^bm-notice]

# Related

* [Open muscle diagrams and CC0 sets](/cc0-media/muscle-map-diagrams.md) - wger, Commons and the CC0 search.
* [Muscle map for exercise dossiers](/cc0-media/muscle-map-recommendation.md) - The recommendation and mapping table.

[^bm-repo]: body-muscles repository and README
[^bm-licence]: body-muscles LICENSE
[^bm-notice]: body-muscles NOTICE
[^bm-data]: body-muscles path data and muscle groups
[^bm-demo]: body-muscles live demo
[^bm-themes-pr]: body-muscles pull request 1, closed unmerged
[^bm-npm]: body-muscles on npm
[^rnbh-repo]: react-native-body-highlighter repository
[^rnbh-licence]: react-native-body-highlighter LICENSE
[^rnbh-issue]: react-native-body-highlighter issue 102
[^rbh-repo]: react-body-highlighter repository and README
[^rbh-npm]: react-body-highlighter on npm
[^bh-repo]: body-highlighter repository and README
[^rmh-repo]: react-muscle-highlighter repository
[^amxn-readme]: @amxn88/muscle-map README
[^mm-repo]: MuscleMap repository and licence scope
[^vue-readme]: vue-human-muscle-anatomy README
[^media-decision]: Exercise media decision
