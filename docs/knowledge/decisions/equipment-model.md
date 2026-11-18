---
type: Decision
title: Equipment model
description: How the app records each household's equipment, how every exercise declares what it needs, how substitutes are chosen, the generic default profile, and the rule that an exercise with no safe substitute is left out.
tags: [decision, equipment, model, safety]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:02:19Z }
sources:
  - { id: fedb, resource: https://github.com/yuhonas/free-exercise-db, title: "free-exercise-db: open exercise dataset (Unlicense)" }
  - { id: fedb-schema, resource: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/schema.json, title: "free-exercise-db schema.json (equipment and category enums)" }
  - { id: wger, resource: https://github.com/wger-project/wger, title: "wger Workout Manager (code AGPL-3.0-or-later; exercise data Creative Commons per entry)" }
  - { id: wger-equipment, resource: https://wger.de/api/v2/equipment/, title: "wger public API: equipment list" }
  - { id: nsca-2009, resource: https://pubmed.ncbi.nlm.nih.gov/19620931/, title: "Faigenbaum et al. Youth resistance training: updated position statement paper from the NSCA (J Strength Cond Res, 2009)" }
  - { id: lopes-2019, resource: https://pubmed.ncbi.nlm.nih.gov/30815258/, title: "Lopes et al. Effects of training with elastic resistance versus conventional resistance on muscular strength (SAGE Open Med, 2019)" }
---

# Decision

Equipment availability is a behaviour of the app. Each household has one equipment
profile; each exercise declares what it needs; the session planner uses an exercise only
if the profile meets its needs, otherwise tries the exercise's declared substitutes, and
otherwise leaves it out. It never prescribes an exercise that needs something the profile
lacks.

# Vocabulary

Equipment names come from the free-exercise-db `equipment` enum (public domain, Unlicense),
cross-walked to wger's equipment list, with `other:<item>` extensions only for items neither
dataset has.[^fedb][^fedb-schema][^wger-equipment] The full list and licences are in
[equipment vocabulary](/equipment/vocabulary.md). Places and surfaces are separate fields,
not equipment.

# Household equipment profile

```yaml
# Schema of a profile (example values are the generic default, not a real household)
profile:
  equipment:            # vocabulary values the household has
    - body only
    - other:ball
    - other:wall
    - other:step
  details:              # optional attributes the planner may need
    bands: { levels: [] }          # e.g. [light, medium]
    medicine ball: { mass_kg: null }
  places:               # where sessions can happen
    indoor_floor: { clear_m: [2, 2] }   # about 6.5 x 6.5 ft of clear floor
    grass: unknown                      # owner confirms: yes / no
  surfaces: [hard-floor]                # grass and mat appear here when available
```

- The owner (the parent) edits the profile. The app asks before the first session and
  whenever an exercise is left out for lack of an item.
- A household's real profile lives only on the household's own device or private
  storage. It is never committed to the public repo, never sent to analytics, and never
  shown in shared screenshots. The repo ships only the generic defaults below.

# How an exercise declares its needs

```yaml
id: lateral-dive-from-knees
goal: [lateral-power, diving-technique]
risk: medium                    # low | medium | high; high is never prescribed at home
needs:
  all: [body only]              # every item required
  any: [[Gym mat], [place:grass]]   # at least one group must be met
space_m: [3, 2]                 # clear floor, about 10 x 6.5 ft
surface: soft                   # soft | any
substitutes:                    # ordered by preference
  - lateral-shuffle-to-set
  - side-plank
```

- `needs.all` and `needs.any` use only vocabulary values, `place:` values and surfaces.
- `goal` tags say which quality the exercise trains, so a substitute can be matched.
- `substitutes` is an ordered list of other exercise ids, each with its own needs.

# How the planner swaps

For each exercise it wants in a session, in order:

1. If the profile meets `needs`, `space_m` and `surface`, and the owner has approved the
   exercise (see [training rules](/decisions/training-rules.md)), use it.
2. Otherwise walk the `substitutes` list and take the first one that: shares at least one
   `goal` tag; has the same or lower `risk`; has its own needs met by the profile; and is
   owner-approved.
3. Otherwise **leave the exercise out**. The session is shorter, and the app shows the
   owner what was left out and which item or place would allow it.

Substitution never escalates load or risk, never uses an improvised object, and never
replaces a missing soft surface with a hard one. The swap table is in
[substitutions](/equipment/substitutions.md). Bands and bodyweight progressions can
replace heavier conventional equipment for strength with similar gains,[^lopes-2019] and
starting simple and light is the NSCA's guidance,[^nsca-2009] so most strength work
always has a substitute; diving, sprinting and some handling drills may not.

# Rejection case

If an exercise needs equipment the profile lacks and no declared substitute passes step
2, the app leaves it out of the session. It never prescribes it, never suggests a
makeshift alternative, and never asks the keeper to "use what you have". Example: with
the default profile (no mat, grass unknown), every dive drill is left out until the owner
confirms grass or adds a mat.

# Default profiles

Two generic profiles ship with the app. Neither describes any real household.

| Profile | Equipment | Places and surfaces |
|---|---|---|
| Bodyweight only (minimum) | `body only` | Indoor floor about 2 x 2 m (6.5 x 6.5 ft), hard floor |
| Bodyweight and home (default) | `body only`, `other:ball`, `other:wall`, `other:step` | Indoor floor about 2 x 2 m (6.5 x 6.5 ft), hard floor; grass unknown until the owner confirms |

Optional add-ons the owner can tick: `bands`, `medicine ball`, `Gym mat`, `other:cone`,
`Pull-up bar`, `exercise ball`, `foam roll`, `other:goal`, `other:stairs`, and places
(yard, park or field). Barbells, kettlebells, cables and machines are recognised in the
vocabulary but not used by the home rules.

# Consequences

- Every exercise in the library carries `needs`, `goal`, `risk`, `space_m`, `surface` and
  `substitutes`; an exercise without them cannot be scheduled.
- Only free-exercise-db's equipment vocabulary (words) is used, not its exercises, text or
  images (see the exercise-media Decision). Exercises adapted from wger keep that entry's
  Creative Commons licence and attribution.[^wger]
- Supporting findings: [bodyweight minimum](/equipment/bodyweight-minimum.md),
  [home equipment](/equipment/home-equipment.md),
  [outdoor options](/equipment/outdoor-options.md).

[^fedb]: free-exercise-db repository and licence
[^fedb-schema]: free-exercise-db schema.json
[^wger]: wger repository and licences
[^wger-equipment]: wger equipment list via its public API
[^nsca-2009]: NSCA youth resistance training position statement, 2009
[^lopes-2019]: Lopes et al., meta-analysis of elastic versus conventional resistance, 2019
