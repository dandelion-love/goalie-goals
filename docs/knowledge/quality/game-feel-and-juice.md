---
type: Research Finding
title: Game feel and juiciness
description: Juice is layered, redundant feedback (motion, sound, particles, number tweens) on every action; it raises visual appeal reliably and competence only sometimes, so it should confirm the action, not replace information.
tags: [quality, game-feel, juice, feedback, motion, sound]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
sources:
  - { id: swink, resource: https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient, title: "Swink (2007), Game feel: the secret ingredient, Game Developer" }
  - { id: juice-talk, resource: https://www.gdcvault.com/play/1016487/Juice-It-or-Lose, title: "Jonasson and Purho (2012), Juice it or lose it, GDC Europe" }
  - { id: hicks, resource: https://dblp.org/rec/conf/chiplay/HicksGDA19.html, title: "Hicks, Gerling, Dickinson and Vanden Abeele (2019), Juicy game design: understanding the impact of visual embellishments on player experience, CHI PLAY 2019, pp. 185-197 (DBLP record)" }
  - { id: nng-teens, resource: https://www.nngroup.com/articles/usability-of-websites-for-teenagers/, title: "Nielsen Norman Group: Teenager's UX, designing for teens" }
---

# What it is

- **Game feel** is the tactile sense of controlling something on screen. Swink splits it
  into input, response, context, polish, metaphor and rules; "polish" is the visual and
  audio effects that make objects seem physical.[^swink]
- **Juice** is the designers' name for that polish taken further: the same plain game
  made satisfying by tweening, squash and stretch, screen shake, particles and sound on
  each action, added one layer at a time.[^juice-talk]

# Evidence

A controlled study of "visual embellishments" (effects that repeat information already
shown another way) found they raised visual appeal in every game tested, but raised
competence and other experience measures only under specific conditions.[^hicks] So
juice reliably makes an app look better; it does not by itself make it easier to use.

Teens in usability studies liked interactive features that involve doing something, and
disliked overused multimedia and flashy effects.[^nng-teens]

# What can be measured

Juice is countable without judging taste:

- **Coverage:** which core actions get a response beyond the bare state change (a
  pressed state, a tween, a sound).
- **Layering:** how many channels confirm a key moment (motion, sound, a number that
  counts up, a text change).
- **Restraint:** how long an effect blocks the next action, and whether it can be
  skipped.

# How it applies to a two-person training app

- Juice belongs on the moments the pair already value: a set logged, a form cue rated
  well, a session finished, a streak kept. It must never decorate a safety stop or a
  pain report, which get a calm, plain response (see the
  [UX Decision](/decisions/ux-patterns.md)).
- Effects confirm; they do not carry information. The set count, the timer and the XP
  number are readable without the animation.
- The iPad may be several metres away, so a sound and a large, simple motion carry
  further than fine particle effects.
- The building blocks are already chosen: canvas-confetti, Lottie or Rive, howler.js
  ([open-source resources](/ux/open-source-resources.md)).

[^swink]: Swink (2007), Game Developer.
[^juice-talk]: Jonasson and Purho (2012), GDC Vault.
[^hicks]: Hicks and colleagues (2019), CHI PLAY, DBLP record.
[^nng-teens]: Nielsen Norman Group, Teenager's UX.
