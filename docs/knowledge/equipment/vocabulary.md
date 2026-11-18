---
type: Reference
title: Equipment vocabulary
description: The equipment names the app uses, taken from the free-exercise-db dataset and cross-walked to wger, with the few home and outdoor items neither dataset has.
tags: [equipment, vocabulary, open-data, licences]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:02:19Z }
sources:
  - { id: fedb, resource: https://github.com/yuhonas/free-exercise-db, title: "free-exercise-db: open exercise dataset (Unlicense)" }
  - { id: fedb-schema, resource: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/schema.json, title: "free-exercise-db schema.json (equipment and category enums)" }
  - { id: wger, resource: https://github.com/wger-project/wger, title: "wger Workout Manager (code AGPL-3.0-or-later; exercise data Creative Commons per entry)" }
  - { id: wger-equipment, resource: https://wger.de/api/v2/equipment/, title: "wger public API: equipment list" }
---

# Decision in brief

The app does not invent equipment names. Its base vocabulary is the `equipment` enum of
free-exercise-db, which is public domain under the Unlicense, so the values can be copied
into the repo with no conditions.[^fedb][^fedb-schema] Each value is cross-walked to the
equipment list of wger, a larger open project, so wger exercises can be matched
later.[^wger-equipment] Home and outdoor items that neither dataset lists are recorded as
qualified forms of the dataset's own `other` value, not as new top-level names.

# Base vocabulary (free-exercise-db)

The schema allows these equipment values (plus null for unknown):[^fedb-schema]

| free-exercise-db value | wger equivalent[^wger-equipment] | Use at home |
|---|---|---|
| `body only` | none (bodyweight exercise) | Yes, the minimum |
| `bands` | Resistance band | Yes |
| `medicine ball` | (none) | Yes |
| `exercise ball` | Swiss Ball | Yes |
| `foam roll` | (none) | Yes |
| `dumbbell` | Dumbbell | Light only, owner's choice |
| `kettlebells` | Kettlebell | Not in default rules |
| `barbell` | Barbell | Never prescribed (see training rules) |
| `e-z curl bar` | SZ-Bar | Never prescribed |
| `cable` | Cable machine | Not a home item |
| `machine` | (none) | Not a home item |
| `other` | (none) | Base for the extensions below |

wger items with no free-exercise-db value, used as-is with wger's names: `Gym mat`,
`Pull-up bar`, `Bench`, `Incline bench`.[^wger-equipment]

# Extensions under `other`

Goalkeeper home training needs a few items neither dataset names. They are written as
`other:<item>` so they still validate as the dataset's `other` value:

| Extension | Meaning |
|---|---|
| `other:ball` | A size-appropriate football |
| `other:wall` | A solid wall safe for ball rebounds |
| `other:cone` | Cones or any flat floor markers |
| `other:step` | A stable step or low box, or the bottom stair |
| `other:stairs` | A flight of stairs with a handrail |
| `other:goal` | A goal or two markers as posts |

Places (a field, a park, a yard, indoor floor space) and surfaces (grass, mat, hard
floor) are not equipment; the [equipment model](/decisions/equipment-model.md) records
them as separate fields.

# Licences

| Resource | Licence | How the app uses it |
|---|---|---|
| free-exercise-db | Unlicense (public domain dedication)[^fedb] | Copies the equipment enum verbatim; may later import exercise records |
| wger | Code AGPL-3.0-or-later; exercise data under Creative Commons licences per entry; documentation CC-BY-SA-4.0[^wger] | Uses equipment names only, as a cross-walk; any exercise imported from wger must keep its entry's licence and attribution |

[^fedb]: free-exercise-db repository and licence
[^fedb-schema]: free-exercise-db schema.json
[^wger]: wger repository and licences
[^wger-equipment]: wger equipment list via its public API
