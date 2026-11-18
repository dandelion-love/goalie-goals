---
type: Research Finding
title: Sound levels and audio-visual sync
description: Loudness normalisation and a true-peak ceiling keep a set of short cues even, and broadcast research gives the window in which a sound and its visual event feel simultaneous; both can be measured from files and timestamps, without listening.
tags: [quality, sound, audio, latency, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
sources:
  - { id: r128, resource: https://tech.ebu.ch/publications/r128, title: "EBU R 128: Loudness normalisation and permitted maximum level of audio signals" }
  - { id: bt1359, resource: https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf, title: "ITU-R BT.1359-1 (1998): Relative timing of sound and vision for broadcasting" }
  - { id: ffmpeg-astats, resource: https://ffmpeg.org/ffmpeg-filters.html#astats, title: "FFmpeg filters documentation: astats" }
  - { id: hig-audio, resource: https://developer.apple.com/design/human-interface-guidelines/playing-audio, title: "Apple Human Interface Guidelines: Playing audio" }
  - { id: audio-control, resource: https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html, title: "W3C: Understanding SC 1.4.2 Audio Control" }
  - { id: sensory, resource: https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html, title: "W3C: Understanding SC 1.3.3 Sensory Characteristics" }
---

# Even loudness

Broadcast practice normalises programmes to a common loudness and caps the true peak at
-1 dBTP, so the listener never reaches for the volume between items.[^r128] A set of
interface cues has the same need: a quiet "rest over" next to a loud "session done"
reads as a bug. Very short cues are too brief for programme-loudness measurement, so for
them the practical check is each file's RMS and peak level, which FFmpeg's `astats`
filter prints.[^ffmpeg-astats]

# Sync with the visual event

ITU-R BT.1359 reports that people detect sound-vision misalignment when sound leads the
picture by more than about 45 ms or lags it by more than about 125 ms, and find it
unacceptable beyond about 90 ms early or 185 ms late.[^bt1359] Late sound is tolerated
more than early sound.

# Control and redundancy

- Respect the device's silent and volume settings.[^hig-audio] Audio that plays for more
  than 3 seconds needs a way to pause it or set its volume.[^audio-control]
- Instructions never rely on sound alone.[^sensory]

# How it applies to a two-person training app

- Cues mark start, switch, rest and stop for a keeper who may not be looking at the
  screen; their meaning is in the timing, so a cue that lands late against the visual
  countdown is worse than no cue.
- A cue's play time can be logged in the page (the moment the app calls the audio API)
  and compared with the moment the screen changes; this measures the app's scheduling,
  not the speaker.
- Loudness and peak are measured on the cue files in the repo, so the result does not
  depend on a room, a microphone or a recording of anyone.
- Haptics are unavailable in Safari on iPadOS (see
  [haptics](/platform/haptics-availability.md)), so sound and visuals carry all feedback.

[^r128]: EBU R 128.
[^bt1359]: ITU-R BT.1359-1.
[^ffmpeg-astats]: FFmpeg filters documentation, astats.
[^hig-audio]: Apple HIG, Playing audio.
[^audio-control]: W3C, Understanding SC 1.4.2.
[^sensory]: W3C, Understanding SC 1.3.3.
