---
type: Decision
title: Reuse of exercise content
description: What the app reuses as-is, adapts, and builds to explain exercises, with each licence named and checked for a public repo and hosted app, and what it rejects.
tags: [decision, exercise-apps, licensing, reuse, exercise-card]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:30:00Z }
sources:
  - { id: survey-open, resource: /exercise-apps/open-source-apps.md, title: Open-source training apps and exercise datasets }
  - { id: survey-commercial, resource: /exercise-apps/commercial-apps.md, title: Well-known commercial training apps }
  - { id: elements, resource: /exercise-apps/explanation-elements.md, title: Elements of a clear exercise explanation }
  - { id: licences, resource: /exercise-apps/licence-check.md, title: Licence check of exercise apps and datasets }
  - { id: wger-api-exercise, resource: "https://wger.de/api/v2/exerciseinfo/?format=json", title: wger API, exerciseinfo endpoint }
  - { id: everkinetic, resource: https://github.com/everkinetic/data, title: Everkinetic open exercise data }
  - { id: tabler, resource: https://github.com/tabler/tabler-icons, title: Tabler Icons (MIT) }
  - { id: cc-by-sa-4, resource: https://creativecommons.org/licenses/by-sa/4.0/, title: CC BY-SA 4.0 licence deed }
  - { id: cc-compat, resource: https://creativecommons.org/share-your-work/licensing-considerations/compatible-licenses/, title: Creative Commons, compatible licences }
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media decision }
---

# Context

The keeper and the parent must understand a new exercise, why it matters, and how to do it safely with no coach present. The owner's rule is to reuse open and free work where it makes sense. The survey found one open exercise database with per-record licences (wger), one open line-art set (Everkinetic), several datasets whose "public domain" label cannot be trusted, and commercial apps whose patterns are useful but whose content is closed.[^survey-open][^survey-commercial][^licences]

# Decision

## Reused as-is

| What | Licence | Why it fits |
|---|---|---|
| Explanation patterns: short cues at the moment of the move, easier and harder siblings with a "move on when" rule, before-start summary of time, level and kit, big accurate countdown with spoken last seconds, streaks with allowed misses, set-up diagram, "when you use this in a match"[^elements] | Ideas, not protected expression | Applied in this app's own words and drawings. |
| Browser platform features for timers and cues: screen wake lock, speech synthesis, vibration, reduced-motion[^elements] | Web platform, no licence needed | No library to vendor. |
| Tabler Icons for interface icons (timer, play, swap, check)[^tabler] | MIT | Fits a public repo and hosted app; keep the notice in the repo's credits. |

## Adapted

| What | Licence | Conditions this app meets |
|---|---|---|
| wger exercise text for general moves the keeper also does (squat, lunge, plank, jumps, push-ups and similar): name, aliases, muscles, equipment, variations, and the description and notes as raw material for steps and cues[^wger-api-exercise] | Per record. Only CC0, CC BY 4 and CC BY-SA 3 or 4 records with a named author. | Taken as a build-time snapshot, never called live from the hosted app. Each adapted card keeps source URL, author, licence and a "changes made" line in its `credits` field. Adapted text is released under CC BY-SA 4.0,[^cc-by-sa-4] which also accepts CC BY-SA 3.0 inputs as a later version.[^cc-compat] |
| Everkinetic descriptions where a matching move exists[^everkinetic] | CC BY-SA 4.0 | Same credit fields; same CC BY-SA 4.0 release. |
| The schema idea of one structured file per exercise with a validator, and the naming and alias convention[^elements] | Ideas | This app writes its own schema, the exercise card in [the pattern](/exercise-apps/explanation-elements.md). |

Media choices for these exercises are set in the [media decision](/decisions/exercise-media.md).[^media-decision]

## Built, because nothing suitable exists

- **Goalkeeper-specific exercises:** set position, shuffles and crossover steps, diving progressions from kneeling to standing, reaction and recovery drills, handling, high-ball catching, punching, and keeper jump work. No open source covers them with cues, mistakes or progressions.[^survey-open]
- **The fields wger lacks:** `why`, `cues`, `mistakes` with fixes, `parent_check`, `stop_if`, `easier` and `harder` with `move_on_when`, and plain-word tempo.[^elements]
- **The parent-check flow:** a two-or-three item checklist the parent ticks after a set, replacing camera-based form checks.
- Written clean-room: from general coaching knowledge and this app's own drafting, never from a commercial app's text or video.

## Rejected

| Resource | Reason |
|---|---|
| free-exercise-db and exercises.json, text and images | Images scraped and not owned by the maintainers; text provenance the same. Licence unclear at best.[^licences] |
| Exercemus | MIT label over CC BY-SA and scraped inputs; the label does not reflect real terms.[^licences] |
| ExerciseDB data and media | Owned by the provider, paid revocable licence, storing media forbidden.[^licences] |
| Darebee | No alteration and no use inside apps.[^licences] |
| Commercial apps' text, video, drawings and audio | All rights reserved.[^survey-commercial] |
| wger and Feeel code | AGPL; not needed, and copying it would change this app's licence.[^licences] |
| wger records with ODbL, no named author, or no licence | ODbL needs a separate ruling; no author means attribution cannot be shown. |
| Video upload of the keeper for form feedback | Privacy: no recording of the keeper or the family, ever.[^survey-commercial] |

# Consequences

- **Prerequisite for a person:** the repository has no licence file. Before any adapted content lands, a person picks a code licence and confirms that exercise content goes in its own folder under CC BY-SA 4.0. Mixing CC BY-SA text into code files is avoided so the code licence stays free to choose.
- A credits page in the app and a credits file in the repo are generated from the cards' `credits` fields; a card without complete credits fails the content check.
- A snapshot script (later story) pulls only allowed wger records, keeps their licence fields, and records the snapshot date.
- Goalkeeper drills are the bulk of the writing work; the general strength and plyometric moves come mostly from adapted wger and Everkinetic records.

[^survey-open]: Open-source training apps and exercise datasets
[^survey-commercial]: Well-known commercial training apps
[^elements]: Elements of a clear exercise explanation
[^licences]: Licence check of exercise apps and datasets
[^wger-api-exercise]: wger API, exerciseinfo endpoint
[^everkinetic]: Everkinetic open exercise data
[^tabler]: Tabler Icons (MIT)
[^cc-by-sa-4]: CC BY-SA 4.0 licence deed
[^cc-compat]: Creative Commons, compatible licences
[^media-decision]: Exercise media decision
