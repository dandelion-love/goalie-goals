---
type: Decision
title: Exercise media
description: The media and text sources the app uses to illustrate exercises, how attribution is shown, the stored format, how an exercise with no open media is illustrated, and what is never used.
tags: [decision, exercise-media, licensing, attribution, privacy]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:40:00Z }
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
  - { id: cc0-openclipart, resource: /cc0-media/openclipart-figures.md, title: Openclipart }
  - { id: cc0-commons, resource: /cc0-media/wikimedia-commons.md, title: "Wikimedia Commons, CC0 and public-domain files" }
  - { id: cc0-pdv, resource: /cc0-media/public-domain-vectors.md, title: Public Domain Vectors and FreeSVG }
  - { id: cc0-openverse, resource: /cc0-media/openverse-and-rawpixel.md, title: Openverse and the sites it surfaces }
  - { id: cc0-sets, resource: /cc0-media/cc0-icon-and-character-sets.md, title: CC0 icon and character sets }
  - { id: cc0-pose-data, resource: /cc0-media/pose-data.md, title: Open 3D animation and motion data as pose references }
  - { id: cc0-coverage, resource: /cc0-media/coverage.md, title: CC0 figure coverage per exercise }
  - { id: gov-licences, resource: /cc0-media/government-licences.md, title: Government works and open government licences side by side }
  - { id: gov-publications, resource: /cc0-media/government-exercise-publications.md, title: Government exercise publications checked for figures }
  - { id: health-bodies, resource: /cc0-media/health-organisation-sources.md, title: Health organisations and physio exercise sheets }
  - { id: gov-coverage, resource: /cc0-media/government-coverage.md, title: Government and health-body figures for each exercise }
---

# Context

The keeper should see a clear picture or short animation and a short explanation for every exercise, taken from open and free sources where possible. The survey found that open exercise media covers general strength moves but not goalkeeper technique, that the popular free sets are scraped or proprietary, and that icons and emoji are well served by open sets.[^databases][^icon-sets][^video][^figures] A later survey of CC0 and public-domain sources found a usable figure for 10 of 27 exercises and goalkeeper moves, most of them partial, and found that several sites label files CC0 without anything to check the label against.[^cc0-coverage][^cc0-pdv]

# Decision

## Sources used

| Use | Source | Licence | Condition |
|---|---|---|---|
| Exercise figures for general moves | Everkinetic line drawings, recoloured and restyled to match[^everkinetic-licence] | CC BY-SA 4.0 | Files of stated origin only; adapted files released under CC BY-SA 4.0.[^cc-by-sa-4] |
| Exercise figures for general moves, second choice | wger images with style line, 3D, low-poly or other; licence CC0, CC BY 4 or CC BY-SA 3 or 4; a named author; not flagged as AI-generated[^wger-api-image] | As recorded per file | Snapshot at build time with licence fields kept. |
| Pose references for general moves, redrawn in the app's style | US federal works with no other party credited for the figure: today the line drawings in chapter 7 and Table 8-2 of the 1997 Navy SEAL Physical Fitness Guide, and FM 21-20 (1992) figures a person has confirmed are drawings[^gov-publications][^gov-coverage] | Public domain by statute (`PD-USGov`)[^gov-licences] | Drawing only: no dose, programme, uniform or insignia. Credit line anyway, naming the publication and agency, because the statute is US law only. |
| Figures under an open government licence | A figure whose own page puts it under the UK OGL v3.0, or CC BY 4.0 in Australia or New Zealand, and does not exclude it as an image, logo, crest, insignia or third-party material[^gov-licences] | `OGL-UK-3.0` or `CC-BY-4.0` | Credit line required, with the publisher's attribution statement. None has passed yet.[^gov-coverage] |
| Goalkeeper and all other exercises | The app's own parametric vector figure and set-up diagrams[^figures] | Own work | The main source; also used to redraw general moves when a borrowed drawing clashes with the style. |
| Interface icons | Tabler Icons[^tabler] | MIT | Notice kept in the repo credits. |
| Playful glyphs (ball, goal net, gloves, stopwatch, fire, trophy) for rewards and streaks | OpenMoji[^openmoji] | CC BY-SA 4.0 | Credit line on the credits page, as the project asks.[^openmoji] |
| Mascot or parent character art | Open Peeps or a similar CC0 set as a starting point[^open-peeps] | CC0 | Credit given anyway for provenance. |
| Pose references for the app's figure, and the odd figure adapted outright | Wikimedia Commons files whose own page states CC0 or a public-domain template (for example the Pearson Scott Foresman line art and Noun Project icons mirrored as CC0);[^cc0-commons] a CC0 3D rig posed by hand[^cc0-pose-data] | CC0 or public domain, read on the file's own page | A drawing, never a photo; not traced from an image that could identify a real person; no `pd_issue` tag; no AI flag, and an upload after 2022 looked at by a person; a manifest entry with the date checked even though no credit is required. The best file per exercise is in the coverage table.[^cc0-coverage] |
| Interface icons and empty states, second choice | Health Icons, Pinhead, Open Doodles[^cc0-sets] | CC0 | Same manifest entry. |
| Exercise text | As set in the [reuse decision](/decisions/exercise-content-reuse.md)[^reuse-decision] | CC BY-SA 4.0 for adapted text | |

