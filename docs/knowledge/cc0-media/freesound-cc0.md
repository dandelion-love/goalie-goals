---
type: Research Finding
title: Freesound with a per-file CC0 check
description: Freesound licenses each sound separately (CC0, CC BY or CC BY-NC); the search filter finds CC0 candidates, but each file's own page, and the page of any sound it was made from, is the licence record.
tags: [cc0-media, sound, freesound, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T05:55:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: fs-faq, resource: https://freesound.org/help/faq/, title: "Freesound: frequently asked questions (licences)" }
  - { id: fs-search, resource: "https://freesound.org/search/?q=countdown+beep&f=license%3A%22Creative+Commons+0%22", title: "Freesound: example search with the CC0 licence filter" }
  - { id: fs-gong, resource: https://freesound.org/people/qubodup/sounds/169289/, title: "Freesound: Gong Bell (a modified singing bowl), qubodup" }
  - { id: fs-bowl-source, resource: https://freesound.org/people/Monkay/sounds/48325/, title: "Freesound: SingingBowl.wav, Monkay (the source of the Gong Bell)" }
  - { id: fs-genai, resource: https://freesound.org/people/Okello2020/sounds/851185/, title: "Freesound: Message Received, Okello2020 (tagged GenAI)" }
---

# Licence model

Checked on 2026-11-18 (UTC).

- Each uploader picks one licence **per sound**: CC0, Attribution (CC BY) or Attribution
  NonCommercial (CC BY-NC). A legacy Sampling+ licence remains on some old sounds.[^fs-faq]
- The search page has a licence filter; "Creative Commons 0" narrows results to sounds
  whose page states CC0.[^fs-search] The filter shows what the uploader declared, nothing
  more, so it is a way to find candidates, not the record.
- **Derived sounds:** a sound made from a CC BY or CC BY-NC sound cannot be released as
  CC0, and the original author must be credited.[^fs-faq] A derivative marked CC0 is only
  safe if every source it lists is CC0 too.

# Rules for adopting a Freesound file

1. Open the sound's own page and copy the licence it states into the credits entry, with
   the page URL and the date checked.
2. If the page lists sources (a remix or an edit), open each source page and confirm CC0.
   Example: the Gong Bell candidate is an edit of another user's singing bowl recording;
   both pages state CC0.[^fs-gong][^fs-bowl-source]
3. Read the description and tags. Skip a sound tagged as AI-generated (for example
   "GenAI"[^fs-genai]) unless the owner accepts it: its provenance is unclear and the
   credits manifest records `ai_generated`.
4. Skip a sound whose description names a brand, a show or another product it imitates.
5. Download the original (WAV, FLAC or Ogg) for editing; the stored file is made from it
   as the [format concept](/cc0-media/sound-format.md) says, and the original is not
   committed.
6. Name the uploader in the credits entry even though CC0 does not require it.

# Fit

Strengths: a very large pool, real recordings (whistles, bells, singing bowls) as well
as designed game stings, and each page states length, format, sample rate and channels.
Weaknesses: quality and loudness vary from file to file, many CC0 files are long takes
that need trimming, and licences can only be trusted file by file.

Candidates found this way are in the [shortlist](/cc0-media/sound-shortlist.md).

[^fs-faq]: Freesound FAQ, licences
[^fs-search]: Freesound search with the CC0 filter
[^fs-gong]: Freesound, Gong Bell by qubodup
[^fs-bowl-source]: Freesound, SingingBowl.wav by Monkay
[^fs-genai]: Freesound, Message Received by Okello2020
