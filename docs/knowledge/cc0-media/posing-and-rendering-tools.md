---
type: Research Finding
title: Open tools to pose and render a rig
description: Blender (Eevee with Freestyle lines, its glTF and FBX importers, the Freestyle SVG exporter) and three.js (WebGL in a headless browser, SVGRenderer) for turning a posed CC0 rig into a flat WebP or SVG, with licences and limits.
tags: [cc0-media, blender, threejs, rendering, svg, webp]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:10:00Z }
sources:
  - { id: blender-gpl, resource: https://docs.blender.org/manual/en/latest/getting_started/about/license.html, title: Blender manual, about free software and the GPL }
  - { id: blender-licence, resource: https://www.blender.org/about/license/, title: Blender licence page }
  - { id: freestyle-svg, resource: https://docs.blender.org/manual/en/4.1/addons/render/render_freestyle_svg.html, title: Blender manual 4.1, Freestyle SVG Exporter }
  - { id: three-licence, resource: https://github.com/mrdoob/three.js/blob/dev/LICENSE, title: three.js licence (MIT) }
  - { id: three-svg, resource: https://threejs.org/docs/#examples/en/renderers/SVGRenderer, title: three.js docs, SVGRenderer }
  - { id: sharp-output, resource: https://sharp.pixelplumbing.com/api-output, title: sharp output options and metadata }
  - { id: storage, resource: /exercise-media/storage-format.md, title: Media storage format and metadata }
---

# Summary

Blender is the practical tool: it imports FBX and glTF, poses a rig from a script with no screen, and draws flat fills with ink outlines (Freestyle) in one render. three.js can do the same in a browser, which helps only if the app ever poses figures live. Neither gives clean vector output for a shaded figure, so a CC0 rig ends up as WebP, not SVG.

# Tools

## Blender

- **Licence:** GPL for the program; what you make with it, renders and `.blend` files included, is yours to license as you like.[^blender-licence][^blender-gpl] A posing script calls Blender's own Python API, so whether it must be GPL is a question for the owner before such a script is committed to this MIT repo; the script used for the sample was kept outside the repo for that reason.
- **Import:** the bundled FBX and glTF importers read the model as data. A `.blend` from a pack is avoided because it can carry scripts.
- **Posing without a screen:** `blender -b --factory-startup --python pose.py` imports the model, sets each pose bone's rotation, and renders. A pose can be stored as a short list of bone directions, the same idea as the app's own figure, which keeps poses in the repo as data.
- **Flat style:** an emission material in one fill colour ignores lighting; Freestyle draws silhouette and border lines in the app's ink colour at a fixed pixel width; a transparent film leaves the background to the card. This was tested here (see the [feasibility note](/cc0-media/rig-render-feasibility.md)).
- **Vector output:** the Freestyle SVG Exporter writes the Freestyle strokes, optionally filled with material colours, to SVG, including one SVG per animation. Its manual warns that fills can be ordered wrongly and that some viewers draw the paths badly.[^freestyle-svg] In Blender 4.2 and later it is no longer among the bundled add-ons (it was not in the 4.5 install used here), so it would have to be installed as an extension.
- **Raster output:** PNG from Blender, then WebP through a library that writes no EXIF, XMP or ICC data, as the storage rules require.[^storage][^sharp-output]

## three.js

- **Licence:** MIT.[^three-licence]
- **WebGL rendering:** loads glTF, poses bones by quaternion, and renders with an unlit material and an outline pass. Headless use needs a real browser (for example Chromium through Playwright), since Node has no WebGL of its own. Useful if the app later poses a 3D figure live on the iPad; for pre-rendered assets it adds a browser to the build for no gain over Blender.
- **SVGRenderer:** draws a scene as SVG paths, with no texture, shadow or advanced shading support.[^three-svg] It draws per face, so even an 800-vertex model gives hundreds of paths: far heavier than the app's hand-shaped figures, and not a clean line drawing.

# Fit for this app

| Need | Blender | three.js |
|---|---|---|
| Script a pose from data | Yes, Python, offline | Yes, JavaScript |
| Flat fill and ink outline | Yes (emission plus Freestyle), tested | Yes, with an outline pass; not tested |
| Clean SVG | Partly (Freestyle SVG extension, fill-order warnings) | Poor (one path per face) |
| WebP with no metadata | Yes, through the existing WebP step | Yes, through a screenshot then the same step |
| Extra build dependency | Blender itself (the 4.5 install used here is about 0.9 GB) | A headless browser |

[^blender-gpl]: Blender manual, about free software and the GPL
[^blender-licence]: Blender licence page
[^freestyle-svg]: Blender manual 4.1, Freestyle SVG Exporter
[^three-licence]: three.js licence (MIT)
[^three-svg]: three.js docs, SVGRenderer
[^sharp-output]: sharp output options and metadata
[^storage]: Media storage format and metadata
