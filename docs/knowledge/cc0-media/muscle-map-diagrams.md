---
type: Research Finding
title: Open muscle diagrams and CC0 sets
description: wger's muscle overlays and every SVG in Commons' human muscular system category are CC BY-SA anatomical drawings; no CC0 front and back muscle map was found.
tags: [cc0-media, anatomy, muscle-map, licensing, wger, wikimedia-commons]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T07:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: wger-muscles, resource: https://github.com/wger-project/wger/tree/master/wger/core/static/images/muscles, title: "wger muscle images folder and its SOURCES file (checked 2026-11-18)" }
  - { id: wger-muscle-api, resource: "https://wger.de/api/v2/muscle/?format=json", title: wger API, muscle list }
  - { id: wger-repo, resource: https://github.com/wger-project/wger, title: wger repository (code under AGPL-3.0) }
  - { id: c-front, resource: https://commons.wikimedia.org/wiki/File:Muscular_system.svg, title: "Commons, Muscular system.svg (CC BY-SA 3.0)" }
  - { id: c-back, resource: https://commons.wikimedia.org/wiki/File:Muscular_system-back.svg, title: "Commons, Muscular system-back.svg (CC BY-SA 3.0)" }
  - { id: c-cat, resource: https://commons.wikimedia.org/wiki/Category:SVG_human_muscular_system, title: Commons, SVG human muscular system category }
  - { id: c-openstax, resource: https://commons.wikimedia.org/wiki/File:Muscles_front_and_back.svg, title: "Commons, Muscles front and back.svg (CC BY-SA 4.0, after OpenStax)" }
  - { id: c-enko, resource: https://commons.wikimedia.org/wiki/File:Anatomical_terminology_muscles_enko.svg, title: "Commons, Anatomical terminology muscles enko.svg (CC BY-SA 4.0)" }
  - { id: c-bougle, resource: "https://commons.wikimedia.org/wiki/File:Bougle,_Human_muscular_system,_anterior-ca.svg", title: "Commons, Bougle human muscular system, anterior (CC BY-SA 3.0)" }
  - { id: healthicons, resource: https://github.com/resolvetosavelives/healthicons, title: Health Icons repository, body icons }
  - { id: cc0-sets, resource: /cc0-media/cc0-icon-and-character-sets.md, title: CC0 icon and character sets }
  - { id: pdv, resource: /cc0-media/public-domain-vectors.md, title: Public Domain Vectors and FreeSVG }
  - { id: databases, resource: /exercise-media/open-exercise-databases.md, title: Open exercise databases with media }
  - { id: cc-by-sa-3, resource: https://creativecommons.org/licenses/by-sa/3.0/, title: CC BY-SA 3.0 licence deed }
---

# wger muscle diagrams

- **What:** a front and a back base figure plus one overlay SVG per muscle, in a "main"
  and a "secondary" colour, for 15 muscles: biceps, front deltoid, serratus anterior,
  chest, triceps, rectus abdominis, gastrocnemius, gluteus maximus, trapezius, quadriceps,
  biceps femoris, latissimus dorsi, brachialis, external oblique and soleus.[^wger-muscles][^wger-muscle-api]
- **Licence:** the folder's sources file points to the two Commons files below, both
  CC BY-SA 3.0 by their uploader; wger's own code is AGPL-3.0, which does not apply to the
  traced art.[^wger-muscles][^c-front][^c-back][^wger-repo] This matches the earlier exercise-media survey.[^databases]
- **Restyle and highlight:** yes. Each overlay is its own file, so a muscle is shown by
  stacking its overlay and recolouring its fill. Adapted files stay CC BY-SA 3.0 or a later
  version, with credit.[^cc-by-sa-3]
- **Fit:** the base is a shaded, semi-realistic muscular figure, and 15 muscles leave out
  glute medius, hip flexors, adductors, hamstrings beyond the biceps femoris, tibialis and
  the lower back, which the goalkeeper cards need.
- **Verdict:** licence passes if kept in `content/` with credits; second choice on fit.

# Wikimedia Commons anatomy SVGs

The category of SVG human muscular system diagrams was read file by file on
2026-11-18 through the Commons API, which reads each file page.[^c-cat]

| File | Licence on the page | What it is |
|---|---|---|
| Muscular system, front and back | CC BY-SA 3.0, built from earlier Commons drawings[^c-front][^c-back] | The source of wger's overlays; a shaded anatomical figure |
| Muscles front and back | CC BY-SA 4.0, redrawn after an OpenStax textbook figure[^c-openstax] | Front and back views side by side; detailed, realistic anatomy |
| Anatomical terminology muscles (two files) | CC BY-SA 4.0, own work[^c-enko] | Labelled anatomy chart |
| Human muscular system, anterior and posterior (after a 19th-century atlas) | CC BY-SA 3.0[^c-bougle] | A redrawn historical anatomical plate; realistic |

None is CC0 or public domain. All are realistic anatomical illustrations, which the
dossier map must not be. They are fine as a reference for which region is which, never as
the figure.

# CC0 sets

- **Health Icons** (CC0) has a body category with organ and body-part icons (arm, leg,
  head, joints), but no front and back muscle map.[^healthicons][^cc0-sets]
- **Public Domain Vectors and FreeSVG** surface "CC0" muscle and anatomy drawings, but carry
  no author or origin per file, so they fail as a source of record.[^pdv]
- No other CC0 muscle map was found in npm, GitHub, Commons or the CC0 sets already
  surveyed. A CC0 map would have to be drawn by the project.

# Related

* [Open muscle-map components and their art](/cc0-media/muscle-map-components.md) - The packages, and body-muscles.
* [Muscle map for exercise dossiers](/cc0-media/muscle-map-recommendation.md) - The recommendation.

[^wger-muscles]: wger muscle images folder and SOURCES file
[^wger-muscle-api]: wger API, muscle list
[^wger-repo]: wger repository
[^c-front]: Commons, Muscular system.svg
[^c-back]: Commons, Muscular system-back.svg
[^c-cat]: Commons, SVG human muscular system category
[^c-openstax]: Commons, Muscles front and back.svg
[^c-enko]: Commons, Anatomical terminology muscles enko.svg
[^c-bougle]: Commons, Bougle human muscular system
[^healthicons]: Health Icons repository
[^cc0-sets]: CC0 icon and character sets
[^pdv]: Public Domain Vectors and FreeSVG
[^databases]: Open exercise databases with media
[^cc-by-sa-3]: CC BY-SA 3.0 licence deed
