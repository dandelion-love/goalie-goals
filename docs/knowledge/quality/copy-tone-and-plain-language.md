---
type: Research Finding
title: Copy tone and plain language
description: Tone of voice has published dimensions, reading level has a WCAG criterion, and pressure language has a known vocabulary; word counts, a glossary and a banned-phrase list make copy checkable without judging taste.
tags: [quality, copy, tone, plain-language, dark-patterns, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
sources:
  - { id: nng-tone, resource: https://www.nngroup.com/articles/tone-of-voice-dimensions/, title: "Nielsen Norman Group: The four dimensions of tone of voice" }
  - { id: reading-level, resource: https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html, title: "W3C: Understanding SC 3.1.5 Reading Level" }
  - { id: nng-teens, resource: https://www.nngroup.com/articles/usability-of-websites-for-teenagers/, title: "Nielsen Norman Group: Teenager's UX, designing for teens" }
  - { id: consistent-id, resource: https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html, title: "W3C: Understanding SC 3.2.4 Consistent Identification" }
  - { id: harms, resource: /progression/harms-and-dark-patterns.md, title: Harms and dark patterns }
  - { id: tone, resource: /ux/character-and-tone.md, title: Character and tone }
  - { id: feedback, resource: /ux/immediate-feedback.md, title: Immediate feedback }
---

# Tone

Tone of voice varies along four dimensions: funny to serious, formal to casual,
respectful to irreverent, enthusiastic to matter-of-fact.[^nng-tone] Placing a product on
each dimension turns "warm and coach-like" into a written target, but rating a screen
against it is still a judgement.

# Plain language

- WCAG's AAA reading-level criterion asks that text needing more than lower secondary
  education reading ability has a simpler version.[^reading-level]
- Teens read less fluently than adults and skim; short chunks, plain words and about a
  sixth-grade reading level are recommended for broad audiences, without a childish
  tone.[^nng-teens]
- The same function keeps the same name everywhere.[^consistent-id]

# Pressure language

The bundle's research on harms lists the copy patterns that turn a habit app into
pressure: guilt, urgency, countdowns, loss framing and scolding characters.[^harms] The
[character and tone](/ux/character-and-tone.md) concept adds that a character must never
plead or sulk.[^tone] Feedback should name the task or cue, not grade the
person.[^feedback]

# What can be measured

- **Length:** words per button label and per sentence, counted on rendered screens.
- **Terms:** one word per concept, checked against a glossary.
- **Pressure:** matches against a fixed list of pressure phrases, counted in the source
  strings and on rendered screens.
- **Feedback framing:** share of feedback strings that name a cue or an action.

Tone dimensions stay a design aim, not a scored measure, because two readings of the same
screen can place it differently.

# How it applies to a two-person training app

- In-session text is read mid-exercise, at a glance, so it is shorter than anywhere else.
- Safety copy ("Something hurts", "Stop") is plain and calm, never playful.
- The keeper and the parent see the same words for the same thing (session, set, rest,
  streak, pause).

[^nng-tone]: Nielsen Norman Group, four dimensions of tone of voice.
[^reading-level]: W3C, Understanding SC 3.1.5.
[^nng-teens]: Nielsen Norman Group, Teenager's UX.
[^consistent-id]: W3C, Understanding SC 3.2.4.
[^harms]: Harms and dark patterns (progression research).
[^tone]: Character and tone (UX research).
[^feedback]: Immediate feedback (UX research).
