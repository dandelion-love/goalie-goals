---
type: Research Finding
title: Onboarding
description: Let people do a first real session before asking for an account, and ask only the questions that shape the plan.
tags: [ux, onboarding, privacy, children]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: firstround, resource: https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker, title: "First Round Review: the tenets of A/B testing from Duolingo's growth lead" }
  - { id: appcues, resource: https://goodux.appcues.com/blog/duolingo-user-onboarding, title: "Appcues GoodUX: Duolingo's user onboarding" }
  - { id: ico-aadc, resource: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/, title: "ICO: Age appropriate design code (Children's code)" }
  - { id: fogg, resource: https://behaviormodel.org/, title: "Fogg Behavior Model (B = MAP)" }
---

# The pattern

New users pick a goal and a daily time budget, maybe take a placement check, and start a
first lesson within a minute or two. Sign-up is offered *after* the first lesson, as a way
to save progress, and can be skipped.

# Evidence and rationale

- The reference app's growth lead reported that moving sign-up later, after a first
  lesson, lifted daily active users by about a fifth, and that soft, skippable prompts
  outperformed hard walls.[^firstround] This is an interview claim, not a published
  study.
- Case-study write-ups describe the flow as goal, time budget, level, then a lesson, with
  the character guiding each step.[^appcues]
- Reducing steps before the first success raises ability, so fewer people drop
  off.[^fogg]
- For a service a child uses, the UK children's code asks for data minimisation, high
  privacy by default, and no nudges toward giving more data.[^ico-aadc] Delaying the
  account also delays data collection, which fits that code.

# Generic description (clean room)

"Value before sign-up": a short setup, a first real activity, then an optional account.
Widely used outside the reference app.

# Relevance to training

Here onboarding is shared: the parent sets up the plan and the safety rules; the keeper
does the first (gentle) session. Questions are limited to what the plan needs (experience
level, available kit and space, which days are training days). No name, age, school or
club is required; an age *band* is enough. A first session should be technique-only, with
no load or jumps, until the safety readiness questions are answered; see
[UX patterns decision](/decisions/ux-patterns.md).

[^firstround]: First Round Review interview
[^appcues]: Appcues GoodUX case study
[^ico-aadc]: ICO Children's code
[^fogg]: Fogg Behavior Model
