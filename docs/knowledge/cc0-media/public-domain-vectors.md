---
type: Research Finding
title: Public Domain Vectors and FreeSVG
description: Two sister sites that label every image CC0 but give no author, origin or AI note per file, and re-host Openclipart files; they fail as a source of record.
tags: [cc0-media, exercise-media, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: pdv-home, resource: https://publicdomainvectors.org/, title: "Public Domain Vectors, home page (checked 2026-11-18)" }
  - { id: pdv-pd, resource: https://publicdomainvectors.org/en/public-domain, title: "Public Domain Vectors, public domain page" }
  - { id: pdv-about, resource: https://publicdomainvectors.org/en/about-us, title: Public Domain Vectors, about page }
  - { id: freesvg-about, resource: https://freesvg.org/pages/about-us, title: FreeSVG, about page }
  - { id: freesvg-terms, resource: https://freesvg.org/pages/terms-and-conditions, title: FreeSVG, terms and conditions }
  - { id: pdv-plank, resource: https://publicdomainvectors.org/en/free-clipart/Woman-in-a-plank-pose/92822.html, title: "Public Domain Vectors file, woman in a plank pose (2026)" }
  - { id: pdv-save, resource: https://publicdomainvectors.org/en/free-clipart/Goalkeeper-making-a-save/91492.html, title: "Public Domain Vectors file, goalkeeper making a save (2024)" }
  - { id: pdv-gk-2015, resource: https://publicdomainvectors.org/en/free-clipart/Goalkeeper-silhouette-vector-drawing/22386.html, title: "Public Domain Vectors file, goalkeeper silhouette (2015, tagged openclipart)" }
  - { id: openclipart, resource: /cc0-media/openclipart-figures.md, title: Openclipart }
---

# Licence as stated

- **Public Domain Vectors:** the home page says every image is released under CC0, with no attribution required; the public-domain page repeats it and welcomes a link back.[^pdv-home][^pdv-pd] Each file page shows "Public Domain" and the same sentence.[^pdv-plank]
- **FreeSVG:** run by the same administrators, CC0 for all images; its terms add that CC0 grants no right to trademarks or to recognisable people shown in an image. Its first collection was about 55,000 files from Openclipart.[^freesvg-about][^freesvg-terms]
- **Per file:** the licence label is the same on every file, but no file page names an author or an original source, and the about page does not say where images come from.[^pdv-about][^pdv-save]
- **AI:** no page mentions AI-generated images, and files carry no AI flag.[^pdv-home][^pdv-pd]
- **Date checked:** 2026-11-18.

# What it has for this app

A goalkeeper search returned silhouettes, among them a "goalkeeper making a save" uploaded in 2024 and a "football goalkeeper silhouette" uploaded in 2026, and a plank search returned a "woman in a plank pose" uploaded in 2026, all without an author.[^pdv-save][^pdv-plank] An older goalkeeper silhouette from 2015 carries an `openclipart` tag and matches an Openclipart file, again without credit.[^pdv-gk-2015][^openclipart]

# Verdict

**Fails as a source of record.** CC0 needs someone with the right to waive it. With no author, no origin and recent uploads that could be machine-generated, a file's CC0 label cannot be checked back to anyone. Where a file is a copy of an Openclipart upload, the Openclipart page is used instead.[^openclipart]

[^pdv-home]: Public Domain Vectors, home page
[^pdv-pd]: Public Domain Vectors, public domain page
[^pdv-about]: Public Domain Vectors, about page
[^freesvg-about]: FreeSVG, about page
[^freesvg-terms]: FreeSVG, terms and conditions
[^pdv-plank]: Public Domain Vectors, woman in a plank pose
[^pdv-save]: Public Domain Vectors, goalkeeper making a save
[^pdv-gk-2015]: Public Domain Vectors, goalkeeper silhouette (2015)
[^openclipart]: Openclipart
