---
type: Decision
title: Exercise media
description: The media and text sources the app uses to illustrate exercises, how attribution is shown, the stored format, how an exercise with no open media is illustrated, and what is never used.
tags: [decision, exercise-media, licensing, attribution, privacy]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T04:00:00Z }
sources:
  - { id: databases, resource: /exercise-media/open-exercise-databases.md, title: Open exercise databases with media }
  - { id: icon-sets, resource: /exercise-media/icon-and-illustration-sets.md, title: Open icon and illustration sets }
  - { id: video, resource: /exercise-media/video-and-animation.md, title: Video and animation sources }
  - { id: figures, resource: /exercise-media/drawn-and-generated-figures.md, title: Drawn and generated figures }
  - { id: storage, resource: /exercise-media/storage-format.md, title: Media storage format and metadata }
  - { id: reuse-decision, resource: /decisions/exercise-content-reuse.md, title: Reuse of exercise content }
  - { id: openmoji, resource: https://github.com/hfg-gmuend/openmoji, title: OpenMoji licence and attribution notes }
  - { id: tabler, resource: https://github.com/tabler/tabler-icons, title: Tabler Icons (MIT) }
  - { id: everkinetic-licence, resource: https://github.com/everkinetic/data/blob/master/LICENSE.md, title: Everkinetic licence (CC BY-SA 4.0) }
  - { id: wger-api-image, resource: "https://wger.de/api/v2/exerciseimage/?format=json", title: wger API, exercise image endpoint }
  - { id: open-peeps, resource: https://www.openpeeps.com/, title: Open Peeps (CC0) }
  - { id: cc-by-sa-4, resource: https://creativecommons.org/licenses/by-sa/4.0/, title: CC BY-SA 4.0 licence deed }
---

# Context

The keeper should see a clear picture or short animation and a short explanation for every exercise, taken from open and free sources where possible. The survey found that open exercise media covers general strength moves but not goalkeeper technique, that the popular free sets are scraped or proprietary, and that icons and emoji are well served by open sets.[^databases][^icon-sets][^video][^figures]

# Decision

## Sources used

| Use | Source | Licence | Condition |
|---|---|---|---|
| Exercise figures for general moves | Everkinetic line drawings, recoloured and restyled to match[^everkinetic-licence] | CC BY-SA 4.0 | Files of stated origin only; adapted files released under CC BY-SA 4.0.[^cc-by-sa-4] |
| Exercise figures for general moves, second choice | wger images with style line, 3D, low-poly or other; licence CC0, CC BY 4 or CC BY-SA 3 or 4; a named author; not flagged as AI-generated[^wger-api-image] | As recorded per file | Snapshot at build time with licence fields kept. |
| Goalkeeper and all other exercises | The app's own parametric vector figure and set-up diagrams[^figures] | Own work | The main source; also used to redraw general moves when a borrowed drawing clashes with the style. |
| Interface icons | Tabler Icons[^tabler] | MIT | Notice kept in the repo credits. |
| Playful glyphs (ball, goal net, gloves, stopwatch, fire, trophy) for rewards and streaks | OpenMoji[^openmoji] | CC BY-SA 4.0 | Credit line on the credits page, as the project asks.[^openmoji] |
| Mascot or parent character art | Open Peeps or a similar CC0 set as a starting point[^open-peeps] | CC0 | Credit given anyway for provenance. |
| Exercise text | As set in the [reuse decision](/decisions/exercise-content-reuse.md)[^reuse-decision] | CC BY-SA 4.0 for adapted text | |

## How attribution is shown

- Every asset and adapted text has an entry in the credits manifest (title, author, source URL, licence, licence URL, changes, AI flag, date checked).[^storage]
- The exercise card shows a small credit line (author and licence, linked) under any borrowed or adapted figure; the app's own drawings show none.
- A credits page in the app and a credits file in the repo list every entry, generated from the manifest.
- An asset whose licence needs attribution in a form or place the app cannot provide is not used.

## Stored format

- SVG for figures, diagrams, icons and badges; WebP for any unavoidable raster, at most 1024 px on the long side.[^storage]
- All metadata stripped: SVGs cleaned of metadata, editor data, scripts and embedded rasters; WebP written without EXIF, XMP, IPTC or ICC data. A CI content check enforces both.[^storage]
- No GIF, no video, no camera JPEG or HEIC in the repo.

## When no open media exists

In order:

1. Pose the app's own figure: two to four key poses, animated as a short loop, with still start and end poses when the device asks for reduced motion.[^figures][^video]
2. Add a top-down set-up diagram for anything with space, a server, cones or a ball path.[^figures]
3. If a pose truly cannot be drawn with the rig, hand-draw an SVG in the same style, or as a last resort low-poly trace an openly licensed photo of an adult model, credited.[^figures]
4. Until media exists, the card shows a neutral icon, the cues and the steps; it never shows a photo.

## Never used

| What | Why |
|---|---|
| Any photo or video of the keeper or the family, including as a source to trace or for form feedback | Privacy; a hard rule of this project. |
| Photos and videos of other real people (wger photo-style images, wger and YouTube videos, Commons photos, Pexels, Unsplash) | Personality rights, custom licences, tracking embeds, and a style that clashes with a game-like look.[^video][^icon-sets] |
| free-exercise-db and exercises.json images | Scraped; licence unclear and likely infringing.[^databases] |
| ExerciseDB media | Proprietary; storing forbidden.[^databases] |
| Darebee material | No alteration and no use in apps.[^video] |
| LottieFiles animations | Custom licence with an anti-compilation clause; uneven provenance.[^video] |
| Openverse results taken on Openverse's word | It does not verify licences; only the source page counts.[^icon-sets] |
| AI-generated images | Unclear copyright and provenance; only by a person's decision per asset, flagged in credits.[^figures] |
| Any asset with a missing, unclear or forbidding licence, or no named author where attribution is required | The licence gate. |

# Consequences

- The vector figure rig and the diagram vocabulary are the first media stories; most goalkeeper content depends on them.
- A snapshot script for Everkinetic and wger media applies the filters above and writes manifest entries.
- The credits manifest and the CI content check land before the first borrowed asset.
- The repository still needs a licence decision by a person (see the [reuse decision](/decisions/exercise-content-reuse.md)); media under CC BY-SA 4.0 lives in a content folder with its own licence notice.

[^databases]: Open exercise databases with media
[^icon-sets]: Open icon and illustration sets
[^video]: Video and animation sources
[^figures]: Drawn and generated figures
[^storage]: Media storage format and metadata
[^reuse-decision]: Reuse of exercise content
[^openmoji]: OpenMoji licence and attribution notes
[^tabler]: Tabler Icons (MIT)
[^everkinetic-licence]: Everkinetic licence (CC BY-SA 4.0)
[^wger-api-image]: wger API, exercise image endpoint
[^open-peeps]: Open Peeps (CC0)
[^cc-by-sa-4]: CC BY-SA 4.0 licence deed
