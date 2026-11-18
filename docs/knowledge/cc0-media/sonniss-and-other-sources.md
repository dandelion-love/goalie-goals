---
type: Research Finding
title: Sonniss and other free sound sources
description: Sonniss's free GDC bundles and Pixabay's sound library are free to use but not CC0, and both forbid passing on the raw files, so neither can go in this public repo; sounds the app makes itself are the other open option.
tags: [cc0-media, sound, licensing, rejected]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:05:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: sonniss-gdc, resource: https://sonniss.com/gameaudiogdc, title: "Sonniss: GDC game audio bundle page and FAQ" }
  - { id: sonniss-licence, resource: https://sonniss.com/gdc-bundle-license/, title: "Sonniss: GDC bundle licence" }
  - { id: pixabay-licence, resource: https://pixabay.com/service/license-summary/, title: "Pixabay: content licence summary" }
  - { id: mdn-oscillator, resource: https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode, title: "MDN: OscillatorNode (Web Audio API)" }
---

# Sonniss GDC game audio bundles: rejected

Checked on 2026-11-18 (UTC).

- The bundles are royalty free, commercially usable and need no attribution, but the
  page describes a licence, not a public-domain dedication, and limits use to media
  production. Use for AI or machine-learning training is prohibited.[^sonniss-gdc]
- The licence says the licensee may not distribute, publish, sub-license or otherwise
  supply the sounds as sound effects to anyone else, including inside an asset pack or a
  software development kit, and edited sounds stay licensed material. Sharing is allowed
  within the licensee's own team.[^sonniss-licence]
- A public repository hands the raw files to anyone who clones it, which is supplying
  them as sound effects. So Sonniss files cannot be committed here, and the licence does
  not allow redistribution in an open repo without written permission. **Not used.**

# Pixabay sound effects: rejected

- Pixabay uses its own Content Licence, not CC0. It allows free use without attribution
  but forbids selling or distributing content on a standalone basis, meaning in
  substantially the same form as on the site.[^pixabay-licence]
- A trimmed cue in a public repo is close to the downloaded file, so it is at risk of
  being standalone distribution. **Not used.**

# Sounds made for the app

- The simplest cues (a countdown beep, a switch tick) can be synthesised in the browser
  with an oscillator and a short gain envelope through the Web Audio API, so no file
  and no third-party licence is needed.[^mdn-oscillator]
- Such cues are the app's own work and fall under the repo's own licence; they follow the
  same loudness rules as files (see [stored format](/cc0-media/sound-format.md)).
- This is the fallback for any moment with no good CC0 file, and an option for the
  3-2-1 count, where a beep per second stays in step with the visual timer.

[^sonniss-gdc]: Sonniss, GDC bundle page and FAQ
[^sonniss-licence]: Sonniss, GDC bundle licence
[^pixabay-licence]: Pixabay, content licence summary
[^mdn-oscillator]: MDN, OscillatorNode
