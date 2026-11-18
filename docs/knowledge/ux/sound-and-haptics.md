---
type: Research Finding
title: Sound and haptics
description: Short sounds and vibrations confirm actions and mark success; they must be sparse, meaningful and easy to turn off.
tags: [ux, sound, haptics, accessibility, clean-room]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: apple-haptics, resource: https://developer.apple.com/design/human-interface-guidelines/playing-haptics, title: "Apple Human Interface Guidelines: Playing haptics" }
  - { id: mdn-vibrate, resource: https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API, title: "MDN: Vibration API" }
  - { id: duo-visemes, resource: https://blog.duolingo.com/world-character-visemes, title: "Duolingo blog: character lip-sync with visemes" }
  - { id: ico-games, resource: https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2023/02/new-guidance-to-industry-issued-for-game-developers-on-protecting-children, title: "ICO: guidance for game developers on protecting children (2023)" }
---

# The pattern

Game-like learning apps play a short, distinct sound for correct, incorrect and session
complete, and on phones pair key moments with a vibration. Characters may speak.

# Evidence and rationale

- No public design write-up from the reference app on its sound or haptic design was
  found; its public material covers character speech and lip-sync only.[^duo-visemes]
  So this concept rests on platform guidance, not on the reference app's own evidence.
- Platform guidance: match a haptic's strength to the animation it accompanies, use
  standard feedback types (success, warning, selection), and use them sparingly because
  overuse confuses people and dilutes meaning.[^apple-haptics]
- On the web, the Vibration API is the only haptic channel; it is not available in every
  browser (notably not in Safari on iOS), so haptics can only ever be an extra, never the
  only signal.[^mdn-vibrate]
- Regulator tips for games played by children ask for break prompts and checkpoints
  without pressure to keep playing,[^ico-games] which rules out using sound as a lure
  back into play.

# Clean room (AC4)

The reference app's sounds and jingles are recognisable brand assets. They are not
described or imitated here. The mechanism is generic: "a short positive sound on
success, a soft neutral sound on a miss".

# Relevance to training

Training happens in a garden or living room, often with the phone propped up out of
reach. Audio cues (start, switch side, rest, stop) are therefore *functional*, more useful
than in a quiz app, and should be audible at a distance. Reward sounds stay short. Every
sound and haptic has a mute, and nothing important is conveyed by sound alone; see
[UX patterns decision](/decisions/ux-patterns.md).

[^apple-haptics]: Apple HIG, Playing haptics
[^mdn-vibrate]: MDN, Vibration API
[^duo-visemes]: Duolingo blog, visemes
[^ico-games]: ICO, guidance for game developers (2023)
