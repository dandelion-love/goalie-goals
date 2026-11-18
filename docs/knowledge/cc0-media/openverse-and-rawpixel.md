---
type: Research Finding
title: Openverse and the sites it surfaces
description: Openverse's CC0 filter finds candidates but does not verify licences; on the date checked its API mostly timed out, and the CC0 hits it returned came from Commons and from rawpixel, which could not be verified.
tags: [cc0-media, exercise-media, licensing, openverse]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: ov-tos, resource: https://docs.openverse.org/terms_of_service.html, title: "Openverse terms of service (checked 2026-11-18)" }
  - { id: ov-about, resource: https://openverse.org/about, title: Openverse about page }
  - { id: ov-api, resource: https://api.openverse.org/v1/, title: Openverse API }
  - { id: rawpixel-pdr, resource: https://publicdomainreview.org/collections/source/rawpixel/, title: "Public Domain Review, rawpixel as a source" }
  - { id: commons, resource: /cc0-media/wikimedia-commons.md, title: Wikimedia Commons, CC0 and public-domain files }
---

# Licence as stated

- **Openverse:** it does not own the content, does not verify licensing, and makes no promise about it; users must check their right to use a work themselves and follow the hosting site's terms.[^ov-tos][^ov-about]
- **Per file:** every hit is only as good as the page it points to, so the licence is always read on the source page.[^ov-tos]
- **AI:** Openverse shows no AI field of its own.
- **Date checked:** 2026-11-18.

# What happened when searching

- The API's CC0 filter was tried for plank, push-up, squat, goalkeeper, glute bridge, side plank, lunge, jumping and medicine ball. Most calls returned gateway time-outs; the rest returned no exercise drawings.[^ov-api] The web search page refused an automated read.
- The CC0 hits it did return came from Wikimedia Commons (covered on its own page) and from rawpixel, including a cartoon goalkeeper.[^commons]
- **rawpixel:** offers some images as CC0 (often scans of public-domain art) beside a paid licence for others.[^rawpixel-pdr] Its file pages refused an automated read, downloads need an account, and its licence and any AI note could not be read on the source page. So no rawpixel file is a candidate here.

# Verdict

**A search tool, not a source.** Openverse is used, when it works, only to find candidates. A candidate counts when the source page itself states CC0 or public domain, which keeps the rule already in the exercise-media decision. rawpixel **fails** for this app until its file pages can be read and its terms checked.

[^ov-tos]: Openverse terms of service
[^ov-about]: Openverse about page
[^ov-api]: Openverse API
[^rawpixel-pdr]: Public Domain Review, rawpixel as a source
[^commons]: Wikimedia Commons, CC0 and public-domain files
