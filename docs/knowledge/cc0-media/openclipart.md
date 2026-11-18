---
type: Research Finding
title: Openclipart and public-domain vector mirrors
description: Openclipart's site-wide CC0 release, its provenance flag, candidate files for trophy, flame, star, medal and rest-day art, and why mirrors such as FreeSVG and Public Domain Vectors are used only to find files.
tags: [cc0-media, openclipart, clipart, provenance, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T05:50:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: share, resource: https://openclipart.org/share, title: "Openclipart licence and sharing page (checked 2026-11-18)" }
  - { id: trophy-emoji, resource: https://openclipart.org/detail/328728/trophy-emoji, title: "Openclipart: Trophy Emoji, flat shaded cup with white outline (checked 2026-11-18)" }
  - { id: trophy, resource: https://openclipart.org/detail/240941/trophy, title: "Openclipart: Trophy, traced remix (checked 2026-11-18)" }
  - { id: first-place, resource: https://openclipart.org/detail/332033/1st-place-trophy, title: "Openclipart: 1st Place Trophy (seen in search, 2026-11-18)" }
  - { id: fire-icon, resource: https://openclipart.org/detail/2242/fire-icon, title: "Openclipart: Fire Icon, copied from a Wikimedia Commons file (checked 2026-11-18)" }
  - { id: fire-ball, resource: https://openclipart.org/detail/29629/fire-ball-icon, title: "Openclipart: Fire Ball Icon, gradient flame in a circle (checked 2026-11-18)" }
  - { id: fire-pictogram, resource: https://openclipart.org/detail/211413/fire, title: "Openclipart: Fire pictogram (seen in search, 2026-11-18)" }
  - { id: star, resource: https://openclipart.org/detail/95431/star, title: "Openclipart: Star, shaded (seen in search, 2026-11-18)" }
  - { id: medal, resource: https://openclipart.org/detail/50221/medal, title: "Openclipart: Medal with star and band (seen in search, 2026-11-18)" }
  - { id: moon-outlines, resource: https://openclipart.org/detail/224735/moon-outlines, title: "Openclipart: Moon (outlines), made for small icon sizes (seen in search, 2026-11-18)" }
  - { id: pdv, resource: https://publicdomainvectors.org/, title: "Public Domain Vectors home page and licence claim (checked 2026-11-18)" }
  - { id: freesvg, resource: https://freesvg.org/vector-clip-art-of-shiny-trophy, title: "FreeSVG: a public-domain trophy listing (seen in search, 2026-11-18)" }
  - { id: cc0, resource: https://creativecommons.org/publicdomain/zero/1.0/, title: CC0 1.0 Universal deed }
---

# Summary

Openclipart releases everything under CC0 and has a file for almost any object, but it
is many artists in many styles, and some uploads copy work from elsewhere. It is a source
of single shapes to redraw, not a family to use as is.

# Licence (checked 2026-11-18)

- The sharing page says all clipart is released into the public domain under CC0 1.0,
  that each artist releases all rights, that commercial use is allowed and that no
  citation is needed.[^share][^cc0]
- Item pages do not repeat a licence; they link the site-wide "100% Public Domain"
  page.[^trophy-emoji][^fire-icon]
- A `pd_issue` flag marks items whose provenance or licence is in doubt.[^share] Such
  items are not used.
- **Provenance check per file:** some uploads are copies. The "Fire Icon", for example,
  says it is unedited from a Wikimedia Commons file, so its licence is whatever that
  Commons file says, not Openclipart's.[^fire-icon] A remix is checked back to its
  first source too ("Trophy Emoji" is a remix of another cup drawing).[^trophy-emoji]

# Candidates found

| Need | File | Style | Note |
|---|---|---|---|
| Trophy | Trophy Emoji[^trophy-emoji] | Flat shaded cup with a white outline | Closest to a flat icon style; remix chain to check |
| Trophy | Trophy[^trophy] | Traced from a raster, halftone tags | Too detailed; not a fit |
| Trophy | 1st Place Trophy and its siblings[^first-place] | Flat | Refused: a placing number implies ranking, which the progression Decision refuses |
| Streak flame | Fire pictogram[^fire-pictogram] | Simple pictogram | A shape to redraw |
| Streak flame | Fire Ball Icon[^fire-ball] | Gradient flame in a circle | Gradients clash with flat tokens |
| Streak flame | Fire Icon[^fire-icon] | Icon | Licence comes from the Commons original; check it there |
| XP star | Star[^star] | Shaded | Shading must go |
| Level badge | Medal[^medal] | Medal with a star and band | A shape reference only |
| Rest-day marker | Moon (outlines)[^moon-outlines] | Simple outline, drawn for small sizes | Closest CC0 base for a rest marker |

# Mirrors and aggregators

- **Public Domain Vectors** labels everything "Public Domain (CC0)" but shows no author or
  origin per file.[^pdv]
- **FreeSVG** hosts many Openclipart files and others labelled public domain.[^freesvg]
- Both are used only to find a file. The licence is taken from the file's original page,
  never from a mirror; a file with no traceable origin is not used.

# Related

- [Shortlist](/cc0-media/shortlist.md) and [recommendation](/cc0-media/recommendation.md).

[^share]: Openclipart licence and sharing page
[^trophy-emoji]: Openclipart, Trophy Emoji
[^trophy]: Openclipart, Trophy
[^first-place]: Openclipart, 1st Place Trophy
[^fire-icon]: Openclipart, Fire Icon
[^fire-ball]: Openclipart, Fire Ball Icon
[^fire-pictogram]: Openclipart, Fire pictogram
[^star]: Openclipart, Star
[^medal]: Openclipart, Medal
[^moon-outlines]: Openclipart, Moon (outlines)
[^pdv]: Public Domain Vectors
[^freesvg]: FreeSVG trophy listing
[^cc0]: CC0 1.0 Universal
