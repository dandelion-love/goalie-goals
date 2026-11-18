---
type: Research Finding
title: Open exercise databases with media
description: Exercise databases that ship images or animations, with each one's media licence, attribution rule, fit for a public repo and hosted app, and fit for a teen-friendly style.
tags: [exercise-media, open-data, licensing, wger, everkinetic]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:35:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: wger-api-image, resource: "https://wger.de/api/v2/exerciseimage/?format=json", title: wger API, exercise image endpoint }
  - { id: wger-api-video, resource: "https://wger.de/api/v2/video/?format=json", title: wger API, exercise video endpoint }
  - { id: wger-api-license, resource: "https://wger.de/api/v2/license/?format=json", title: wger API, licence list }
  - { id: wger-image-model, resource: https://github.com/wger-project/wger/blob/master/wger/exercises/models/image.py, title: wger exercise image model }
  - { id: wger-docs, resource: https://wger.readthedocs.io/en/latest/, title: wger documentation, licence section }
  - { id: wger-muscles, resource: https://github.com/wger-project/wger/tree/master/wger/core/static/images/muscles, title: wger muscle diagrams and their SOURCES file }
  - { id: commons-muscular, resource: https://commons.wikimedia.org/wiki/File:Muscular_system.svg, title: Wikimedia Commons, muscular system diagram (CC BY-SA 3.0) }
  - { id: everkinetic, resource: https://github.com/everkinetic/data, title: Everkinetic open exercise data }
  - { id: everkinetic-licence, resource: https://github.com/everkinetic/data/blob/master/LICENSE.md, title: Everkinetic licence file (CC BY-SA 4.0) }
  - { id: feeel-contributing, resource: https://gitlab.com/enjoyingfoss/feeel/-/blob/master/CONTRIBUTING.md, title: Feeel contributing guide, photo processing }
  - { id: fosstriangulator, resource: https://github.com/FOSStriangulator/FOSStriangulator, title: FOSStriangulator }
  - { id: free-exercise-db-issue, resource: https://github.com/yuhonas/free-exercise-db/issues/2, title: free-exercise-db issue on image licensing }
  - { id: exercises-json-contrib, resource: https://github.com/wrkout/exercises.json/blob/master/CONTRIBUTING.md, title: exercises.json contributing guide, image note }
  - { id: exercises-json-issue, resource: https://github.com/wrkout/exercises.json/issues/305, title: exercises.json issue on image licence status }
  - { id: exercisedb-terms, resource: https://exercisedb.notion.site/ExerciseDB-API-Terms-of-Use-226983b728ca8090bf7be79564e4b356, title: ExerciseDB API terms of use }
  - { id: cc-by-sa-4, resource: https://creativecommons.org/licenses/by-sa/4.0/, title: CC BY-SA 4.0 licence deed }
  - { id: cc-by-4, resource: https://creativecommons.org/licenses/by/4.0/, title: CC BY 4.0 licence deed }
  - { id: cc0, resource: https://creativecommons.org/publicdomain/zero/1.0/, title: CC0 1.0 }
---

# Summary

Two open sources ship exercise media with a real licence: wger (per-file licence and author) and Everkinetic (CC BY-SA 4.0 line drawings). Both cover gym and general strength moves; neither covers goalkeeper technique. Every popular "free" GIF or photo set checked is either scraped or proprietary and is rejected.

# wger images, videos and muscle maps

- **What:** a few hundred exercise images and under a hundred videos at the time of checking.[^wger-api-image][^wger-api-video]
- **Licence:** per file, chosen from CC BY-SA 3 or 4, CC BY 4, CC0 and ODbL.[^wger-api-license] Each file carries the licence, the author, an author URL, a derivative-source URL and an author history,[^wger-api-image] and folders keep a sources file for images that came from Wikipedia.[^wger-docs]
- **Style and provenance flags:** each image declares a style (line, 3D, low-poly, photo, other) and whether it was AI-generated.[^wger-image-model] Some images have an empty author field.[^wger-api-image]
- **Muscle diagrams:** the front and back muscle maps are traced from Wikimedia Commons diagrams under CC BY-SA 3.0.[^wger-muscles][^commons-muscular]
- **Public repo and hosted app:** allowed for CC0, CC BY and CC BY-SA files with a named author, if credited and, for BY-SA, shared alike.[^cc-by-sa-4][^cc-by-4][^cc0]
- **Teen-friendly fit:** mixed. Line and low-poly images suit a clean, game-like look; photo-style images show real people and break visual consistency; videos are mostly real people too.

# Everkinetic

- **What:** start and end line drawings for a few hundred exercises, as SVG and PNG, with short descriptions.[^everkinetic]
- **Licence:** CC BY-SA 4.0 for the whole project.[^everkinetic-licence]
- **Attribution:** credit the project, link the licence, note changes; recoloured or redrawn versions stay CC BY-SA 4.0.[^cc-by-sa-4]
- **Teen-friendly fit:** good. Plain vector line art takes a team colour and a thicker stroke well. Coverage is gym-heavy; only part of it suits home training without equipment. One folder is named as if its provenance is unknown, so only files of stated origin are used.

# Feeel's low-poly practice

Feeel asks for contributor photos under CC0, CC BY or CC BY-SA, then turns them into low-poly triangle images with FOSStriangulator before use, and refuses sources that are not compatible with CC BY-SA.[^feeel-contributing][^fosstriangulator] The result looks like an illustration and hides who the person was. It is a method, not a media set: useful if the app ever needs a pose that no drawing covers, using an openly licensed photo of an adult model, never the keeper or the family.

# Rejected sets

| Set | Why rejected |
|---|---|
| free-exercise-db and exercises.json images | The parent project's guide says the images were taken from the internet and are not the maintainer's; a public issue traces some to a commercial site that forbids reuse; the fork's maintainer does not know their origin.[^exercises-json-contrib][^exercises-json-issue][^free-exercise-db-issue] |
| ExerciseDB GIFs, images and videos | Owned by the provider; a paid, revocable licence; storing media is forbidden.[^exercisedb-terms] |

[^wger-api-image]: wger API, exercise image endpoint
[^wger-api-video]: wger API, exercise video endpoint
[^wger-api-license]: wger API, licence list
[^wger-image-model]: wger exercise image model
[^wger-docs]: wger documentation, licence section
[^wger-muscles]: wger muscle diagrams and their SOURCES file
[^commons-muscular]: Wikimedia Commons, muscular system diagram (CC BY-SA 3.0)
[^everkinetic]: Everkinetic open exercise data
[^everkinetic-licence]: Everkinetic licence file (CC BY-SA 4.0)
[^feeel-contributing]: Feeel contributing guide, photo processing
[^fosstriangulator]: FOSStriangulator
[^free-exercise-db-issue]: free-exercise-db issue on image licensing
[^exercises-json-contrib]: exercises.json contributing guide, image note
[^exercises-json-issue]: exercises.json issue on image licence status
[^exercisedb-terms]: ExerciseDB API terms of use
[^cc-by-sa-4]: CC BY-SA 4.0 licence deed
[^cc-by-4]: CC BY 4.0 licence deed
[^cc0]: CC0 1.0
