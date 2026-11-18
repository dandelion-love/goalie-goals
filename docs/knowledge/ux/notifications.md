---
type: Research Finding
title: Notifications
description: Daily reminders tuned by experiment are a major retention lever, and a major source of pressure on teens; use few, user-timed, kind ones.
tags: [ux, notifications, reminders, children, dark-patterns]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: yancey, resource: https://research.duolingo.com/papers/yancey.kdd20.pdf, title: "Yancey and Settles (2020), A sleeping, recovering bandit algorithm for optimizing recurring notifications, KDD" }
  - { id: duo-meme, resource: https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/, title: "Duolingo blog: the AI behind the reminder meme" }
  - { id: csm, resource: https://www.commonsensemedia.org/press-releases/teens-are-bombarded-with-hundreds-of-notifications-a-day, title: "Common Sense Media (2023), Constant Companion: teens and notifications" }
  - { id: ico-nudge, resource: https://www.hunton.com/privacy-and-cybersecurity-law-blog/age-appropriate-design-ico-issues-draft-code-of-practice-for-online-services-used-by-children/, title: "Hunton: the ICO draft age appropriate design code (2019), nudge techniques" }
  - { id: fogg, resource: https://behaviormodel.org/, title: "Fogg Behavior Model (B = MAP)" }
---

# The pattern

A daily reminder nudges the learner to practise, at a chosen time or a learned one. The
reference app chooses among many message templates with an adaptive (bandit) algorithm.

# Evidence and rationale

- The reference app's researchers describe choosing reminder templates with a bandit
  algorithm; success is a completed lesson within two hours. Novel messages work better
  at first and wear off, so recently used templates are demoted and repeats are
  spaced.[^yancey] [^duo-meme]
- A prompt is one of the three conditions for a behaviour; without one, even a motivated
  person often does not act.[^fogg]
- Teens in a 2023 study received a median of over two hundred notifications a day,
  including during school hours and at night.[^csm] One more app competing for attention
  adds to that load.
- The UK regulator's draft children's code named reward loops and streaks among nudges
  that can extend children's use of a service.[^ico-nudge]

# Harms and evidence gaps (AC4)

There is good evidence that reminders raise short-term return; there is little published
evidence on whether optimised reminders build a durable habit rather than a dependence on
the reminder. Optimising copy for click-through tends to select for urgency and guilt.

# Generic description (clean room)

"A daily reminder at a chosen time." The reference app's reminder copy and persona-driven
messages are not reproduced.

# Relevance to training

Training is a joint appointment. The best prompt is the shared plan: a reminder to the
*parent* at the agreed time, optional for the keeper, never during school hours or late
evening, never more than one a day, silent on rest days, and stopping by itself after a
few ignored days instead of escalating; see [UX patterns decision](/decisions/ux-patterns.md).

[^yancey]: Yancey and Settles (2020)
[^duo-meme]: Duolingo blog, the AI behind the meme
[^csm]: Common Sense Media (2023)
[^ico-nudge]: Hunton on the ICO draft code (2019)
[^fogg]: Fogg Behavior Model