## How attribution is shown

- Every asset and adapted text has an entry in the credits manifest (title, author, source URL, licence, licence URL, changes, AI flag, date checked).[^storage]
- The exercise card shows a small credit line (author and licence, linked) under any borrowed or adapted figure; the app's own drawings show none.
- A credits page in the app and a credits file in the repo list every entry, generated from the manifest.
- An asset whose licence needs attribution in a form or place the app cannot provide is not used.
- Government figures: a public-domain US federal figure gets a credit line for provenance (publication, agency, figure or page); an OGL v3.0 or CC BY 4.0 figure gets the credit line its licence requires.[^gov-licences]

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
| Openclipart files as exercise figures or pose references | The owner rejected them for quality on 2026-11-18: the drawings are inconsistent and too crude for the app. Government and open-licensed health-organisation illustrations are searched instead (#69).[^cc0-openclipart] |
| Public Domain Vectors and FreeSVG as the source of a file | A CC0 label with no author, origin or AI note per file; a re-hosted Openclipart file is taken from its Openclipart page instead.[^cc0-pdv] |
| rawpixel files, and Noun Project icons taken from the Noun Project site | rawpixel's pages could not be read or verified; Noun Project licences vary per icon and are often paid royalty-free. A Noun Project icon counts only through a Commons page that states CC0.[^cc0-openverse][^cc0-sets] |
| Files whose rights statements conflict, such as the CDC "Growing Stronger" animations | Tagged public domain, but a reported copyright notice allows only unaltered copies; held until a person reads the booklet's copyright page.[^cc0-commons] |
| Motion-capture data that is not CC0, such as the CMU database | Not CC0, and its terms could not be read at the source.[^cc0-pose-data] |
| Any asset with a missing, unclear or forbidding licence, or no named author where attribution is required | The licence gate. |
| Non-commercial or no-derivatives material, including WHO publications (CC BY-NC-SA 3.0 IGO) | Cannot flow into CC BY-SA 4.0 content.[^health-bodies] |
| Material under a licence with no stated path into CC BY-SA 4.0, including the Open Government Licence - Canada 2.0, and Canada.ca's non-commercial terms | The publisher states no compatibility.[^gov-licences] |
| NHS website exercise images | On the NHS list of images not licensed for re-use.[^gov-publications] |
| Crests, coats of arms, logos, service marks and military insignia, and any figure a publication credits to someone else | Excluded by the open licences and outside the US statute.[^gov-licences] |
| Physiotherapy sheets made with commercial exercise software, and anything offered only as "free to download" or "for personal use" | The drawings belong to the vendor; free access is not a licence.[^health-bodies] |
| Doses, programmes and test standards from adult or military guides | Not youth guidance; the training-rules Decision sets every dose. |

# Consequences

- The vector figure rig and the diagram vocabulary are the first media stories; most goalkeeper content depends on them.
- A snapshot script for Everkinetic and wger media applies the filters above and writes manifest entries.
- The credits manifest and the CI content check land before the first borrowed asset.
- A dossier's links out to official clips are not media in the app and are never embedded; the [clip link policy](/dossiers/clip-link-policy.md) governs them.
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
[^cc0-openclipart]: Openclipart
[^cc0-commons]: Wikimedia Commons, CC0 and public-domain files
[^cc0-pdv]: Public Domain Vectors and FreeSVG
[^cc0-openverse]: Openverse and the sites it surfaces
[^cc0-sets]: CC0 icon and character sets
[^cc0-pose-data]: Open 3D animation and motion data as pose references
[^cc0-coverage]: CC0 figure coverage per exercise
[^gov-licences]: Government works and open government licences side by side
[^gov-publications]: Government exercise publications checked for figures
[^health-bodies]: Health organisations and physio exercise sheets
[^gov-coverage]: Government and health-body figures for each exercise
