---
type: Research Finding
title: Muscle map for exercise dossiers
description: Use body-muscles' own path data (Apache-2.0), drawn by the app's own React component in its tokens, with a 15-group vocabulary and a proposed mapping for the nine current cards; the map is fixed per exercise and never shows data about the keeper.
tags: [cc0-media, anatomy, muscle-map, recommendation, licensing, dossier]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T07:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: components, resource: /cc0-media/muscle-map-components.md, title: Open muscle-map components and their art }
  - { id: diagrams, resource: /cc0-media/muscle-map-diagrams.md, title: Open muscle diagrams and CC0 sets }
  - { id: bm-data, resource: https://github.com/vulovix/body-muscles/tree/main/src/data, title: "body-muscles path data and muscle groups (checked 2026-11-18)" }
  - { id: bm-licence, resource: https://github.com/vulovix/body-muscles/blob/main/LICENSE, title: body-muscles LICENSE (Apache-2.0) }
  - { id: bm-notice, resource: https://github.com/vulovix/body-muscles/blob/main/NOTICE, title: body-muscles NOTICE }
  - { id: apache, resource: https://www.apache.org/licenses/LICENSE-2.0, title: Apache License 2.0, section 4 on redistribution }
  - { id: credits-check, resource: /decisions/exercise-media.md, title: "Exercise media decision (credits manifest, licence gate)" }
  - { id: tokens, resource: /decisions/visual-identity.md, title: Fonts and design tokens decision }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules decision }
  - { id: wger-plank, resource: "https://wger.de/api/v2/exerciseinfo/458/?format=json", title: "wger exercise data, Plank, muscles tagged (CC BY-SA 3)" }
  - { id: wger-bridge, resource: "https://wger.de/api/v2/exerciseinfo/265/?format=json", title: "wger exercise data, Glute Bridge, muscles tagged (CC BY-SA 4)" }
  - { id: wger-side-plank, resource: "https://wger.de/api/v2/exerciseinfo/580/?format=json", title: "wger exercise data, Side Plank, muscles tagged (CC BY-SA 4)" }
  - { id: wger-push-up, resource: "https://wger.de/api/v2/exerciseinfo/1551/?format=json", title: "wger exercise data, Push-Up, muscles tagged (CC BY-SA 4)" }
  - { id: wger-squat, resource: "https://wger.de/api/v2/exerciseinfo/615/?format=json", title: "wger exercise data, Squats, muscles tagged (CC BY-SA 3)" }
---

# Recommendation

Use the **path data from body-muscles** (npm 1.0.0), not its renderer and not as a
dependency.[^components]

- **Code licence:** Apache-2.0.[^bm-licence]
- **Art licence:** the same Apache-2.0 file covers the whole repository, including the path
  data; the NOTICE names the package author as copyright holder; no outside source is
  stated, and no open question about it was found.[^bm-notice][^components]
- **Why it and not the others:** every React highlighter checked either reuses one drawing
  whose origin is unanswered, or traces AI-generated realistic bodies; Commons and wger
  offer only realistic CC BY-SA anatomy; no CC0 map exists.[^components][^diagrams]
- **Why it fits:** a faceted, neutral grey figure with no face, skin or sex
  characteristics; 89 named regions, including glute medius, hip flexors, tibialis and
  the lower back, which the goalkeeper cards need.[^bm-data]

## How the app would use it

A later build story, with its own acceptance spec, would:

1. Copy the front and back path data once into `content/anatomy/` (SVG or JSON), with the
   Apache-2.0 text and the NOTICE beside it, and a "changed by goalie-goals" note in each
   changed file, as section 4 of the licence asks.[^apache]
2. Add a credits manifest entry: licence `Apache-2.0` (on the credits check's list),
   author, source URL, `adapted: true`, the changes, and the date checked.[^credits-check]
3. Render it with the app's own React component and tokens: unworked regions in
   `--action-tint` with a `--line` outline, primary groups in solid `--action`, secondary
   groups in `--action` with a hatch, so colour is never the only signal; a text list of
   the groups sits under the figure.[^tokens]
4. Drop the package's intensity scale, glow, drop shadow, hover and click handling.

## What the map never does

- It shows only which groups an exercise works, taken from the card. It never changes
  with the keeper's data: no counts, no "your muscles", no progress or load shading, no
  heat map, and no body measurement.
- It is one neutral figure for everyone; there is no body-type, sex or size choice.
- It has two states per group (primary, secondary) plus unworked; the package's 0 to 10
  intensity scale is not carried over.

# Vocabulary

Fifteen groups, each a set of body-muscles region ids (both sides). The app's cards
would name these group keys; the component expands them to regions.[^bm-data]

| Group key | Shown as | body-muscles regions (left and right) | View |
|---|---|---|---|
| `chest` | Chest | `chest-upper-*`, `chest-lower-*` | front |
| `front-shoulders` | Front of shoulders | `shoulder-front-*` | front |
| `triceps` | Back of arms | `triceps-long-*`, `triceps-lateral-*` | back |
| `serratus` | Side of ribs | `serratus-anterior-*` | front |
| `abs` | Abs | `abs-upper-*`, `abs-lower-*` | front |
| `obliques` | Side of trunk | `obliques-*` | front |
| `lower-back` | Lower back | `lower-back-erectors-*`, `lower-back-ql-*` | back |
| `hip-flexors` | Front of hips | `hip-flexor-*` | front |
| `glutes` | Glutes | `gluteus-maximus-*` | back |
| `side-glutes` | Side of hips | `gluteus-medius-*` | back |
| `quads` | Front of thighs | `quads-*` | front |
| `adductors` | Inner thighs | `adductors-*` | front |
| `hamstrings` | Back of thighs | `hamstrings-medial-*`, `hamstrings-lateral-*` | back |
| `calves` | Calves | `calves-gastroc-medial-*`, `calves-gastroc-lateral-*`, `calves-soleus-*` | back |
| `shins` | Front of shins | `tibialis-anterior-*` | front |

Regions outside these groups (head, hands, feet, knees, arms not listed) stay unworked.

# Mapping for the current cards

The cards name goals (`leg-strength`, `trunk-stability`, `reactive-ankle` and so on) and
body areas in their cues, not muscles. This table is a **proposal**: the muscles each
movement works, by movement analysis, cross-checked against wger's crowd-tagged exercise
data where wger has the exercise.[^wger-plank][^wger-bridge][^wger-side-plank][^wger-push-up][^wger-squat]
The domain rules make every prescribed exercise the owner's to approve, so the owner
approves this table before a `muscles` field is added to the cards.[^training-rules]

| Card | Card goals | Primary | Secondary | wger cross-check |
|---|---|---|---|---|
| Broad jump and stick | horizontal-power, landing, leg-strength | glutes, quads, calves | hamstrings, abs | none in wger |
| Glute bridge | hip-strength, trunk-stability | glutes | hamstrings, abs | glutes; hamstrings[^wger-bridge] |
| Lateral shuffle | lateral-footwork, leg-strength | quads, side-glutes, adductors | calves, glutes | none in wger |
| Plank | trunk-stability | abs, obliques | front-shoulders, quads | obliques, abs; biceps, quads, triceps[^wger-plank] |
| Pogo hops | reactive-ankle, landing | calves | shins, quads | none in wger |
| Side plank | trunk-stability, lateral-trunk | obliques, side-glutes | abs, lower-back | abs; obliques[^wger-side-plank] |
| Split squat | leg-strength, single-leg-strength, hip-strength | quads, glutes | hamstrings, adductors, side-glutes, calves | squat: quads; glutes[^wger-squat] |
| Squat to box | leg-strength, hip-strength | quads, glutes | hamstrings, adductors, lower-back | quads; glutes[^wger-squat] |
| Wall push-up | upper-body-push, trunk-stability | chest, triceps | front-shoulders, abs, serratus | push-up: chest; shoulders, abs, triceps[^wger-push-up] |

Where this differs from wger: the plank leaves out wger's "biceps", which holds no load in
a forearm plank; the side plank puts side-glutes first, because the card's goal is the
lateral trunk and hip; the glute bridge adds abs for the card's trunk-stability goal.
wger's tags are crowd-sourced, so they are a check, not a source of record.

# Licence table

| Option | Code | Art | Accepted by AC3 | Used |
|---|---|---|---|---|
| body-muscles path data | Apache-2.0 | Apache-2.0, author's own per NOTICE | Yes (credits check list) | **Recommended** |
| wger muscle overlays | AGPL-3.0 (not used) | CC BY-SA 3.0 (Commons) | Yes, kept in `content/` with credits | Second choice; realistic and too few muscles |
| Commons muscular-system SVGs | none | CC BY-SA 3.0 or 4.0 | Licence yes, fit no | Reference only |
| react-native-body-highlighter and the packages built on its art | MIT | Unclear, question unanswered | No | Rejected |
| MuscleMap | MIT | MIT, traced over AI-generated bodies | No (AI, realistic) | Rejected |
| A CC0 map | | None found | | Would have to be drawn |

# Gaps and open points

- body-muscles has one release and one maintainer; the data is copied once, so the app does
  not depend on it staying maintained.
- Its NOTICE claims the drawing, but no file states how it was made. Nothing found
  suggests a traced source; if one turns up, the fallback is the app drawing its own
  faceted figure in the same 15 groups.
- Pogo hops and the broad jump are elastic, whole-chain moves; a muscle map shows only
  where the work is felt, so the dossier text keeps the "springy ankles" framing.
- The mapping table needs the owner's approval, and the `muscles` field and the
  component need a story with an acceptance spec.

[^components]: Open muscle-map components and their art
[^diagrams]: Open muscle diagrams and CC0 sets
[^bm-data]: body-muscles path data and muscle groups
[^bm-licence]: body-muscles LICENSE
[^bm-notice]: body-muscles NOTICE
[^apache]: Apache License 2.0
[^credits-check]: Exercise media decision
[^tokens]: Fonts and design tokens decision
[^training-rules]: Training rules decision
[^wger-plank]: wger, Plank
[^wger-bridge]: wger, Glute Bridge
[^wger-side-plank]: wger, Side Plank
[^wger-push-up]: wger, Push-Up
[^wger-squat]: wger, Squats
