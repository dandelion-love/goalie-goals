---
type: Reference
title: CC0 art shortlist for rewards and the path
description: For each piece of reward and path art the app needs, the CC0 candidates with their pack or file pages, a style-fit note, and whether it must be drawn instead.
tags: [cc0-media, shortlist, rewards, lesson-path, coach]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T05:50:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: kenney, resource: /cc0-media/kenney.md, title: Kenney UI, icon and game-art packs }
  - { id: peeps, resource: /cc0-media/open-peeps-and-related-sets.md, title: "Open Peeps, Humaaans and Open Doodles" }
  - { id: openclipart, resource: /cc0-media/openclipart.md, title: Openclipart and public-domain vector mirrors }
  - { id: oga, resource: /cc0-media/opengameart-cc0.md, title: OpenGameArt with the CC0 filter }
  - { id: progression, resource: /decisions/progression-design.md, title: Progression design decision }
  - { id: ux, resource: /decisions/ux-patterns.md, title: UX patterns decision }
---

# How to read this

Every candidate is CC0 on its own page, checked 2026-11-18 (details and caveats in the
source concepts). "Fit" is against the app's visual rules: bold colour, rounded shapes,
the app's own palette, SVG for icons and badges.[^ux] Only rewards the
[progression Decision](/decisions/progression-design.md) allows are listed: no league,
podium, ranking, coin, chest or store art.[^progression]

Fit scale: **good** (recolour only), **base** (keep the geometry, redraw in the app's
style), **reference** (shape idea only), **no**.

# Streak flame

Used for the team and individual streaks.

