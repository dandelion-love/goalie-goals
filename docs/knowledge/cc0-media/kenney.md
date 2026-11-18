---
type: Research Finding
title: Kenney UI, icon and game-art packs
description: Kenney's CC0 packs (Game Icons, Medals, UI Pack, Particle Pack, Background Elements, Map Pack, Shape Characters and others), what each holds for the app's rewards and path, and how well the style fits.
tags: [cc0-media, kenney, icons, ui, rewards, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T05:50:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: kenney-support, resource: https://kenney.nl/support, title: "Kenney support page: licence and attribution (checked 2026-11-18)" }
  - { id: game-icons, resource: https://kenney.nl/assets/game-icons, title: "Kenney Game Icons pack page (checked 2026-11-18)" }
  - { id: game-icons-oga, resource: https://opengameart.org/content/game-icons, title: "Kenney Game Icons on OpenGameArt, contents list (checked 2026-11-18)" }
  - { id: game-icons-exp, resource: https://kenney.nl/assets/game-icons-expansion, title: "Kenney Game Icons Expansion pack page (checked 2026-11-18)" }
  - { id: medals, resource: https://kenney.nl/assets/medals, title: "Kenney Medals pack page (checked 2026-11-18)" }
  - { id: medals-oga, resource: https://opengameart.org/content/medals-2, title: "Kenney Medals on OpenGameArt, styles and formats (checked 2026-11-18)" }
  - { id: ui-pack, resource: https://kenney.nl/assets/ui-pack, title: "Kenney UI Pack 2.0 pack page (checked 2026-11-18)" }
  - { id: ui-adventure, resource: https://kenney.nl/assets/ui-pack-adventure, title: "Kenney UI Pack Adventure pack page (checked 2026-11-18)" }
  - { id: particle, resource: https://kenney.nl/assets/particle-pack, title: "Kenney Particle Pack pack page (checked 2026-11-18)" }
  - { id: particle-files, resource: https://github.com/Calinou/kenney-particle-pack, title: "Public mirror of the Particle Pack, used to list its file names (checked 2026-11-18)" }
  - { id: bg, resource: https://kenney.nl/assets/background-elements, title: "Kenney Background Elements pack page (checked 2026-11-18)" }
  - { id: bg-redux, resource: https://kenney.nl/assets/background-elements-redux, title: "Kenney Background Elements Remastered pack page (checked 2026-11-18)" }
  - { id: map, resource: https://kenney.nl/assets/map-pack, title: "Kenney Map Pack pack page (checked 2026-11-18)" }
  - { id: emotes, resource: https://kenney.nl/assets/emotes-pack, title: "Kenney Emotes Pack pack page (checked 2026-11-18)" }
  - { id: emotes-oga, resource: https://opengameart.org/content/emotes-pack, title: "Kenney Emotes Pack on OpenGameArt, styles and formats (checked 2026-11-18)" }
  - { id: shapes, resource: https://kenney.nl/assets/shape-characters, title: "Kenney Shape Characters pack page (checked 2026-11-18)" }
  - { id: toon, resource: https://kenney.nl/assets/toon-characters-1, title: "Kenney Toon Characters pack page (checked 2026-11-18)" }
  - { id: sports, resource: https://kenney.nl/assets/sports-pack, title: "Kenney Sports Pack pack page (checked 2026-11-18)" }
  - { id: board, resource: https://kenney.nl/assets/board-game-icons, title: "Kenney Board Game Icons pack page (checked 2026-11-18)" }
  - { id: cc0, resource: https://creativecommons.org/publicdomain/zero/1.0/, title: CC0 1.0 Universal deed }
---

# Summary

Kenney is one studio's catalogue of game art, all CC0. It is the most consistent CC0
family found: one hand, one set of shapes, and packs for icons, medals, buttons, panels,
backgrounds, map paths and simple characters. It has a star, a trophy, a medal, a lock
and a check mark as single-colour glyphs, but no flame glyph, no rest-day symbol, nothing
goalkeeper-specific, and no character that could serve as an original coach as is.

# Licence

- The support page states that every game asset on the asset pages is public domain
  (CC0), free for commercial use, and that attribution is not required. It asks only that
  the studio's logo is not used on its own.[^kenney-support][^cc0]
- Every pack page checked below shows "Creative Commons CC0" itself. Checked
  2026-11-18.
- Each download also carries its own licence file; the build keeps it next to the asset
  in the credits manifest.

# Packs that matter for rewards and the path

| Pack | Page licence | Files | What it holds for the app | Formats |
|---|---|---|---|---|
| Game Icons[^game-icons] | CC0 | 105 | Single-colour glyphs, black and white, including star, trophy, medal, lock, check mark, home, settings, play and pause, warning; also a "leaderboards" glyph the app does not use[^game-icons-oga] | PNG at 1x and 2x, sprite sheets and vector source files[^game-icons-oga] |
| Game Icons Expansion[^game-icons-exp] | CC0 | 60 | More glyphs in the same style | As above |
| Medals[^medals] | CC0 | 27 | Nine medals, each in shaded, flat, and flat-with-shadow styles[^medals-oga] | PNG and sprite sheets only, no vector listed[^medals-oga] |
| UI Pack (2.0, "completely remade")[^ui-pack] | CC0 | 430 | Buttons, panels, sliders, round buttons: bases for path nodes and reward cards | Check the download for vector files |
| UI Pack Adventure[^ui-adventure] | CC0 | 130 | Panels and frames in an adventure theme | As above |
| Particle Pack[^particle] | CC0 | 80 | Soft grey-scale textures at 512 px, among them six flame, two fire and nine star shapes[^particle-files] | PNG |
| Background Elements[^bg] and Background Elements Remastered[^bg-redux] | CC0 | 110 and 90 | Hills, clouds, trees and sky pieces for layered backgrounds | Check the download for vector files |
| Map Pack[^map] | CC0 | 180 | Overworld map tiles: paths and markers for a map-like route | PNG |
| Emotes Pack[^emotes] | CC0 | 480 | Speech-balloon emotes in vector and pixel styles[^emotes-oga] | PNG, sheets, vector source |
| Shape Characters[^shapes] | CC0 | 100 | Geometric characters built from simple shapes (2023) | Check the download |
| Toon Characters[^toon] | CC0 | 270 | Platformer characters in several poses | PNG |
| Sports Pack[^sports] | CC0 | 380 | Top-down sports tiles and characters | PNG |
| Board Game Icons[^board] | CC0 | 250 | Cards, dice, pieces; little the app needs | PNG and vector |

# Style fit

- **Good:** one designer, a small set of rounded shapes, bold silhouettes. The Game Icons
  are single-colour, so they recolour to the app's tokens with a fill change and no
  redrawing. That suits the app's rule of bold colour and rounded shapes in its own
  palette.
- **Mixed:** the Medals pack is raster only, so a medal must be traced or redrawn as SVG
  to meet the stored-format rule (SVG for badges). Particle textures are effects (a glow
  behind a reward), not icons.
- **Poor:** the character packs are platformer and sports sprites, not a coach; none has
  a whistle, cap, gloves or a coaching pose.
- **Leave out:** coins, gems, chests, baskets and shopping glyphs, and the leaderboard
  glyph. The progression Decision has no currency, store, random reward or ranking, so
  their art has no place in the app.

# Related

- [Shortlist](/cc0-media/shortlist.md) and [recommendation](/cc0-media/recommendation.md).
- [Progression design](/decisions/progression-design.md) for the rewards that exist.

[^kenney-support]: Kenney support page
[^game-icons]: Kenney Game Icons
[^game-icons-oga]: Kenney Game Icons on OpenGameArt
[^game-icons-exp]: Kenney Game Icons Expansion
[^medals]: Kenney Medals
[^medals-oga]: Kenney Medals on OpenGameArt
[^ui-pack]: Kenney UI Pack 2.0
[^ui-adventure]: Kenney UI Pack Adventure
[^particle]: Kenney Particle Pack
[^particle-files]: Particle Pack file list (public mirror)
[^bg]: Kenney Background Elements
[^bg-redux]: Kenney Background Elements Remastered
[^map]: Kenney Map Pack
[^emotes]: Kenney Emotes Pack
[^emotes-oga]: Kenney Emotes Pack on OpenGameArt
[^shapes]: Kenney Shape Characters
[^toon]: Kenney Toon Characters
[^sports]: Kenney Sports Pack
[^board]: Kenney Board Game Icons
[^cc0]: CC0 1.0 Universal
