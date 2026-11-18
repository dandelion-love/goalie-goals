---
type: Reference
title: Media storage format and metadata
description: How the app stores exercise media - SVG first, WebP for any raster, all metadata stripped - and the credits manifest that drives attribution.
tags: [exercise-media, svg, webp, metadata, privacy, attribution]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:55:00Z }
sources:
  - { id: svgo, resource: https://github.com/svg/svgo, title: SVGO (MIT) }
  - { id: sharp, resource: https://github.com/lovell/sharp, title: sharp image library (Apache-2.0) }
  - { id: sharp-output, resource: https://sharp.pixelplumbing.com/api-output, title: sharp output options and metadata }
  - { id: exiftool, resource: https://exiftool.org/, title: ExifTool }
  - { id: webp, resource: https://developers.google.com/speed/webp, title: WebP image format }
  - { id: mdn-svg, resource: https://developer.mozilla.org/en-US/docs/Web/SVG, title: MDN, SVG }
  - { id: cc-best-practice, resource: https://wiki.creativecommons.org/wiki/Best_practices_for_attribution, title: Creative Commons, best practices for attribution }
---

# Formats

| Kind | Stored as | Why |
|---|---|---|
| Figures, poses, diagrams, icons, badges | SVG | Sharp at any size, tiny, recolourable, animatable; text and geometry only.[^mdn-svg] |
| Any raster that cannot be vector (for example a low-poly trace exported as a bitmap) | WebP, at most 1024 px on the long side | Small, widely supported, lossy or lossless.[^webp] |
| Not stored | JPEG or HEIC straight from a camera, GIF, video | Camera files carry location and device data; GIF and video are large and not needed. |

# Cleaning rules

- **SVG:** run through SVGO; remove `<metadata>`, editor namespaces (Inkscape, Illustrator, Sketch), comments, scripts, event handlers, external references and embedded raster `data:` images.[^svgo]
- **WebP:** produce with sharp, which drops EXIF, XMP, IPTC and ICC data on output unless asked to keep them; never call its keep-metadata options.[^sharp-output][^sharp]
- **Check:** a content check in CI fails if an SVG contains a metadata element, a script, or an embedded raster, or if a WebP contains EXIF or XMP chunks. ExifTool can be used locally to confirm a file shows no camera tags.[^exiftool]

# Credits manifest

Every media file and every adapted text has one entry in a credits manifest kept beside the media. Fields follow Creative Commons attribution practice: title, author, source URL, licence name, licence URL, and what was changed.[^cc-best-practice] Extra fields: `origin` (`own`, `adapted`, `as-is`), `ai_generated` (true or false), and `checked_at` (the date the licence was checked at the source page).

# Schema

| Field | Example value | Required |
|---|---|---|
| `file` | path of the asset in the repo | yes |
| `origin` | `own`, `adapted`, `as-is` | yes |
| `title` | short name of the source work | for `adapted` and `as-is` |
| `author` | creator's name or handle as the source states it | for `adapted` and `as-is` |
| `source_url` | the page that states the licence | for `adapted` and `as-is` |
| `licence` | SPDX id such as `CC-BY-SA-4.0` | yes |
| `licence_url` | the licence deed | yes |
| `changes` | one line, such as "recoloured, thicker strokes" | for `adapted` |
| `ai_generated` | `false` | yes |
| `checked_at` | ISO date | for `adapted` and `as-is` |

A file without a complete entry fails the content check. The app's credits page and a credit line under each card are generated from this manifest, so attribution is never typed by hand.

[^svgo]: SVGO (MIT)
[^sharp]: sharp image library (Apache-2.0)
[^sharp-output]: sharp output options and metadata
[^exiftool]: ExifTool
[^webp]: WebP image format
[^mdn-svg]: MDN, SVG
[^cc-best-practice]: Creative Commons, best practices for attribution
