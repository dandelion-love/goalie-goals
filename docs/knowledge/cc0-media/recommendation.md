---
type: Recommendation
title: One style for reward and path art
description: Use Kenney's CC0 packs as the single base family, redrawn as SVG in the app's own tokens, fill the gaps with drawn art in the same rules, and draw an original coach; no attribution duty, no league or store art.
tags: [cc0-media, recommendation, rewards, lesson-path, coach, clean-room]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T05:50:00Z }
sources:
  - { id: shortlist, resource: /cc0-media/shortlist.md, title: CC0 art shortlist for rewards and the path }
  - { id: kenney, resource: /cc0-media/kenney.md, title: Kenney UI, icon and game-art packs }
  - { id: peeps, resource: /cc0-media/open-peeps-and-related-sets.md, title: "Open Peeps, Humaaans and Open Doodles" }
  - { id: openclipart, resource: /cc0-media/openclipart.md, title: Openclipart and public-domain vector mirrors }
  - { id: oga, resource: /cc0-media/opengameart-cc0.md, title: OpenGameArt with the CC0 filter }
  - { id: near-misses, resource: /cc0-media/non-cc0-near-misses.md, title: Open art that is not CC0 }
  - { id: progression, resource: /decisions/progression-design.md, title: Progression design decision }
  - { id: ux, resource: /decisions/ux-patterns.md, title: UX patterns decision }
  - { id: media, resource: /decisions/exercise-media.md, title: Exercise media decision }
  - { id: storage, resource: /exercise-media/storage-format.md, title: Media storage format and metadata }
  - { id: figures, resource: /exercise-media/drawn-and-generated-figures.md, title: Drawn and generated figures }
  - { id: tone, resource: /ux/character-and-tone.md, title: Character and tone }
  - { id: wcag-contrast, resource: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html, title: "W3C: Understanding WCAG 2.2 success criterion 1.4.11 Non-text Contrast" }
---

# Recommendation

**CC0 bases restyled to the app's tokens, with Kenney as the one base family.** Kenney's
packs are the only CC0 source with one hand across icons, medals, buttons, map paths and
backgrounds, and its single-colour glyphs recolour without redrawing.[^kenney] Everything
else (Openclipart, OpenGameArt, the people libraries) is used only as a shape base where
Kenney has a gap, and is redrawn so nothing looks borrowed.[^shortlist]

Using any one CC0 family as is was rejected: Kenney lacks a flame, a rest marker, skill
emblems and a coach; Openclipart and OpenGameArt mix many styles; the Glitch art is
painted, not flat.[^openclipart][^oga]

# The style rules every reward and path asset follows

1. **SVG only**, cleaned of metadata, as the storage rules require; a raster base (Kenney
   Medals) is traced, not shipped.[^storage]
2. **Colour from tokens.** Fills use `currentColor` or CSS custom properties, so one file
   serves light and dark themes. The current tokens (`--brand`, `--accent`, `--surface`,
   `--text`, `--muted`) get a small reward set added in the design story, for example
   `--reward-flame`, `--reward-star`, `--reward-rest`; their values are the owner's call.
3. **Shapes:** rounded corners and joins, one stroke weight per size, flat fills, no
   gradients or bevels; matching the thick-stroke, flat-fill rule of the app's own
   exercise figure and the app's own visual language.[^figures][^ux]
4. **Contrast:** every glyph keeps at least 3:1 against its background, the non-text
   contrast minimum, and a state is never shown by colour alone (rest, done and today also
   differ by glyph).[^wcag-contrast]
5. **Allowed rewards only:** streak flame, stars for session credit and form, technique
   level badges, milestone trophies and badges, path nodes, rest and pause markers. No
   league, podium, placing number, leaderboard glyph, coin, gem, chest or store art.[^progression]

# What comes from where

| Item | Base | Work |
|---|---|---|
| Streak flame | None in Kenney; Openclipart fire pictogram as a shape base | **Draw** |
| Star | Kenney Game Icons star | Recolour |
| Level badges | Kenney Medals (flat), traced; UI Pack round frames | Trace and recolour; **draw** four skill-area emblems |
| Trophy | Kenney Game Icons trophy | Recolour |
| Path nodes | Kenney UI Pack round buttons; Game Icons check mark, play, lock | **Draw** the node in SVG; place Kenney glyphs inside |
| Rest-day marker | Openclipart moon outline as a shape base | **Draw** |
| Backgrounds | Kenney Background Elements for hills and sky | Recolour; **draw** the training backdrop (pitch stripes, goal-box lines, net) |
| Celebration sparkle | Kenney Particle Pack stars and flames | Use as soft effect textures, tinted |
| Coach | Open Peeps parts for proportion and pose | **Draw** an original character |

# Must be drawn, because no CC0 option fits

- The **streak flame** icon (Kenney has none; Openclipart flames are gradients or of
  uncertain origin).
- The **skill-area emblems** for level badges (no goalkeeper art in any CC0 set).
- The **rest-day and pause markers** (no flat CC0 glyph that reads as "rest kept").
- The **path node** in its states (simple enough that drawing is faster than adapting).
- The **training backdrop**.
- The **coach character**.

# The coach, if made

The character is the app's own, briefed on its own terms:[^tone][^peeps]

- **Who:** a human goalkeeping coach, adult, calm and encouraging; speaks in short cues
  ("eyes on the ball", "good call stopping there").
- **Shape:** a tall, simple figure built from a few rounded shapes, with a cap, a whistle
  on a cord and oversized keeper gloves as its signature parts.
- **Colour:** a warm kit colour that stands apart from the app's greens, from the reward
  token set.
- **Expressions:** neutral, pleased, proud, thoughtful. No sad, pleading, scolding or
  sulking face is drawn, so none can be used.
- **Build:** start from Open Peeps proportions and parts, then redraw in the style rules
  above, so the result is not recognisable as stock art.
- **Clean room:** briefed and reviewed without reference to any other app's characters;
  the reviewer's resemblance read (AC4) happens on the drawings before they are committed.

# Provenance and credits

- Every asset gets a credits-manifest entry: base pack or file page, author, CC0, the
  changes made, and the date checked. CC0 needs no credit; the entry keeps provenance.[^media]
- Openclipart files are checked for the provenance flag and remix chain; a file copied
  from elsewhere takes the original's licence.[^openclipart]
- OpenMoji (CC BY-SA 4.0) stays the fallback for any glyph not yet redrawn, under the
  media Decision's credit rule.[^near-misses][^media]

# Undo

All of this is reversible: a glyph swaps by replacing one SVG file, and the tokens change
in one stylesheet. If the owner prefers ready-made art over drawing, the fallback is
OpenMoji for the playful glyphs, which brings its credit and share-alike duty.

[^shortlist]: CC0 art shortlist
[^kenney]: Kenney packs
[^peeps]: Open Peeps, Humaaans and Open Doodles
[^openclipart]: Openclipart and mirrors
[^oga]: OpenGameArt with the CC0 filter
[^near-misses]: Open art that is not CC0
[^progression]: Progression design decision
[^ux]: UX patterns decision
[^media]: Exercise media decision
[^storage]: Media storage format and metadata
[^figures]: Drawn and generated figures
[^tone]: Character and tone
[^wcag-contrast]: WCAG 2.2, 1.4.11 Non-text Contrast