| Candidate | Page | Fit |
|---|---|---|
| Openclipart, Fire pictogram | [file page](https://openclipart.org/detail/211413/fire) | Base: simple silhouette to redraw flat |
| Openclipart, Fire Icon | [file page](https://openclipart.org/detail/2242/fire-icon) | Reference: copied from a Commons file; licence must be read there |
| Openclipart, Fire Ball Icon | [file page](https://openclipart.org/detail/29629/fire-ball-icon) | No: gradients |
| Kenney Particle Pack, flame textures | [pack page](https://kenney.nl/assets/particle-pack) | Good as a soft glow behind the icon, not as the icon |

Kenney's icon packs have no flame glyph.[^kenney] **Draw the flame icon**, using the
Openclipart pictogram as a base if useful.[^openclipart]

# Star (session credit and form stars)

| Candidate | Page | Fit |
|---|---|---|
| Kenney Game Icons, star | [pack page](https://kenney.nl/assets/game-icons) | Good: single-colour vector glyph |
| UI Pack Expansion, stars | [pack page](https://opengameart.org/content/ui-pack-expansion) | Base: made to match Kenney's UI Pack, SVG source |
| Openclipart, Star | [file page](https://openclipart.org/detail/95431/star) | Reference: shaded |
| Kenney Particle Pack, star textures | [pack page](https://kenney.nl/assets/particle-pack) | Good for a sparkle effect only |

# Level badges (technique levels per skill area)

A badge frame per level, with an emblem per skill area (handling, footwork, diving,
landing).

| Candidate | Page | Fit |
|---|---|---|
| Kenney Medals, flat style | [pack page](https://kenney.nl/assets/medals) | Base: matching shapes, but raster only, so traced to SVG |
| Kenney UI Pack 2.0, round buttons and panels | [pack page](https://kenney.nl/assets/ui-pack) | Base for a plain badge frame |
| Openclipart, Medal | [file page](https://openclipart.org/detail/50221/medal) | Reference |
| OGA Medals (four metal tiers) | [pack page](https://opengameart.org/content/medals-3) | No: detailed, and metal tiers read as ranking |

No CC0 set has goalkeeper emblems. **Draw the four skill-area emblems** (a glove for
handling, footprints for footwork, a diving figure, a landing figure) in the style of the
app's own exercise figure.

# Trophy (milestone badges)

For milestones such as the first month together or a full block with every warm-up
logged.

| Candidate | Page | Fit |
|---|---|---|
| Kenney Game Icons, trophy | [pack page](https://kenney.nl/assets/game-icons) | Good: single-colour vector glyph |
| Openclipart, Trophy Emoji | [file page](https://openclipart.org/detail/328728/trophy-emoji) | Base: flat with white outline; check the remix chain |
| CC0 Award Icons | [pack page](https://opengameart.org/content/cc0-award-icons) | No: 32 px, mixed sources |
| Openclipart, 1st Place Trophy | [file page](https://openclipart.org/detail/332033/1st-place-trophy) | No: a placing number implies ranking |

# Path nodes

Steps on the lesson path in states: done, today, rest kept, paused, and ordered-for-safety
(the next step waits for the one before it). No paywall lock.[^ux]

| Candidate | Page | Fit |
|---|---|---|
| Kenney UI Pack 2.0, round buttons | [pack page](https://kenney.nl/assets/ui-pack) | Base: round pressable buttons in colour variants |
| Kenney Game Icons, check mark, lock, play | [pack page](https://kenney.nl/assets/game-icons) | Good: state glyphs on the node |
| Kenney Map Pack | [pack page](https://kenney.nl/assets/map-pack) | Reference: path and marker tiles for a map-like route |
| Kenney UI Pack Adventure | [pack page](https://kenney.nl/assets/ui-pack-adventure) | Reference: framed panels for a unit header |

A node is a circle plus a glyph, so it is quickest to **draw it in SVG with the app's
tokens** and use the Kenney glyphs inside it.

# Rest-day marker

Shown on the path and calendar as "rest kept", a positive state, never a missed one.

| Candidate | Page | Fit |
|---|---|---|
| Openclipart, Moon (outlines) | [file page](https://openclipart.org/detail/224735/moon-outlines) | Base: simple outline, drawn for small sizes |
| OGA Weather Icons, night | [pack page](https://opengameart.org/content/weather-icons) | No: small programmer art |
| Kenney Emotes Pack | [pack page](https://kenney.nl/assets/emotes-pack) | Reference: speech-balloon emotes; check for a sleep emote |

**Draw the rest marker** (for example a moon or a calm leaf on the node), using the
Openclipart moon as a base if useful.

# Coach character base (optional)

| Candidate | Page | Fit |
|---|---|---|
| Open Peeps | [library page](https://www.openpeeps.com/) | Base: modular people with expressive faces; restyle line art to the app's look |
| Humaaans | [library page](https://www.humaaans.com/) | Base: flat colour people, minimal faces |
| Kenney Shape Characters | [pack page](https://kenney.nl/assets/shape-characters) | Reference: geometric characters, close to the icon style |
| Open Doodles | [library page](https://www.opendoodles.com/) | Reference: a few active poses |

None is a coach. **The coach is drawn**; a CC0 library supplies only proportions and
parts.[^peeps]

# Backgrounds

Celebration screens, the path backdrop, empty states.

| Candidate | Page | Fit |
|---|---|---|
| Kenney Background Elements | [pack page](https://kenney.nl/assets/background-elements) | Base: hills, clouds, trees to recolour |
| Kenney Background Elements Remastered | [pack page](https://kenney.nl/assets/background-elements-redux) | Base: as above |
| OGA Sky gradients (used under its CC0 option) | [pack page](https://opengameart.org/content/sky-gradients) | Base: SVG gradients, recoloured |
| Glitch Background Assets | [pack page](https://opengameart.org/content/glitch-background-assets) | No: painted style |

A training-themed backdrop (pitch stripes, goal-box lines, a net pattern) has no CC0
match. **Draw it** as a light SVG pattern from the tokens.[^oga]

[^kenney]: Kenney UI, icon and game-art packs
[^peeps]: Open Peeps, Humaaans and Open Doodles
[^openclipart]: Openclipart and public-domain vector mirrors
[^oga]: OpenGameArt with the CC0 filter
[^progression]: Progression design decision
[^ux]: UX patterns decision
