---
type: Research Finding
title: Kenney audio packs
description: Kenney's ten audio packs are CC0 by the pack page and by the licence file in each pack; Interface Sounds, Digital Audio, Music Jingles and UI Audio hold short cues that fit the app.
tags: [cc0-media, sound, kenney, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T05:50:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: kenney-audio, resource: "https://kenney.nl/assets/category:Audio", title: "Kenney: audio assets" }
  - { id: kenney-support, resource: https://kenney.nl/support, title: "Kenney: support and licence questions" }
  - { id: kenney-interface, resource: https://kenney.nl/assets/interface-sounds, title: "Kenney: Interface Sounds" }
  - { id: kenney-digital, resource: https://kenney.nl/assets/digital-audio, title: "Kenney: Digital Audio" }
  - { id: kenney-jingles, resource: https://kenney.nl/assets/music-jingles, title: "Kenney: Music Jingles" }
  - { id: kenney-ui, resource: https://kenney.nl/assets/ui-audio, title: "Kenney: UI Audio" }
  - { id: oga-interface, resource: https://opengameart.org/content/interface-sounds, title: "OpenGameArt: Interface Sounds by Kenney (mirror of the pack)" }
  - { id: mirror-interface, resource: https://github.com/Calinou/kenney-interface-sounds, title: "Kenney Interface Sounds repackaged as WAV, with the pack's licence file" }
  - { id: mirror-ui, resource: https://github.com/Calinou/kenney-ui-audio, title: "Kenney UI Audio repackaged as WAV" }
  - { id: mirror-jingles, resource: https://github.com/Boyquotes/kenney-music-jingles-for-godot, title: "Kenney Music Jingles repackaged, Ogg files" }
  - { id: mirror-digital, resource: https://github.com/Boyquotes/kenney-digital-audio-for-godot, title: "Kenney Digital Audio repackaged, Ogg files" }
---

# Licence

Checked at the source pages on 2026-11-18 (UTC).

- Every audio pack page states **Creative Commons CC0**.[^kenney-interface][^kenney-digital][^kenney-jingles][^kenney-ui]
- Kenney's support page: the assets are public domain (CC0), free in commercial projects,
  and attribution is not required, though welcome. It points to the licence file in each
  pack for the exact terms.[^kenney-support]
- The licence file shipped in Interface Sounds names Kenney as creator, states CC0 1.0
  with the deed link, and says crediting is optional.[^mirror-interface]
- **Per file:** a Kenney pack is one work by one author with one licence file, so the
  licence of each file is the pack's. Still record the pack page and the licence file in
  the credits entry of every file adopted, and re-check the pack page at adoption.

# Packs and what they hold

| Pack | Files | Released | Fit |
| --- | --- | --- | --- |
| Interface Sounds[^kenney-interface] | 100 Ogg | 2020 | Confirmation, glass, pluck, toggle, minimize and maximize cues: the main source for switch, set done and pause. |
| Digital Audio[^kenney-digital] | 60 Ogg | 2012 | Synth tones, two- and three-tone cues, power-ups: XP gain and switch. Many are laser and sci-fi sounds that do not fit. |
| Music Jingles[^kenney-jingles] | 85 Ogg | 2014 | Very short stings in five families (8-bit, hit, pizzicato, sax, steel drum): set done and short session-done candidates. |
| UI Audio[^kenney-ui] | 50 Ogg | 2012 | Clicks, rollovers and switches: button feedback only. |
| Impact, RPG, Sci-fi, Casino, two Voiceover packs[^kenney-audio] | - | - | Not suited to training cues; the voiceover packs are game announcer voices, out of scope. |

# Lengths

The pack pages list no per-file lengths or formats. Lengths in the
[shortlist](/cc0-media/sound-shortlist.md) were measured from public repackaged copies of
the packs, which keep Kenney's file names and licence file:[^mirror-interface][^mirror-ui][^mirror-jingles][^mirror-digital]

- Interface Sounds copy: 16-bit mono WAV at 44.1 kHz, converted losslessly from the Ogg
  originals, so length is about bytes / 88,200.
- UI Audio copy: 16-bit stereo WAV at 44.1 kHz.
- Music Jingles and Digital Audio copies: Ogg Vorbis at 44.1 kHz (jingles stereo, digital
  mono); length read from the last Ogg page.

Take adopted files from Kenney's own zip (or its OpenGameArt mirror[^oga-interface]), not
from the repackaged copies, and measure again after trimming.

# Notes

- The Interface Sounds listing says the 100 Ogg files have normalised volume;[^oga-interface]
  the other packs say nothing. Across packs and sources, normalise as the
  [format concept](/cc0-media/sound-format.md) says.
- The jingles are generic stings, not themes; none is written to sound like any app.

[^kenney-audio]: Kenney, audio assets
[^kenney-support]: Kenney, support page
[^kenney-interface]: Kenney, Interface Sounds
[^kenney-digital]: Kenney, Digital Audio
[^kenney-jingles]: Kenney, Music Jingles
[^kenney-ui]: Kenney, UI Audio
[^oga-interface]: OpenGameArt, Interface Sounds mirror
[^mirror-interface]: Interface Sounds WAV copy and licence file
[^mirror-ui]: UI Audio WAV copy
[^mirror-jingles]: Music Jingles Ogg copy
[^mirror-digital]: Digital Audio Ogg copy
