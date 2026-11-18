---
type: Research Finding
title: Cheap home equipment that adds most
description: Which low-cost items (bands, a medicine ball, a step, cones, a ball and a wall, a mat) add the most to a keeper's home training, and the safety limits for each.
tags: [equipment, home, bands, medicine-ball, safety]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:02:19Z }
sources:
  - { id: nsca-2009, resource: https://pubmed.ncbi.nlm.nih.gov/19620931/, title: "Faigenbaum et al. Youth resistance training: updated position statement paper from the NSCA (J Strength Cond Res, 2009)" }
  - { id: lopes-2019, resource: https://pubmed.ncbi.nlm.nih.gov/30815258/, title: "Lopes et al. Effects of training with elastic resistance versus conventional resistance on muscular strength: systematic review and meta-analysis (SAGE Open Med, 2019)" }
  - { id: johnson-2011, resource: https://doi.org/10.1519/JSC.0b013e318204caa0, title: "Johnson, Salzberg, Stevenson. A systematic review: plyometric training programs for young children (J Strength Cond Res, 2011)" }
  - { id: asadi-2017, resource: https://pubmed.ncbi.nlm.nih.gov/28557853/, title: "Asadi et al. Influence of maturation stage on agility performance gains after plyometric training (J Strength Cond Res, 2017)" }
  - { id: moran-2017-sprint, resource: https://doi.org/10.1055/s-0042-111439, title: "Moran et al. Variation in responses to sprint training in male youth athletes: a meta-analysis (Int J Sports Med, 2017)" }
  - { id: white-2018, resource: https://doi.org/10.1007/s40279-018-0977-2, title: "White et al. Match-play and performance test responses of soccer goalkeepers: a review (Sports Med, 2018)" }
  - { id: fedb-schema, resource: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/schema.json, title: "free-exercise-db schema.json (equipment and category enums)" }
  - { id: wger-equipment, resource: https://wger.de/api/v2/equipment/, title: "wger public API: equipment list" }
---

# Summary

A few inexpensive items fill the gaps bodyweight leaves: bands give measured progression,
a light medicine ball gives upper-body power for punching and throwing, a mat or grass
makes diving safe, and a ball with a wall turns any small space into handling practice.
Home equipment carries its own risk, so each item comes with a rule.

# Home equipment carries risk

- The NSCA review reports that younger children are more likely than older ones to be
  injured on home exercise equipment, through unsafe behaviour, faulty equipment or no
  supervision.[^nsca-2009]
- The NSCA also puts a safe, hazard-free training area among its general
  guidelines.[^nsca-2009]
- So the app checks the space (clear floor, nothing to hit) before each session and
  treats every item below as supervised use only.

# Items, ranked by what they add for a keeper

| Item (vocabulary value) | What it adds | Evidence | Safety rule |
|---|---|---|---|
| Mat (`Gym mat`[^wger-equipment]) or grass | Makes dives and repeated landings possible indoors | A safe training surface and area is an NSCA guideline[^nsca-2009] | Thick, non-slip, clear of furniture on every side of a dive |
| Ball and wall (`other:ball`, `other:wall`) | Catching, handling, reaction and footwork in a small space | Goalkeeper training is mostly technical and explosive work in confined spaces[^white-2018] | Solid wall, no windows or fragile objects nearby |
| Resistance bands (`bands`[^fedb-schema]) | Progressive load for legs, hips, shoulders and trunk | Elastic resistance produced strength gains similar to weights and machines in a meta-analysis (mostly adult studies)[^lopes-2019] | Check for nicks before use; anchor securely; never stretch toward the face |
| Light medicine ball (`medicine ball`[^fedb-schema]) | Upper-body and whole-body power: chest passes, overhead throws, rotational throws to a wall | Medicine balls are an accepted youth training mode[^nsca-2009] | Light enough for fast, clean throws; throw to a wall or partner, never upward overhead indoors |
| Cones or markers (`other:cone`) | Measured distances for sprints and change-of-direction drills | Sprint and change-of-direction work improves speed and agility in youth[^moran-2017-sprint][^asadi-2017] | Flat markers on hard floors to avoid ankle rolls |
| Step or low box (`other:step`) | Step-ups, and a target for jump-ups | Jump training is effective with built-in safety rules[^johnson-2011] | Stable and non-slip; jump up, step down; no depth jumps off it |
| Pull-up bar (`Pull-up bar`[^wger-equipment]) | Pulling strength (hangs, assisted pull-ups) | Bodyweight resistance is an accepted mode[^nsca-2009] | Only a fixed, rated bar; not a door-frame bar that can slip |

Items deliberately left out of home rules: barbells, heavy dumbbells and kettlebells,
weighted vests and sleds. They need a qualified coach on site and fall under the
[training rules](/decisions/training-rules.md) bans on maximal lifts and resisted sprints.

[^nsca-2009]: NSCA youth resistance training position statement, 2009
[^lopes-2019]: Lopes et al., meta-analysis of elastic versus conventional resistance, 2019
[^johnson-2011]: Johnson et al., systematic review of youth plyometric programmes, 2011
[^asadi-2017]: Asadi et al., meta-analysis of plyometric training and agility, 2017
[^moran-2017-sprint]: Moran et al., meta-analysis of sprint training in youth, 2017
[^white-2018]: White et al., review of goalkeeper match and test responses, 2018
[^fedb-schema]: free-exercise-db schema.json
[^wger-equipment]: wger equipment list via its public API
