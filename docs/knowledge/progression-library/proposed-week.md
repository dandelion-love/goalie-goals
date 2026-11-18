---
type: Pattern
title: A proposed themed week
description: Three strength themes on non-consecutive days, at most two jump days, capped light skills-and-mobility days between them and one full rest day, fitted around team training and a match in an invented example week, and checked rule by rule against the training rules.
tags: [progression-library, rotation, weekly-plan, light-day, match-week]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T08:55:00Z }
sources:
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
  - { id: progression-design, resource: /decisions/progression-design.md, title: Progression design for two people training together }
  - { id: cues, resource: /progression-library/stable-cues-and-habit.md, title: Stable cues build a training habit }
  - { id: themed, resource: /progression-library/themed-day-rotations.md, title: Themed-day rotations in home training }
  - { id: periodisation, resource: /progression-library/youth-periodisation.md, title: Youth periodisation and the football year }
  - { id: nsca-2009, resource: https://pubmed.ncbi.nlm.nih.gov/19620931/, title: "Faigenbaum et al. Youth resistance training: updated position statement paper from the NSCA (J Strength Cond Res, 2009)" }
  - { id: silva-2015, resource: https://pubmed.ncbi.nlm.nih.gov/26284158/, title: "Silva, Nassis and Rebelo. Strength training in soccer with a specific focus on highly trained players (Sports Med Open, 2015)" }
  - { id: brenner-2016, resource: https://pubmed.ncbi.nlm.nih.gov/27573090/, title: "Brenner. Sports specialization and intensive training in young athletes, AAP clinical report (Pediatrics, 2016)" }
---

# The themes

Six day themes, named by this app. Each weekday keeps one theme every week, so the
weekday is the cue.[^cues][^themed] Every session draws only on exercises the owner has
approved.[^training-rules]

| Theme | Kind | Holds | Jumps and sprints |
|---|---|---|---|
| **Legs and landing** | Strength | Squat, hinge and lunge patterns; landing practice | Jump day: jump-and-land block and short sprints |
| **Push and brace** | Strength | Push and band pull patterns; trunk anti-extension and anti-rotation holds | None |
| **Keeper power** | Strength | Whole-body and lateral patterns; diving progressions from kneeling onto a mat | Jump day: lateral hops and skater jumps, change of direction |
| **Safe hands** | Light | Ball handling, catching soft throws, set position, footwork at walking pace | None |
| **Move well** | Light | Mobility, balance, controlled range of motion | None |
| **Rest** | Rest | Nothing planned | None |

Two more day kinds come from the calendar, not the rotation: **Team day** (the keeper's
team trains) and **Match day**.

# What keeps a light day light

A light day keeps the daily cue alive without becoming a fourth strength day. Every
light-day session follows all of these:

| Cap | Limit |
|---|---|
| Time | At most 20 minutes in all: a 5-minute warm-up, at most 12 minutes of work, a cool-down. The day before a match: at most 15 minutes. |
| Effort | Easy throughout: the keeper can talk in full sentences; at most 3 on a 0 to 10 effort scale. No set ends because of tiredness. |
| Jumps | Zero jump contacts: no hops, bounds, skips or jump-and-land. Footwork stays on the ground (steps, shuffles, crossovers at walking or easy jogging pace). |
| Speed | No sprints and no change of direction at speed. |
| Load | No added load and no strength sets; no timed holds (planks and side planks belong to strength days). |
| Impact | No dives from standing; diving stays on strength days. |
| Exercises | Only owner-approved exercises the library marks light-safe. |

**Allowed:** mobility flows and controlled stretches; balance on one leg; goalkeeper set
position and stance; footwork patterns at low intensity; ball handling (catching soft
throws at close range, picking up a rolling ball, soft wall throws); breathing and
relaxation in the cool-down.

These caps are a design choice to keep light days clearly below the strength-day dose;
no source sets a light-day dose for youth. Light days are optional: a skipped light day
counts as planned rest and holds every streak,[^progression-design] which also gives the
pair a natural second rest day.[^brenner-2016]

# The week with no team training

The off-season shape: 3 strength days apart, 2 jump days, light days between, one full
rest day.[^nsca-2009][^periodisation] An invented example week:

| Day | Theme | Kind |
|---|---|---|
| Monday | Legs and landing | Strength, jump day |
| Tuesday | Safe hands | Light |
| Wednesday | Push and brace | Strength |
| Thursday | Move well | Light |
| Friday | Keeper power | Strength, jump day |
| Saturday | Safe hands | Light |
| Sunday | Rest | Rest |

The two jump days are three days apart; the strength days never touch; the rest day
follows the last strength day and its light day.

# The week with team training and a match

When the parent enters team training days and a match day, the week takes its in-season
shape:[^silva-2015][^periodisation]

1. **No strength on a team day, the match day, the day before it, or the day after it.**
2. **At most 2 strength days** in a match week, still non-consecutive; one fits if only
   one slot is free, and the app says so.
3. **At most 1 jump day** in a match week, never within a day of the match. Team sessions
   already hold running and jumping the app cannot count.
4. **The day before the match** is a light day of at most 15 minutes, or rest.
5. **The day after the match** is the rest day, or a Move well day if the rest day sits
   elsewhere.
6. **A team day** has no app session. Logging that the keeper trained with the team is
   enough for the day; an optional Move well cool-down earns nothing extra.
7. **A strength theme that falls in a blocked window keeps its name** and runs as a light
   session that week ("Keeper power, light version"), so the weekday cue stays.

An invented example match week (team training on two evenings, a match at the weekend;
none of this is a real schedule):

| Day | Calendar | Theme this week | Kind |
|---|---|---|---|
| Monday | | Legs and landing | Strength, the week's one jump day |
| Tuesday | Team training | Team day | Team |
| Wednesday | | Push and brace | Strength, no jumps |
| Thursday | Team training | Team day | Team |
| Friday | Day before the match | Keeper power, light version | Light, at most 15 minutes, or rest |
| Saturday | Match | Match day | Match |
| Sunday | Day after the match | Rest | Rest |

Load that week: 2 strength days apart, 1 jump day, sprints on Monday only, 2 team
sessions and a match, and 1 full rest day (2 if the pair skip Friday's light session).

# Checked against the training rules

Each rule of the [training rules](/decisions/training-rules.md) Decision, and how both
example weeks meet it.[^training-rules]

| Rule | Week with no team | Match week | Met |
|---|---|---|---|
| 1. Owner approval of every exercise and variant | Themes draw only on approved exercises; light days only on approved light-safe ones | Same | Yes |
| 2. Technique before load; increase only after two clean sessions | The rotation sets days, not doses; doses follow the progression rule (see the [4-week block](/progression-library/four-week-block.md)) | Same | Yes |
| 3. No maximal lifts, tests or sets to failure | No theme holds any; light days end no set from fatigue | Same | Yes |
| Warm-up of 5 to 10 minutes and a cool-down every session | Every session, light days included (5 minutes) | Same | Yes |
| May prescribe: bodyweight, band and light ball work, low-level jumps on a soft surface, short sprints, keeper technique, mobility | All themes stay inside this list | Same | Yes |
| Never: barbells, heavy free weights, depth or weighted jumps, resisted sprints, improvised loads, unlisted equipment | No theme holds any | Same | Yes |
| Strength sessions 2 to 3 a week, never on consecutive days | 3: Monday, Wednesday, Friday | 2: Monday, Wednesday | Yes |
| Sets and repetitions inside the strength and power ranges | Set by the progression rule, not the rotation | Same | Yes |
| Load increase at most 5% or one step, after two clean sessions | Set by the progression rule | Same | Yes |
| Jump contacts 50 to 60 to start, about 100 at most, at most twice a week | 2 jump days, 3 days apart; light days have none | 1 jump day | Yes |
| Sprints up to 16 short efforts with 90 s rest, twice a week | Sprints only on the 2 jump days | Monday only | Yes |
| At least 1, preferably 2, full rest days a week, counting team training | Sunday; a skipped light day adds a second | Sunday; a skipped Friday adds a second | Yes (minimum always; the preferred 2 at the pair's choice) |
| Growth spurt: hold progressions, drop jumps and sprints to the start dose | The rotation keeps its days; doses drop as the rule says | Same | Yes |
| After a week or more off, restart one step below | The rotation restarts at block week 1 (see the 4-week block) | Same | Yes |
| Holds: 1 to 2 sets of 10 to 30 s, by variant past 30 s | Holds only on Push and brace; none on light days | Same | Yes |
| Warning signs stop a session | The stop button works the same on every theme | Same | Yes |

The week sits at the minimum full rest of the training rules in the match week; the
preferred second rest day depends on the pair skipping a light day, which the app always
allows and never penalises.

[^training-rules]: Training rules decision
[^progression-design]: Progression design decision
[^cues]: Stable cues build a training habit
[^themed]: Themed-day rotations in home training
[^periodisation]: Youth periodisation and the football year
[^nsca-2009]: NSCA youth resistance training position statement, 2009
[^silva-2015]: Silva et al., strength training in soccer, 2015
[^brenner-2016]: AAP clinical report on sports specialisation, 2016
