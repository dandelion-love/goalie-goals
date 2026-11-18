---
type: Reference
title: Stored format for sound cues
description: Cues are stored as mono Opus in Ogg, at most 50 KB each, loudness-normalised in three levels, with all metadata stripped, and decoded into Web Audio after the Start tap that unlocks sound on the iPad.
tags: [cc0-media, sound, format, loudness, metadata, ipados, autoplay]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:25:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: webkit-184, resource: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/, title: "WebKit Features in Safari 18.4" }
  - { id: caniuse-opus, resource: https://caniuse.com/opus, title: "Can I use: Opus audio format" }
  - { id: mdn-codecs, resource: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs, title: "MDN: Web audio codec guide" }
  - { id: itu-2434, resource: https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2434-2018-PDF-E.pdf, title: "ITU-R Report BS.2434: loudness for audio streaming and network file playback" }
  - { id: itu-1770, resource: https://www.itu.int/rec/R-REC-BS.1770, title: "ITU-R BS.1770: algorithms to measure programme loudness and true-peak level" }
  - { id: ffmpeg-filters, resource: https://ffmpeg.org/ffmpeg-filters.html, title: "FFmpeg filters documentation (loudnorm, atrim, afade)" }
  - { id: ffmpeg-main, resource: https://ffmpeg.org/ffmpeg.html, title: "FFmpeg documentation (map_metadata, bitexact)" }
  - { id: howler, resource: https://github.com/goldfire/howler.js, title: "howler.js (MIT)" }
  - { id: autoplay, resource: /platform/audio-video-autoplay.md, title: "Audio and video autoplay rules on iPadOS Safari" }
  - { id: frontend, resource: /decisions/frontend-approach.md, title: "Front-end approach (minimum iPadOS 18.4)" }
  - { id: offline, resource: /platform/offline-storage-and-service-workers.md, title: "Service workers and offline storage limits on iPadOS" }
  - { id: media-format, resource: /exercise-media/storage-format.md, title: "Media storage format and metadata" }
---

# Format

| Property | Value | Why |
| --- | --- | --- |
| Codec and container | Opus in Ogg, file extension `.ogg`, served as `audio/ogg` | Safari 18.4 adds Ogg container support for Opus and Vorbis;[^webkit-184] the support table lists Opus as supported from iOS 18.4.[^caniuse-opus] 18.4 is the app's minimum iPadOS.[^frontend] |
| Channels and rate | mono, 48 kHz | Cues play from one iPad speaker; mono halves the size. Opus works at 48 kHz internally. |
| Bit rate | 48 kbps VBR | About 6 KB per second, so a 4 s cue stays under 30 KB. |
| Length | at most 1 s for functional cues, 2.5 s for rest and safety stop, 4 s for session done | Short cues keep timing tight and match the UX rule of short celebrations. |
| Size budget | at most **50 KB per file**, at most 300 KB for all cues | All cues are precached by the service worker and decoded at session start, so a session works offline.[^offline] |

**Fallback: MP3.** MDN's codec guide still says Safari plays Opus only in a CAF file,[^mdn-codecs]
which predates Safari 18.4. Before the first cue is adopted, check on an iPad at the
minimum version that an Ogg Opus file decodes through Web Audio, not just in an `<audio>`
element. If it does not, encode the same masters as mono MP3 at 96 kbps: Safari has
played MP3 since version 3.1 and the format is now patent-free.[^mdn-codecs]

**Why not AAC:** AAC in `.m4a` is the most widely supported choice, but the privacy guard
refuses `.m4a`, `.aac`, `.wav` and `.caf` as possible voice recordings. Opus and MP3 keep
the guard as it is. Changing that rule would need its own PR with a test.

# Loudness

Three levels, so the app sounds the same from one cue to the next and calm moments stay
calm.

| Group | Moments | Target | True peak |
| --- | --- | --- | --- |
| Functional cues | start, 3-2-1, switch, set done | -16 LUFS | at most -2 dBTP |
| Celebration | XP gain, session done | -18 LUFS (never louder than the cues) | at most -2 dBTP |
| Calm | rest, pause, safety stop | -22 LUFS | at most -2 dBTP |

- The streaming guidance sets a -16 to -20 LKFS range with a -1 dBTP ceiling;[^itu-2434]
  the ceiling here is 1 dB lower to leave room for the lossy encoder.
- Loudness is measured to ITU-R BS.1770, which gates on 400 ms blocks.[^itu-1770] Files
  shorter than that (most Kenney cues) are peak-normalised to -2 dBTP and then matched by
  ear against a calibrated cue of the same group.
- The app plays every cue through one gain stage with a master volume and a mute, so the
  parent can turn the whole set down without touching the files.

# Making a stored file

One command per cue, from the downloaded original (which is not committed):[^ffmpeg-filters][^ffmpeg-main]

```bash
ffmpeg -i original.wav \
  -af "atrim=0:2.5,afade=t=out:st=1.5:d=1,loudnorm=I=-22:TP=-2:LRA=7,aresample=48000" \
  -ac 1 -c:a libopus -b:a 48k -vbr on \
  -map_metadata -1 -map_chapters -1 -fflags +bitexact -flags:a +bitexact \
  content/sounds/safety-stop.ogg
```

- `atrim` and `afade` cut the cue and end it without a click; `loudnorm` sets the level
  (use its two-pass mode for accuracy); `aresample` brings the rate back to 48 kHz.
- `-map_metadata -1` drops every tag and `bitexact` drops the encoder version string.
  Source files can carry broadcast-wave or iXML chunks with recorder, date or place
  fields; none of them reach the stored file. The Opus stream keeps only its required
  vendor string.
- A content check fails a sound file with comment tags beyond the vendor string, over
  50 KB, or with no credits entry, as the image check does for SVG and WebP.[^media-format]

# Where files live

`content/sounds/<moment>.ogg`, one per moment, each with an entry in
`content/credits.json`: title, author as the source page names them, the page URL,
`CC0-1.0`, the date the licence was checked, and the changes made (trimmed, faded,
normalised, mono). Original cues the app synthesises have no file.

# How it fits the iPad autoplay rules

1. The keeper taps **Start session**. In that tap the app resumes one `AudioContext` and
   plays a silent buffer, which unlocks sound for the session.[^autoplay]
2. Right after, it decodes every cue (all precached, under 300 KB) into audio buffers, so
   no cue waits on the network or on decoding when it is due.
3. Timers play cues as buffer sources on that context; howler.js does this through Web
   Audio and can be given a list of formats (Ogg first, MP3 second) to pick the first the
   browser can play.[^howler]
4. If the context is suspended (the app was hidden, or audio was refused), cues switch to
   the visual fallback and a "tap for sound" chip appears; nothing depends on hearing a
   cue.[^autoplay]

[^webkit-184]: WebKit blog, Safari 18.4 features
[^caniuse-opus]: Can I use, Opus
[^mdn-codecs]: MDN, Web audio codec guide
[^itu-2434]: ITU-R Report BS.2434
[^itu-1770]: ITU-R BS.1770
[^ffmpeg-filters]: FFmpeg filters documentation
[^ffmpeg-main]: FFmpeg documentation
[^howler]: howler.js
[^autoplay]: Audio and video autoplay rules on iPadOS Safari
[^frontend]: Front-end approach decision
[^offline]: Service workers and offline storage on iPadOS
[^media-format]: Media storage format and metadata
