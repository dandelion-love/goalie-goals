---
type: Research Finding
title: Rendering exercise poses from a CC0 rig
description: A feasibility test that posed a Kenney CC0 character in a goalkeeper set position and rendered it flat with Blender, what every current card would need, and a comparison with the app's parametric vector figure on effort, consistency, file size and animation, with a recommendation.
tags: [cc0-media, rig, blender, feasibility, exercise-media, comparison]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:15:00Z }
sources:
  - { id: kenney-protagonists, resource: https://kenney.nl/assets/animated-characters-protagonists, title: Kenney, Animated Characters Protagonists }
  - { id: q-ubc, resource: https://quaternius.com/packs/universalbasecharacters.html, title: Quaternius, Universal Base Characters }
  - { id: characters, resource: /cc0-media/rigged-characters.md, title: CC0 rigged characters and animation sets }
  - { id: tools, resource: /cc0-media/posing-and-rendering-tools.md, title: Open tools to pose and render a rig }
  - { id: figures, resource: /exercise-media/drawn-and-generated-figures.md, title: Drawn and generated figures }
  - { id: storage, resource: /exercise-media/storage-format.md, title: Media storage format and metadata }
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media Decision }
---

# Summary

Yes, a CC0 rig can be posed and rendered in a flat style with free tools, at a weight an iPad handles easily: one sample, a goalkeeper set position, came out at 640 by 640 px and 19 KB as WebP. But it does not beat the app's own vector figure. It is heavier, harder to animate on the card, and in a different style from the nine figures already drawn. **Recommendation: keep the parametric vector figure as the card figure, and use a CC0 rig only offline, as a 3D pose reference for hard goalkeeper moves.**

# The sample

The render is `content/figures/samples/kenney-keeper-set-position.webp` in the repository, credited in `content/credits.json`.

| Item | Value |
|---|---|
| Model | `Model/characterMedium.fbx` from Kenney's Animated Characters Protagonists 1.1, CC0 on the pack page and in the pack's `License.txt`, checked 2026-11-18[^kenney-protagonists][^characters] |
| Tool | Blender 4.5, run without a screen (`-b --factory-startup`), FBX importer, Eevee, Freestyle[^tools] |
| Pose | Set position: torso leaning about 38 degrees forward, knees bent over the toes, feet flat, hands forward at chest height with palms out |
| Style | One fill colour (light keeper blue) as an unlit emission material, ink outlines in the app's `#1f2937` at a fixed width, transparent background, the grey ground line of the current SVG figures |
| Output | PNG at 800 px, cropped and scaled to 640 by 640 px, WebP quality 82: 18,934 bytes |
| Metadata | Checked with Pillow: the file holds only `VP8X`, `ALPH` and `VP8 ` chunks, no EXIF, XMP or ICC.[^storage] |
| Repeatability | A second render of the same pose was pixel-identical. |
| Time | About 5 seconds a render; about an hour to set up import, material, outline and camera; two rounds of adjusting bone directions to get the pose. |

## Pipeline

1. Download the pack into a scratch folder outside the repo, unzip it with path checks, read its `License.txt`, and record the licence and date. Nothing from the pack is executed; only FBX or glTF is imported, never a `.blend`.
2. In Blender, from a script: import the FBX, remove the rig's constraints, and switch pose bones to quaternions.
3. Pose from data: for each bone, a target direction in the figure's frame (for example `Spine`, `Chest` and `UpperChest` leaning forward; thighs forward and down; shins back and down; feet kept at their rest direction so the soles stay flat). Each bone is rotated, parent first, to point that way.
4. Drop the figure so its lowest vertex touches the ground.
5. Replace the textures with one emission colour, turn on Freestyle silhouette and border lines in the ink colour, use an orthographic camera at a fixed angle (60 degrees from the front here), and render with a transparent background.
6. Crop, add the ground line, scale to at most 1024 px, and write WebP with no EXIF, XMP or ICC; check the chunks.
7. Add the credits entry: model author, the pack page, `CC0-1.0` for the model, the date checked, and what was changed.

The posing script stayed outside the repo; whether a script that calls Blender's Python API may sit in this MIT repo is an open question.[^tools]

# Can every card be posed?

Only the set position was rendered. The rest is judged from the rig's bones (spine, neck, head, arms, index finger and thumb, legs, toes, and a root control that can turn the whole body).

| Card or move | What the rig needs | Feasible? |
|---|---|---|
| Set position | Lean, knee bend, arms forward | Yes, rendered. |
| Front plank, side plank | Turn the whole body to the floor; forearm support | Likely; floor contact by dropping to the lowest point works for any pose. |
| Glute bridge | Body on the floor, hips raised | Likely. |
| Wall push-up | A lean, plus a wall | Likely; the wall is a plain box drawn in the same style. |
| Squat to box, split squat | Leg bends; a box for the first | Likely. |
| Broad jump with stick landing, low pogo hops | A landing pose and a short take-off and landing loop | Likely; the pack's own jump clip is a game jump, not a teaching move, so poses are set by hand. |
| Lateral shuffle | A wide side step, seen from the front | Likely. |
| Dive | Whole body turned sideways in the air, arms reaching | Likely, but this model's head is very large and hides arms in many views. |
| Punch | One or both arms driven up and forward, fists | Partly: the hand has only an index finger and a thumb, so a fist is approximate. |

The bigger problem is the character, not the rig. This Kenney model is a chibi: its head is over 40 percent of its height. That reads as a toy, not a teen athlete, and it hides the very joints a card is meant to teach. A rig with teen proportions, such as Quaternius's Universal Base Characters (CC0, free Standard tier), would fit better if this route is ever taken.[^q-ubc]

# Comparison with the parametric vector figure

The app's figure is drawn from shapes and posed by joint angles stored as data; nine cards already use it, each SVG between 746 and 1,436 bytes.[^figures]

| Criterion | CC0 rig rendered to WebP | Parametric vector figure |
|---|---|---|
| Setup effort | About an hour for this sample, plus Blender (about 0.9 GB) in any build that renders | A few days for the rig, done once; no new build tool |
| Effort per pose | Minutes to tens of minutes of adjusting 3D bone directions, then a render | Minutes: a short list of 2D joint angles |
| Consistency across cards | High within its own set (same model, line weight and colour; renders repeat exactly) | High, and already the style of all current cards |
| Fit with current figures | Low: a filled, rounded 3D body next to line figures; mixing them on one path would look like two apps | Matches by construction |
| Anatomy | Plausible 3D joints, real foreshortening, harder to pose wrongly | Only as good as the angles typed; foreshortening is faked |
| File size per pose | About 19 KB (640 px WebP) | About 1 KB (SVG) |
| Animation on the card | A loop needs a frame per step: an animated WebP of 4 to 8 frames would be roughly 75 to 150 KB per exercise (estimated from the sample), and cannot be tweened, recoloured or slowed | Tween between 2 to 4 poses with the Web Animations API; recolour with CSS; stills for reduced motion at no cost[^figures] |
| Scales on the iPad | Fixed pixels; fine at card size, soft if enlarged | Sharp at any size |
| Licence and credit | CC0 model, credited anyway; the render is adapted content in `content/` | Own work |

# Recommendation

Keep the [exercise media Decision](/decisions/exercise-media.md) as it is: the parametric vector figure stays the main source for goalkeeper moves and for every card.[^media-decision] The CC0 rig route works, but it costs about 20 times the bytes, loses cheap animation and recolouring, and would split the visual style.

Use a CC0 rig where it is strong, offline: pose a hard 3D move (dive, punch, a high catch) on a teen-proportioned CC0 rig in Blender, project its joints to 2D, and copy those angles into the vector figure's pose data. The app ships only the SVG; the rig never ships. This would be a separate story with its own acceptance spec, and the owner still approves every pose the app prescribes.

The sample WebP stays under `content/figures/samples/` as evidence for this note only; no card uses it. Undo: delete the file and its credits entry.

[^kenney-protagonists]: Kenney, Animated Characters Protagonists
[^q-ubc]: Quaternius, Universal Base Characters
[^characters]: CC0 rigged characters and animation sets
[^tools]: Open tools to pose and render a rig
[^figures]: Drawn and generated figures
[^storage]: Media storage format and metadata
[^media-decision]: Exercise media Decision
