---
type: Pattern
title: The sections of an exercise dossier
description: The six sections an exercise dossier shows, in order - why it matters for a goalkeeper, what to expect, the muscles worked, the move in top-level play, how to do it, and the science - and what each must and must not hold.
tags: [dossiers, exercise-card, content, goalkeeper]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:24:00Z }
sources:
  - { id: epic, resource: https://github.com/dandelion-love/goalie-goals/issues/70, title: "Epic #70: give every exercise a dossier the keeper wants to read" }
  - { id: white-2018, resource: https://pubmed.ncbi.nlm.nih.gov/30144021/, title: "White et al. Match-play and performance test responses of soccer goalkeepers: a review of current literature (Sports Med, 2018)" }
  - { id: gk-power, resource: /training/goalkeeper-power.md, title: Goalkeeper-specific power }
  - { id: elements, resource: /exercise-apps/explanation-elements.md, title: Elements of a clear exercise explanation }
  - { id: rules, resource: /dossiers/claim-rules.md, title: Claim rules for exercise dossiers }
  - { id: adaptations, resource: /dossiers/youth-adaptations.md, title: What training changes in a young athlete, and how fast }
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media decision }
  - { id: approval, resource: /decisions/parent-approval.md, title: Parent approval as a primary behaviour }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
---

# Summary

A dossier answers "why am I doing this?" for one exercise card. It has six sections in a
fixed order, so the keeper always finds the same thing in the same place. The first two
speak to the game and to progress; the last two are the card and the evidence. Every
claim in every section follows the [claim rules](/dossiers/claim-rules.md).[^epic][^rules]

# The six sections

| # | Section | Must hold | Must not hold |
|---|---|---|---|
| 1 | **Why it matters for a goalkeeper** | A headline of one line; 2 to 4 claims, each tied to one game action: dives, set position, jumps, distribution (throws, kicks, rolls) or recovery (getting up and set again) | Generic fitness reasons with no game link; any promise about looks |
| 2 | **What to expect if you keep it up** | 2 to 4 expected changes, each a range with a time frame, a training frequency and the group studied; 1 "keep it up" claim on what happens if training stops; a note that people differ | Single numbers, "you will", size or weight, a claim with no youth source |
| 3 | **Muscles worked** | 2 to 8 entries for the muscle map, each with a muscle id, a plain label, a role (main or helping) and whether it was measured in a study or only named by the card's cue | Muscles nobody measured listed as "main"; growth language |
| 4 | **The move in top-level play** | 0 to 3 clip links chosen by the move, under the clip policy (#73) and the parent's approval | Embeds, tracking links, youth players, a pattern of one club, league or country |
| 5 | **How to do it** | The existing card, unchanged: steps, cues, mistakes, parent check, stop signs, easier and harder, dose | Any second version of steps or dose |
| 6 | **The science** | 2 to 5 mechanism claims (how it is thought to work, and what was measured); 1 to 3 limits claims (what is not known) | Mechanism dressed up as a proven outcome; injury claims beyond the evidence |

# What each section is for

## 1. Why it matters for a goalkeeper

The keeper's decisive moments are few, short and explosive: a handful of saves a match,
often dives and jumps, with most of the match at low intensity.[^white-2018] The section
names which of those moments the exercise feeds, and how, in a sentence or two each. The
action list is fixed so the app can group exercises by action and show "this helps your
dives" on the card:

| Action id | In plain words |
|---|---|
| `dive` | Diving to either side, low and high, and landing |
| `set-position` | The ready stance before a shot: still, balanced, able to push off any way |
| `jump` | Jumping for high balls and crosses, and landing |
| `distribution` | Throwing, rolling and kicking the ball out |
| `recovery` | Getting up after a dive and set again for the next shot |

The qualities behind them come from the [goalkeeper power](/training/goalkeeper-power.md)
research.[^gk-power]

## 2. What to expect if you keep it up

Realistic change for an early-teens athlete: better control and steadier form within a
few weeks, measurable strength gains over weeks to months, mostly from the nervous system
learning to use the muscles.[^adaptations] Each expected change states what was measured,
the range, how long, how often, and who. It closes with what keeping it up means (about
twice a week, as the card's dose) and that growth and progress differ from person to
person.

## 3. Muscles worked

Feeds the muscle map (asset choice in #72). Each entry is a muscle id from the
vocabulary in the [content model](/decisions/exercise-dossier.md), a plain label, and a
role. "Main" needs a study that measured that muscle's activity in this exercise or a
close variant; a muscle the card only asks the keeper to squeeze is "helping" and marked
as named by the cue. The map shows which muscles work; it never shows what will grow.

## 4. The move in top-level play

Links, never embeds, to clips of adult professional goalkeepers making the move the
exercise supports, under the link policy researched in #73, the media Decision's ban on
video embeds and the parent's approval.[^media-decision][^approval] Until #73's Decision
lands, this section is empty and the screen hides it.

## 5. How to do it

The card itself. The dossier adds no steps, cues or doses; it shows the card and links
back to it, so there is one source of truth for how to move and how much.[^elements][^training-rules]

## 6. The science

For the curious keeper and for the parent: the mechanism (what the muscles and nervous
system do, what studies measured) and the limits (what no study has shown yet). Lab
measures such as muscle activity are named as lab measures. This is the section that
says "there is no goalkeeper trial of this exercise" when that is true.

# Length

A dossier fits about two iPad screens. Keeper-facing claims are one or two short
sentences; longer explanation for the parent goes in an optional detail field shown
behind "more". Limits are in the [content model](/decisions/exercise-dossier.md).

[^epic]: Epic #70, exercise dossiers
[^white-2018]: White et al., review of goalkeeper match and test responses, 2018
[^gk-power]: Goalkeeper-specific power
[^elements]: Elements of a clear exercise explanation
[^rules]: Claim rules for exercise dossiers
[^adaptations]: What training changes in a young athlete, and how fast
[^media-decision]: Exercise media decision
[^approval]: Parent approval as a primary behaviour
[^training-rules]: Training rules for an early-teens keeper
