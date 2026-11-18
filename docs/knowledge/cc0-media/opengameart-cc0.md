---
type: Research Finding
title: OpenGameArt with the CC0 filter, and the Glitch art release
description: How OpenGameArt's per-submission licences and CC0 filter work, the CC0 award, star, badge, face and background packs found there, and the CC0 art from the game Glitch.
tags: [cc0-media, opengameart, glitch, rewards, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T05:50:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: oga-search, resource: "https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=9&field_art_licenses_tid%5B%5D=4", title: "OpenGameArt advanced search, 2D art, CC0 only (used 2026-11-18)" }
  - { id: award-icons, resource: https://opengameart.org/content/cc0-award-icons, title: "CC0 Award Icons (checked 2026-11-18)" }
  - { id: awards-arne16, resource: https://opengameart.org/content/awards-arne16, title: "Awards - Arne16 (checked 2026-11-18)" }
  - { id: medals-buch, resource: https://opengameart.org/content/medals-3, title: "Medals, four metal tiers (checked 2026-11-18)" }
  - { id: medals-kenney, resource: https://opengameart.org/content/medals-2, title: "Kenney Medals mirror (checked 2026-11-18)" }
  - { id: ui-expansion, resource: https://opengameart.org/content/ui-pack-expansion, title: "UI Pack Expansion, stars and medals with SVG source (checked 2026-11-18)" }
  - { id: star-effect, resource: https://opengameart.org/content/star-achievement-effect-animation, title: "Star Achievement Effect Animation (checked 2026-11-18)" }
  - { id: level-badge, resource: https://opengameart.org/content/level-badge-button-gui, title: "Level Badge button (GUI) (checked 2026-11-18)" }
  - { id: flat-icons, resource: https://opengameart.org/content/flat-icons, title: "Flat icons, 24 black glyphs with SVG source (checked 2026-11-18)" }
  - { id: expressive, resource: https://opengameart.org/content/simply-expressive-72-emotion-buttonsicons, title: "Simply Expressive, face buttons with flat versions (checked 2026-11-18)" }
  - { id: weather, resource: https://opengameart.org/content/weather-icons, title: "Weather Icons, programmer art (checked 2026-11-18)" }
  - { id: sky, resource: https://opengameart.org/content/sky-gradients, title: "Sky gradients, CC-BY 3.0 or CC0 (checked 2026-11-18)" }
  - { id: oga-medals-site, resource: https://opengameart.org/content/oga-medals, title: "OGA Medals, CC-BY 3.0 only (checked 2026-11-18)" }
  - { id: glitch-bg, resource: https://opengameart.org/content/glitch-background-assets, title: "Glitch Background Assets (checked 2026-11-18)" }
  - { id: glitch-misc, resource: https://opengameart.org/content/glitch-misc-assets-svg, title: "Glitch Misc Assets, SVG (checked 2026-11-18)" }
  - { id: glitch-sprites, resource: https://opengameart.org/content/glitch-sprite-assets-huge-collection, title: "Glitch Sprite Assets (checked 2026-11-18)" }
  - { id: glitch-home, resource: https://glitchthegame.com/public-domain-game-art/, title: "Glitch public-domain art page (redirects; seen in search, 2026-11-18)" }
  - { id: cc0, resource: https://creativecommons.org/publicdomain/zero/1.0/, title: CC0 1.0 Universal deed }
---

# Summary

OpenGameArt is a community archive where each submission carries its own licence, and
some carry several. Its CC0 filter finds plenty of award art, but most of it is pixel
art or one-off drawings in clashing styles. The useful finds are vector pieces to redraw
(stars and medals, a few flat glyphs) and, for backgrounds, the large CC0 release from
the game Glitch, whose painted style does not match the app.

# Licence handling (checked 2026-11-18)

- Each page shows a "License(s)" field. The search can be limited to CC0 2D art.[^oga-search]
- A page may list more than one licence. "Sky gradients" offers CC-BY 3.0 or CC0, so it
  may be used under CC0.[^sky] A page listing only CC-BY, such as the site's own medal
  set, is excluded here.[^oga-medals-site]
- Packs that gather files from other CC0 sources say so; their sources are checked file
  by file. "CC0 Award Icons" names Openclipart and another artist as its sources.[^award-icons]

# Candidates found (all pages show CC0)

| Pack | Author on page | What it is | Style fit |
|---|---|---|---|
| CC0 Award Icons[^award-icons] | AntumDeluge | Trophies, medals, ribbons at 32 px, gathered from other CC0 sources | Low: small, mixed sources |
| Awards - Arne16[^awards-arne16] | zwonky | Medals, cups, rosettes at 16 px | None: pixel art |
| Medals[^medals-buch] | Buch | Medals in bronze, silver, gold, platinum | Low: detailed, metal tiers suggest ranking |
| Kenney Medals mirror[^medals-kenney] | Kenney | Nine medals in shaded, flat and flat-with-shadow styles | Good (see the Kenney concept) |
| UI Pack Expansion[^ui-expansion] | photoshopwizard | Stars and medals made to go with Kenney's UI Pack; SVG source | Medium: matches Kenney shapes, the author calls it less polished |
| Star Achievement Effect Animation[^star-effect] | jellyfizh | Sprite sheet of a star burst | Low: raster sprite; the app animates its own |
| Level Badge button (GUI)[^level-badge] | masterofonebyte | A level badge button | Low: one raster image |
| Flat icons[^flat-icons] | Game2rise | 24 black flat glyphs with SVG source | Medium: recolourable, small set |
| Simply Expressive[^expressive] | SplendidDog | Face buttons with flat versions | Low for the coach: generic round faces |
| Weather Icons[^weather] | Firefly in the Dusk | Weather glyphs, including night | Low: 100 px programmer art |
| Sky gradients[^sky] | geoadel | Twelve sky gradients with SVG source | Medium: a backdrop layer, recoloured to tokens |

# The Glitch art release

- The studio behind the closed game Glitch released its art under CC0 1.0; the official
  page now redirects, so the licence was read from the OpenGameArt uploads, which credit
  the studio and show CC0.[^glitch-home][^glitch-bg][^glitch-misc][^glitch-sprites]
  The game's logo and trademark were not part of the release.[^glitch-home]
- Contents: background scenes as PNG, more than 500 miscellaneous items as SVG, and
  sprite sheets.[^glitch-bg][^glitch-misc][^glitch-sprites]
- **Fit:** large and consistent, but painted and whimsical, with gradients and fine
  detail. It clashes with the app's flat, bold token style; at most a source of shapes.

# Related

- [Shortlist](/cc0-media/shortlist.md) and [recommendation](/cc0-media/recommendation.md).

[^oga-search]: OpenGameArt advanced search, CC0 only
[^award-icons]: CC0 Award Icons
[^awards-arne16]: Awards - Arne16
[^medals-buch]: Medals (four tiers)
[^medals-kenney]: Kenney Medals mirror
[^ui-expansion]: UI Pack Expansion
[^star-effect]: Star Achievement Effect Animation
[^level-badge]: Level Badge button (GUI)
[^flat-icons]: Flat icons
[^expressive]: Simply Expressive
[^weather]: Weather Icons
[^sky]: Sky gradients
[^oga-medals-site]: OGA Medals
[^glitch-bg]: Glitch Background Assets
[^glitch-misc]: Glitch Misc Assets (SVG)
[^glitch-sprites]: Glitch Sprite Assets
[^glitch-home]: Glitch public-domain art page
[^cc0]: CC0 1.0 Universal
