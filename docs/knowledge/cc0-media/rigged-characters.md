---
type: Research Finding
title: CC0 rigged characters and animation sets
description: Kenney, Quaternius, Poly Pizza and OpenGameArt's CC0 filter as sources of a rigged human figure and its animations, with each licence read from the pack or model page and the date checked, and the sources ruled out.
tags: [cc0-media, 3d, rig, animation, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:10:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: cc0, resource: https://creativecommons.org/publicdomain/zero/1.0/, title: CC0 1.0 Universal deed }
  - { id: kenney-protagonists, resource: https://kenney.nl/assets/animated-characters-protagonists, title: Kenney, Animated Characters Protagonists }
  - { id: kenney-survivors, resource: https://kenney.nl/assets/animated-characters-survivors, title: Kenney, Animated Characters Survivors }
  - { id: kenney-retro, resource: https://kenney.nl/assets/animated-characters-retro, title: Kenney, Animated Characters Retro }
  - { id: kenney-mini, resource: https://kenney.nl/assets/mini-characters, title: Kenney, Mini Characters }
  - { id: kenney-blocky, resource: https://kenney.nl/assets/blocky-characters, title: Kenney, Blocky Characters }
  - { id: q-ubc, resource: https://quaternius.com/packs/universalbasecharacters.html, title: Quaternius, Universal Base Characters }
  - { id: q-ual, resource: https://quaternius.com/packs/universalanimationlibrary.html, title: Quaternius, Universal Animation Library }
  - { id: q-uacp, resource: https://quaternius.com/packs/ultimatedanimatedcharacter.html, title: Quaternius, Ultimate Animated Character Pack }
  - { id: q-umc, resource: https://quaternius.com/packs/ultimatemodularcharacters.html, title: Quaternius, Ultimate Modular Characters }
  - { id: pp-search, resource: https://poly.pizza/search/character, title: Poly Pizza, search for character }
  - { id: pp-human, resource: https://poly.pizza/m/c3Ibh9I3udk, title: Poly Pizza, Animated Human by Quaternius }
  - { id: oga-search, resource: "https://opengameart.org/art-search-advanced?keys=rigged+character&field_art_type_tid%5B%5D=10&field_art_licenses_tid%5B%5D=4", title: OpenGameArt advanced search, 3D art, CC0, rigged character }
  - { id: oga-faq, resource: https://opengameart.org/content/faq, title: OpenGameArt FAQ }
  - { id: mixamo-faq, resource: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html, title: Adobe, Mixamo common questions }
  - { id: cmu-mocap, resource: http://mocap.cs.cmu.edu/, title: CMU Graphics Lab motion capture database }
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media Decision }
---

# Summary

Two studios publish whole packs of rigged, animated humans under CC0, Kenney and Quaternius, and both state the licence on every pack page. Kenney also puts a `License.txt` inside each download, so the licence travels with the model file. Poly Pizza and OpenGameArt mix CC0 with attribution licences on one site, so the licence is read per model, never per site. Motion data from real people (Mixamo, the CMU database) is ruled out.

CC0 waives copyright and related rights as far as the law allows, so a CC0 model can be posed, restyled and rendered with no attribution required.[^cc0] The app credits it anyway, as the [exercise media Decision](/decisions/exercise-media.md) asks for every asset.[^media-decision]

# Licence table

"Checked" is the date the licence was read on the page named, in UTC. Each row's licence is as the pack or model page states it, not as an aggregator reports it.

| Source | What it holds | Rig and animations | Licence, as its page states it | Checked | Verdict |
|---|---|---|---|---|---|
| Kenney, Animated Characters Protagonists[^kenney-protagonists] | One low-poly human mesh (`characterMedium.fbx`, about 800 vertices), four texture skins with SVG sources | Humanoid skeleton with spine, neck, head, arms, index finger and thumb, legs and toes, plus foot and knee control bones; idle, jump and run as separate FBX files | Creative Commons CC0 on the page; `License.txt` in the download (version 1.1) says CC0 and that credit is welcome but not required | 2026-11-18 | Usable. Used for the sample render. |
| Kenney, Animated Characters Survivors[^kenney-survivors] and Retro[^kenney-retro] | More skins for the same kind of character | Same kind of rig and clips (not downloaded) | Creative Commons CC0 on each page | 2026-11-18 | Usable; adds nothing for this app. |
| Kenney, Mini Characters[^kenney-mini] and Blocky Characters[^kenney-blocky] | Chibi and blocky characters | Contents not inspected; pages list file counts only | Creative Commons CC0 on each page | 2026-11-18 | Usable, but the proportions are too toy-like to teach form. |
| Quaternius, Universal Base Characters[^q-ubc] | Base humans in superhero, regular and teen proportions, about 13k triangles, textured | A humanoid rig made for retargeting; animations come from the library below | CC0 on the page; the free Standard tier has OBJ, FBX and glTF, the paid Source tier adds `.blend` files | 2026-11-18 | Best fit in proportions (a teen body); worth a second sample. |
| Quaternius, Universal Animation Library[^q-ual] | Over 120 clips: locomotion in eight directions, jog, sprint, push, crawl, swim, sit, combat, emotes | Retargets to the base characters | CC0 on the page; free Standard tier, paid Pro and Source tiers | 2026-11-18 | Licence fine. The page does not say how the motion was made, so a clip is used only as a starting pose that we re-pose, never as captured motion of a person (see below). No goalkeeper clips are named. |
| Quaternius, Ultimate Animated Character Pack[^q-uacp] | Over 50 animated characters, FBX, OBJ and Blend | Animations included, not named on the page | CC0 on the page; free | 2026-11-18 | Usable; older and more stylised than the base characters. |
| Quaternius, Ultimate Modular Characters[^q-umc] | 11 characters split into swappable parts, 24 animations | Rig not described on the page | CC0 on the page; free | 2026-11-18 | Usable; parts help make a keeper kit. |
| Poly Pizza[^pp-search] | A model hub with an "Animated" filter and a licence filter | Per model | Mixed: the first page of a search for "character" held 34 models marked CC0 1.0 and 30 marked CC-BY 3.0. Each model page states its own licence, for example "Public Domain (CC0)" on a Quaternius animated human[^pp-human] | 2026-11-18 | Per model only. CC-BY 3.0 models are out (not in the content folder's compatible list). |
| OpenGameArt[^oga-search] | A community archive with a CC0 licence filter on its advanced search | Per item | Mixed site-wide; the CC0 filter on 3D art found 78 items for "rigged character". An item can list several licences, and the FAQ asks reusers to credit as each item says[^oga-faq] | 2026-11-18 | Per item only, and only when the uploader is the author or names the original CC0 source. |

# Ruled out

| Source | Why |
|---|---|
| Mixamo characters and animations | Adobe's own terms, not CC0: royalty-free use inside a project, but the raw character and animation files may not be redistributed, and this repository is public.[^mixamo-faq] |
| CMU motion capture database and its conversions | Motion captured from real people, under the lab's own terms rather than CC0, and some re-hosted conversions carry different, narrower licences. The issue's rule is no motion capture of real people from unclear sources.[^cmu-mocap] |
| Any model whose page shows CC BY, CC BY-NC, a store licence or no licence | Outside the CC0 rule of this research and, for most, outside the Decision's list.[^media-decision] |
| A pack licence read from an aggregator, a blog or a search result | Only the pack or model page, or a licence file inside the download, counts. |

# How to check a model before use

1. Open the model's own page (not a list or search page) and record the licence wording and the date, in UTC.
2. Download it and read any licence file inside the archive; if it disagrees with the page, do not use it.
3. On a hub, confirm the uploader is the author, or that the page names the original CC0 source.
4. Prefer FBX or glTF over `.blend` from a pack: a `.blend` can carry Python that Blender would run if auto-run were turned on.
5. Add the credits entry (title, author, the page URL, licence `CC0-1.0`, date checked, what was changed) in the same commit as the render.

[^cc0]: CC0 1.0 Universal deed
[^kenney-protagonists]: Kenney, Animated Characters Protagonists
[^kenney-survivors]: Kenney, Animated Characters Survivors
[^kenney-retro]: Kenney, Animated Characters Retro
[^kenney-mini]: Kenney, Mini Characters
[^kenney-blocky]: Kenney, Blocky Characters
[^q-ubc]: Quaternius, Universal Base Characters
[^q-ual]: Quaternius, Universal Animation Library
[^q-uacp]: Quaternius, Ultimate Animated Character Pack
[^q-umc]: Quaternius, Ultimate Modular Characters
[^pp-search]: Poly Pizza, search for character
[^pp-human]: Poly Pizza, Animated Human by Quaternius
[^oga-search]: OpenGameArt advanced search, 3D art, CC0, rigged character
[^oga-faq]: OpenGameArt FAQ
[^mixamo-faq]: Adobe, Mixamo common questions
[^cmu-mocap]: CMU Graphics Lab motion capture database
[^media-decision]: Exercise media Decision
