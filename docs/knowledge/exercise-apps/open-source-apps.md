---
type: Research Finding
title: Open-source training apps and exercise datasets
description: How wger, Feeel, Everkinetic and the public-domain-labelled exercise datasets describe an exercise, and what their code, data and media licences allow.
tags: [exercise-apps, open-source, licensing, wger, datasets]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-11-17T00:00:00Z
sources:
  - { id: wger-repo, resource: https://github.com/wger-project/wger, title: wger server repository (AGPL-3.0) }
  - { id: wger-flutter, resource: https://github.com/wger-project/flutter, title: wger Flutter app repository (AGPL-3.0) }
  - { id: wger-docs, resource: https://wger.readthedocs.io/en/latest/, title: wger documentation, licence section }
  - { id: wger-api-exercise, resource: "https://wger.de/api/v2/exerciseinfo/?format=json", title: wger API, exerciseinfo endpoint }
  - { id: wger-api-license, resource: "https://wger.de/api/v2/license/?format=json", title: wger API, licence list }
  - { id: wger-image-model, resource: https://github.com/wger-project/wger/blob/master/wger/exercises/models/image.py, title: wger exercise image model (style and AI flag) }
  - { id: feeel-repo, resource: https://gitlab.com/enjoyingfoss/feeel, title: Feeel repository (AGPL-3.0) }
  - { id: feeel-contributing, resource: https://gitlab.com/enjoyingfoss/feeel/-/blob/master/CONTRIBUTING.md, title: Feeel contributing guide }
  - { id: everkinetic, resource: https://github.com/everkinetic/data, title: Everkinetic open exercise data (CC BY-SA 4.0) }
  - { id: free-exercise-db, resource: https://github.com/yuhonas/free-exercise-db, title: free-exercise-db repository }
  - { id: free-exercise-db-issue, resource: https://github.com/yuhonas/free-exercise-db/issues/2, title: free-exercise-db issue on image licensing }
  - { id: exercises-json, resource: https://github.com/wrkout/exercises.json, title: exercises.json repository }
  - { id: exercises-json-contrib, resource: https://github.com/wrkout/exercises.json/blob/master/CONTRIBUTING.md, title: exercises.json contributing guide, image note }
  - { id: exercises-json-issue, resource: https://github.com/wrkout/exercises.json/issues/305, title: exercises.json issue on image licence status }
  - { id: exercemus, resource: https://github.com/exercemus/exercises, title: Exercemus exercise list repository }
  - { id: cc-by-sa-4, resource: https://creativecommons.org/licenses/by-sa/4.0/, title: CC BY-SA 4.0 licence deed }
  - { id: agpl-3, resource: https://www.gnu.org/licenses/agpl-3.0.en.html, title: GNU AGPL 3.0 }
---

# Summary

Open-source training apps are few, and only one of them, wger, runs a real community exercise database with a licence on every record. The datasets labelled "public domain" are not safe: their images were scraped and their maintainers say so. Exercise text and line art under CC BY-SA can be adapted if the app shows attribution and shares its changes alike. None of these projects covers goalkeeper-specific drills.

# wger

**What it is.** A self-hosted fitness and workout tracker with a web app and a Flutter mobile app. The exercise wiki behind it is public and is used by other apps.[^wger-repo][^wger-flutter]

**How it explains an exercise.** Each exercise record has a category, primary and secondary muscles, equipment, images, videos and a variation group linking easier and harder relatives. Each translation has a name, aliases, a free-text description and a list of short notes, which work like cues or tips.[^wger-api-exercise] The web and mobile apps show the description, the notes, a front and back muscle diagram with worked muscles highlighted, the images, and the variations. There are no separate fields for common mistakes, regressions, tempo or self-checks; any of these sits inside the free-text description if at all.

**Licences, kept apart.**

| Part | Licence | Notes |
|---|---|---|
| Server and app code | AGPL-3.0 or later[^wger-repo][^wger-docs] | Copying the code would put this app under AGPL, including its network-use clause.[^agpl-3] |
| Exercise data (text) | Per record; the API's licence list holds CC BY-SA 3, CC BY-SA 4, CC BY 4, CC0 and ODbL[^wger-api-license] | Most current records show CC BY-SA 4 with a named licence author.[^wger-api-exercise] Docs say the initial data was CC BY-SA 3.0.[^wger-docs] |
| Images and videos | Per file, with licence, author, author URL and derivative-source URL fields[^wger-api-exercise] | Each image also carries a style (line, 3D, low-poly, photo, other) and an AI-generated flag.[^wger-image-model] Some images have an empty author field. |
| Documentation | CC BY-SA 4.0 or later[^wger-docs] | Not needed by this app. |

**Fit for a public repo and hosted app.** Text and media records with CC0, CC BY or CC BY-SA and a named author fit, if the app shows the author, the licence and a link, notes changes, and shares adapted text under CC BY-SA.[^cc-by-sa-4] Records with no author, and ODbL records (a database licence with its own share-alike rules), need a person's ruling before use; the [decision](/decisions/exercise-content-reuse.md) leaves them out. Photo-style images show real people and are left out for the reasons in the [media decision](/decisions/exercise-media.md). The code is not needed: the app takes data snapshots, not wger's software.

# Feeel

**What it is.** A small cross-platform home-workout app, AGPL-3.0, focused on privacy.[^feeel-repo] It now takes its exercises from wger rather than keeping its own list.[^feeel-contributing]

**How it explains an exercise.** A guided, timed sequence of bodyweight moves with a picture per exercise and a countdown between moves; the explanation is mostly the picture plus the name.

**A media practice worth noting.** Feeel turns contributed photos into low-poly triangulated images, so the result reads as an illustration rather than a photo of a person, and it only accepts sources whose licence is compatible with CC BY-SA.[^feeel-contributing] That is the same discipline this app needs: style that hides identity, and licence checked before anything is accepted.

**Fit.** The code is AGPL and not needed. The practice (licence gate, low-poly style) is adopted as an idea.

# Everkinetic

**What it is.** An open data project of exercises with line-art drawings in SVG and PNG, plus exercise descriptions, under CC BY-SA 4.0.[^everkinetic] Its drawings also appear in wger.

**How it explains an exercise.** Two-frame line drawings (start and end position) and a short step list. Most moves are gym or equipment moves; some are bodyweight.

**Fit.** CC BY-SA 4.0 fits a public repo and a hosted app with attribution and share-alike on adapted drawings.[^cc-by-sa-4] One folder name hints at images of unknown provenance; only files whose origin the repo states are used.

# Datasets labelled public domain

**free-exercise-db** restructures the older exercises.json into one JSON file per exercise (name, level, equipment, muscles, a step list and two images), with a browsable site, under the Unlicense.[^free-exercise-db] **exercises.json**, its parent, is also Unlicense.[^exercises-json]

The problem is provenance. The parent's own contributing guide says the images were taken from the internet, that the maintainer does not hold their copyright, and advises against commercial use.[^exercises-json-contrib] A public issue traces images to a large commercial fitness site whose terms forbid reuse,[^exercises-json-issue] and the derived project's maintainer says he does not know where the images come from.[^free-exercise-db-issue] The step-list text is very likely from the same source. A public-domain label from someone who did not own the work grants nothing.

**Exercemus** merges exercises.json, wger and another list into one file under MIT.[^exercemus] Relabelling CC BY-SA records and scraped records as MIT does not change their real terms.

**Fit.** Not used: licence unclear for text and known-bad for images. Only the general idea of a flat, per-exercise JSON file with a schema is kept, which is not protected expression.

# What none of them have

No open project found covers goalkeeper work (set position, diving, footwork patterns, reaction drills, handling, punching) with cues, mistakes or progressions. Those exercises are built here; see the [decision](/decisions/exercise-content-reuse.md).

[^wger-repo]: wger server repository (AGPL-3.0)
[^wger-flutter]: wger Flutter app repository (AGPL-3.0)
[^wger-docs]: wger documentation, licence section
[^wger-api-exercise]: wger API, exerciseinfo endpoint
[^wger-api-license]: wger API, licence list
[^wger-image-model]: wger exercise image model (style and AI flag)
[^feeel-repo]: Feeel repository (AGPL-3.0)
[^feeel-contributing]: Feeel contributing guide
[^everkinetic]: Everkinetic open exercise data (CC BY-SA 4.0)
[^free-exercise-db]: free-exercise-db repository
[^free-exercise-db-issue]: free-exercise-db issue on image licensing
[^exercises-json]: exercises.json repository
[^exercises-json-contrib]: exercises.json contributing guide, image note
[^exercises-json-issue]: exercises.json issue on image licence status
[^exercemus]: Exercemus exercise list repository
[^cc-by-sa-4]: CC BY-SA 4.0 licence deed
[^agpl-3]: GNU AGPL 3.0
