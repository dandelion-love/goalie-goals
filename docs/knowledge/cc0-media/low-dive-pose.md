---
type: Playbook
title: Pose a low dive for the vector figure
description: Reproduce a low-dive reference with a CC0 rig and translate its joint positions into the app's own SVG style.
tags: [cc0-media, illustration, rig, svg]
status: draft
generated: { by: codex/gpt-6, at: 2026-11-20T02:30:00Z }
sources:
  - { id: kenney, resource: https://kenney.nl/assets/animated-characters-protagonists, title: Kenney Animated Characters Protagonists }
  - { id: tools, resource: /cc0-media/posing-and-rendering-tools.md, title: Open tools to pose and render a rig }
  - { id: feasibility, resource: /cc0-media/rig-render-feasibility.md, title: Rendering exercise poses from a CC0 rig }
---

# Purpose

Use the CC0 rig only as an offline pose reference. The shipped `content/figures/low-dive.svg` is an original line drawing, not a training exercise or a prescription. A card using it needs its own approved exercise spec. Never trace a real person or a photograph.

# Reproduce the reference

1. Download Kenney's Animated Characters Protagonists pack, check its `License.txt` and import `Model/characterMedium.fbx` as data in Blender 4.5. The pack is CC0; the character has a large stylised head, so it is a pose guide rather than a proportions template.[^kenney][^feasibility]
2. Remove pose-bone constraints, set quaternion rotation, and rotate parent bones before children. In world axes X is sideways and Z is up. Aim Spine, Chest, UpperChest, Neck and Head along `(1, 0, 0.18)`. Aim the left upper leg and lower leg along `(-1, 0.05, 0.08)` and `(-1, 0.05, -0.25)`; aim the right upper and lower leg along `(-1, -0.05, 0.28)` and `(-1, -0.05, 0.05)`. Aim both feet along `(-1, 0, 0)`.
3. Aim both shoulders along `(1, ±0.1, 0)`. Aim left arm and forearm along `(1, 0.1, -0.10)` and `(1, 0.1, 0.10)`; right arm and forearm along `(1, -0.1, 0.12)` and `(1, -0.1, -0.05)`. Aim both hands along `(1, 0, 0)`. Each vector gives the desired world-space direction from bone head to tail, not Euler angles. Rotate the bone's current world-space Y axis to the target by the shortest rotation around its head; update the dependency graph after each bone.
4. Project the bone heads onto X/Z (look along Y). For each segment, its 2D angle from horizontal is `atan2(delta Z, delta X)`; for SVG screen coordinates, flip Z because screen Y increases downward. Draw a simplified head, torso, two legs and two arms using the existing 360 by 200 viewBox, rounded ink strokes, blue gloves and grey ground. The SVG adjusts the hips and head and separates overlapping limbs for legibility; it is not a traced mesh. Add a ball as a simple circle. Compare against other app figures, especially at small size.
5. If the projection hides a joint or produces an unreadable pose, redraw that part by hand in the same style and document the adjustment. Do not infer an exercise technique from the pose.

The Blender API helper used locally remains outside the repository while its licence is unsettled. The saved output is the SVG, not a raster or the model.[^tools]

[^kenney]: Kenney, Animated Characters Protagonists, CC0 pack page.
[^tools]: Open tools to pose and render a rig.
[^feasibility]: Rendering exercise poses from a CC0 rig.
