---
type: Research Finding
title: Visual consistency, design tokens and the aesthetic-usability effect
description: People rate attractive, consistent interfaces as easier to use; a small set of named design tokens is how teams keep colour, type, spacing and shape consistent, and the number of distinct values in use can be counted in the browser.
tags: [quality, visual-design, consistency, design-tokens, rubric]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:00:00Z }
sources:
  - { id: nng-aesthetic, resource: https://www.nngroup.com/articles/aesthetic-usability-effect/, title: "Nielsen Norman Group: The aesthetic-usability effect" }
  - { id: nng-heuristics, resource: https://www.nngroup.com/articles/ten-usability-heuristics/, title: "Nielsen Norman Group: 10 usability heuristics for user interface design" }
  - { id: dtcg, resource: https://www.designtokens.org/, title: "W3C Design Tokens Community Group" }
  - { id: hig-type, resource: https://developer.apple.com/design/human-interface-guidelines/typography, title: "Apple Human Interface Guidelines: Typography" }
  - { id: consistent-id, resource: https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html, title: "W3C: Understanding SC 3.2.4 Consistent Identification" }
  - { id: mdn-computed, resource: https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle, title: "MDN: Window.getComputedStyle()" }
---

# Why it matters

- People perceive aesthetically pleasing designs as more usable, and are more tolerant
  of small usability problems in them; the effect can also hide real problems during
  testing.[^nng-aesthetic] So looks are worth measuring, but never instead of usability.
- "Consistency and standards" is one of the ten usability heuristics: users should not
  wonder whether different words, situations or actions mean the same thing.[^nng-heuristics]
  WCAG asks the same of components with the same function.[^consistent-id]

# Design tokens

A design token is a named design decision (a colour, a size, a duration) stored once and
referenced everywhere. The W3C community group defines a shared format so tokens move
between design tools and code.[^dtcg] A short, named scale keeps a hierarchy legible;
platform guidance asks for few sizes and weights.[^hig-type]

# Measuring it

Consistency can be counted rather than judged: `getComputedStyle` returns the resolved
value of every property for every element,[^mdn-computed] so a script run on each screen
lists the distinct colours, font sizes, weights, spacing values, corner radii and
shadows in use, and the distinct looks of buttons. Fewer distinct values, all drawn from
tokens, means a more consistent interface.

# How it applies to a two-person training app

- The parent's phone and the keeper's iPad should look like one product: same tokens,
  same button looks, same names.
- The app's palette, type and art are its own (clean room); the rubric counts how
  consistently they are applied, not which values were chosen.
- Exercise figures come from several open sources or the app's own rig; consistency
  there means every prescribed exercise has a figure and a credit line in the same
  layout (see the [exercise media Decision](/decisions/exercise-media.md)).

[^nng-aesthetic]: Nielsen Norman Group, aesthetic-usability effect.
[^nng-heuristics]: Nielsen Norman Group, 10 usability heuristics (heuristic 4).
[^dtcg]: W3C Design Tokens Community Group.
[^hig-type]: Apple HIG, Typography.
[^consistent-id]: W3C, Understanding SC 3.2.4.
[^mdn-computed]: MDN, getComputedStyle().
