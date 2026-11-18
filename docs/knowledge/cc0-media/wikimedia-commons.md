---
type: Research Finding
title: Wikimedia Commons, CC0 and public-domain files
description: Commons marks each file with its own licence template; its CC0 and public-domain drawings include a publisher's donated line art, sport pictograms and mirrored CC0 icons, while one government exercise set carries conflicting rights statements.
tags: [cc0-media, exercise-media, licensing, wikimedia-commons]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: cc-zero-cat, resource: "https://commons.wikimedia.org/wiki/Category:CC-Zero", title: "Commons, category of files tagged CC-Zero (checked 2026-11-18)" }
  - { id: reuse, resource: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia, title: Commons, reusing content outside Wikimedia }
  - { id: bodyweight-cat, resource: "https://commons.wikimedia.org/wiki/Category:Bodyweight_exercises", title: Commons, bodyweight exercises category }
  - { id: psf-pushup, resource: "https://commons.wikimedia.org/wiki/File:Push_up_(PSF).png", title: "Commons file, push-up line art (Pearson Scott Foresman, public domain)" }
  - { id: cdc-cat, resource: "https://commons.wikimedia.org/wiki/Category:CDC_strength_training_for_older_adults", title: Commons, CDC strength training for older adults category }
  - { id: cdc-squat, resource: "https://commons.wikimedia.org/wiki/File:Squat-CDC_strength_training_for_older_adults.gif", title: Commons file, chair squat animation (tagged public domain) }
  - { id: cdc-stacks, resource: https://stacks.cdc.gov/view/cdc/11447, title: "CDC Stacks record, Growing Stronger (rights: public domain)" }
  - { id: cdc-pdf, resource: https://www.cdc.gov/physicalactivity/downloads/growing_stronger.pdf, title: "Growing Stronger booklet, CDC-hosted copy" }
  - { id: pictogram, resource: "https://commons.wikimedia.org/wiki/File:Football_pictogram.svg", title: "Commons file, unofficial football pictogram (PD-user)" }
  - { id: pictogram-cat, resource: "https://commons.wikimedia.org/wiki/Category:Plain_black_SVG_sports_pictograms", title: Commons, plain black SVG sports pictograms }
  - { id: noun-jump-rope, resource: "https://commons.wikimedia.org/wiki/File:Jump_Rope_-_The_Noun_Project.svg", title: "Commons file, jump rope icon from the Noun Project (CC0)" }
  - { id: noun-cat, resource: "https://commons.wikimedia.org/wiki/Category:SVG_icons_from_The_Noun_Project", title: Commons, SVG icons from the Noun Project }
  - { id: pinhead-squat, resource: "https://commons.wikimedia.org/wiki/File:Person_squatting_Pinhead_icon.svg", title: "Commons file, person squatting Pinhead icon (CC0)" }
  - { id: line-art-cat, resource: "https://commons.wikimedia.org/wiki/Category:Line_art_of_exercise", title: Commons, line art of exercise }
  - { id: ai-cat, resource: "https://commons.wikimedia.org/wiki/Category:AI-generated_images", title: Commons, AI-generated images category }
---

# Licence as stated

- **Per file, always.** Commons has no site-wide licence; each file page carries its own template. The CC-Zero category alone holds close to ten million files, added by the template, and includes imports from Pixabay, Pexels, Unsplash and others.[^cc-zero-cat] Public-domain files use other templates (author's release, government work, expired copyright, too simple for copyright).
- **Reuse rules:** read the file's own page, credit the creator in the form asked, and know that the foundation gives no warranty that a licence is right.[^reuse]
- **AI:** Commons sorts AI-generated media into its own category tree, so a file page's categories show the flag when someone has added it.[^ai-cat] None of the candidates below carries it.
- **Date checked:** 2026-11-18, on each file page and through the Commons API that reads the same pages.

# What it has for this app

Searched: the bodyweight-exercise tree (push-ups, planks, squats, lunges, bridges, box jumps), exercise diagrams, line art of exercise, yoga diagrams, sport pictograms, goalkeeper icons, and title searches for each card.[^bodyweight-cat][^line-art-cat] Nearly every file in the exercise categories is a photo, or a drawing under CC BY-SA. The usable CC0 or public-domain families are:

| Family | Licence on the page | What fits | Notes |
|---|---|---|---|
| Pearson Scott Foresman donation | Released into the public domain by the publisher, permission on file[^psf-pushup] | A clean push-up line drawing; also sport scenes (high jump, handstand) | Single-weight line art; easy to trace into a flat figure. |
| Unofficial sport pictograms | PD-user or simple-shape public domain[^pictogram][^pictogram-cat] | Plain black sport figures (football, handball, gymnastics) | No exercise poses; useful for badges and section icons. |
| Noun Project icons mirrored as CC0 | CC0, per file[^noun-jump-rope][^noun-cat] | A jump-rope figure (a pogo reference), football icons | The Commons page is the licence source, not the Noun Project site. |
| Pinhead icons | CC0, per file[^pinhead-squat] | Tiny map icons: a person squatting, running, kicking a ball | Too small and generic for an exercise card. |
| CDC "Growing Stronger" animations | Tagged public domain as a US government work[^cdc-squat][^cdc-cat] | Chair squat, wall push-up, lunge, step-up: an older adult in flat cartoon style | **Rights conflict**, see below. |

## The conflicting set

The Commons pages tag the "Growing Stronger" animations as a federal work, and the CDC's own library lists the booklet's rights as public domain.[^cdc-squat][^cdc-stacks] A third-party summary of the booklet reports a 2002 university copyright notice that allows copying only unaltered and with credit, and names a commercial illustrator.[^cdc-pdf] That notice could not be read from the CDC copy in this session. Until a person reads the booklet's copyright page, these files are not used: they would be altered, and the source of their public-domain status is unclear.

# Verdict

**Passes, per file.** A Commons file qualifies when its own page states CC0 or a public-domain template, the source chain on that page is credible, it is a drawing rather than a photo of a real person, and it carries no AI flag. Imports from photo sites (Pixabay, Pexels, Unsplash) are photos and stay out. The CDC set waits for a person's ruling.

[^cc-zero-cat]: Commons, CC-Zero category
[^reuse]: Commons, reusing content outside Wikimedia
[^bodyweight-cat]: Commons, bodyweight exercises
[^psf-pushup]: Commons, push-up line art (Pearson Scott Foresman)
[^cdc-cat]: Commons, CDC strength training category
[^cdc-squat]: Commons, CDC chair squat animation
[^cdc-stacks]: CDC Stacks, Growing Stronger record
[^cdc-pdf]: Growing Stronger booklet, CDC copy
[^pictogram]: Commons, football pictogram
[^pictogram-cat]: Commons, plain black SVG sports pictograms
[^noun-jump-rope]: Commons, jump rope icon (Noun Project, CC0)
[^noun-cat]: Commons, SVG icons from the Noun Project
[^pinhead-squat]: Commons, person squatting Pinhead icon
[^line-art-cat]: Commons, line art of exercise
[^ai-cat]: Commons, AI-generated images category
