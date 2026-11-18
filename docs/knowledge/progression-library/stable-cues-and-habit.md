---
type: Research Finding
title: Stable cues build a training habit
description: The evidence that an if-then plan, the same context repeated, and a steady day and time turn training into a habit, how strong that evidence is, and what it asks of a weekly rotation.
tags: [progression-library, habit, cues, implementation-intentions, consistency]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T08:55:00Z }
sources:
  - { id: wood-2007, resource: https://pubmed.ncbi.nlm.nih.gov/17907866/, title: "Wood and Neal. A new look at habits and the habit-goal interface (Psychol Rev, 2007)" }
  - { id: lally-2010, resource: https://doi.org/10.1002/ejsp.674, title: "Lally, van Jaarsveld, Potts and Wardle. How are habits formed: modelling habit formation in the real world (Eur J Soc Psychol, 2010)" }
  - { id: gardner-2012, resource: https://pubmed.ncbi.nlm.nih.gov/23211256/, title: "Gardner, Lally and Wardle. Making health habitual: the psychology of habit-formation and general practice (Br J Gen Pract, 2012)" }
  - { id: gollwitzer-2006, resource: https://doi.org/10.1016/S0065-2601(06)38002-1, title: "Gollwitzer and Sheeran. Implementation intentions and goal achievement: a meta-analysis of effects and processes (Adv Exp Soc Psychol, 2006)" }
  - { id: sheeran-2024, resource: https://doi.org/10.1080/10463283.2024.2334563, title: "Sheeran, Listrom and Gollwitzer. The when and how of planning: meta-analysis of the scope and components of implementation intentions in 642 tests (Eur Rev Soc Psychol, 2024)" }
  - { id: belanger-2013, resource: https://doi.org/10.1080/17437199.2011.560095, title: "Bélanger-Gravel, Godin and Amireault. A meta-analytic review of the effect of implementation intentions on physical activity (Health Psychol Rev, 2013)" }
  - { id: kaushal-2015, resource: https://pubmed.ncbi.nlm.nih.gov/25851609/, title: "Kaushal and Rhodes. Exercise habit formation in new gym members: a longitudinal study (J Behav Med, 2015)" }
  - { id: schumacher-2020, resource: https://pubmed.ncbi.nlm.nih.gov/32658039/, title: "Schumacher et al. Consistent morning exercise may be beneficial for individuals with obesity (Exerc Sport Sci Rev, 2020)" }
---

# Summary

A habit is a link between a cue and an action, built by doing the action again and again
in the same setting. Three lines of evidence point the same way: an if-then plan that
names when and where helps people start; repetition in a stable context makes the action
automatic over weeks to months; and a steady time of day is a plausible extra cue for
exercise, though it is less tested. Almost all of this evidence comes from adults.

# Implementation intentions

- An implementation intention is a plan in the form "when situation X arises, I will do
  Y". A meta-analysis of 94 tests found a medium-to-large average effect on reaching the
  goal (d = 0.65).[^gollwitzer-2006]
- A larger meta-analysis of 642 tests found planning helped across behavioural,
  cognitive and emotional outcomes, and sorted which cues work (time and place, the end
  of another task) and which responses work.[^sheeran-2024] After correcting for
  publication bias the effect is smaller, so the honest reading is "helps, modestly".
- For physical activity, a meta-analysis of 26 studies found a small-to-medium effect
  (d = 0.31 straight after, 0.24 at follow-up), larger when the plan also said how to
  handle a barrier.[^belanger-2013]

# Context-dependent repetition

- Habits form when an action is repeated in a stable context, so the context starts the
  action with little thought; the goal that started it matters less over
  time.[^wood-2007]
- In a real-world study, automaticity rose with each repetition and levelled off after a
  median of about 66 days, with a wide spread between people (18 to 254 days). Missing
  one chance did not set people back in a measurable way.[^lally-2010]
- Practical advice from the same group: pick one simple action, tie it to a cue that
  happens anyway, and repeat it in that setting.[^gardner-2012]

# Time and day consistency

- In new gym members, exercising about four times a week for six weeks predicted a
  formed exercise habit.[^kaushal-2015]
- A review argues that exercising at the same time each day, especially in the morning,
  may help adherence by turning the time into a cue and reducing clashes; it is a
  hypothesis paper built on small and observational studies in adults with
  obesity.[^schumacher-2020]
- The weekday itself is a context cue: "on this day we do this" is the "when" of an
  implementation intention, repeated weekly. No study found here tests weekday themes
  directly; this is an application of the cue findings above, not a tested result.

# What this asks of a weekly rotation

1. **One cue per day, the same every week.** The weekday names the theme, so the pair
   never decide what today is for.
2. **An if-then plan at setup.** The pair write when and where they train ("after the
   afternoon snack, in the living room, we start the warm-up"), plus one barrier
   plan ("if a team session runs late, we do the short version").[^belanger-2013]
3. **Something small most days.** Light days keep the daily cue alive without adding
   load, which matters more for automaticity than session length.[^lally-2010]
4. **Misses are normal.** One missed day does not undo a habit, which supports the
   rest-safe streak rules in the [progression design](/decisions/progression-design.md).

# Gaps

- No trial found tests weekday-themed rotations, or implementation intentions, in
  early-teens athletes training at home with a parent. The app treats the adult evidence
  as a direction, not a dose.
- Bias-corrected effects of planning are small; the plan is cheap to make, so the app
  uses it, but claims no number.

See also [themed-day rotations](/progression-library/themed-day-rotations.md) and
[habit loops](/progression/habit-loops.md).

[^wood-2007]: Wood and Neal, 2007
[^lally-2010]: Lally et al., 2010
[^gardner-2012]: Gardner, Lally and Wardle, 2012
[^gollwitzer-2006]: Gollwitzer and Sheeran, 2006
[^sheeran-2024]: Sheeran, Listrom and Gollwitzer, 2024
[^belanger-2013]: Bélanger-Gravel, Godin and Amireault, 2013
[^kaushal-2015]: Kaushal and Rhodes, 2015
[^schumacher-2020]: Schumacher et al., 2020
