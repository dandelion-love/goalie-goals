---
type: Decision
title: The themed weekly rotation the engine implements
description: Each weekday keeps one theme every week; three strength themes on non-consecutive days (two in a match week), at most two jump days (one in a match week), capped light days between and one full rest day, inside a four-week block with a lighter fourth week; the parent sets the training weekdays, team days and match day in the app.
tags: [decision, progression-library, rotation, weekly-plan, habit, match-week]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T08:55:00Z }
sources:
  - { id: cues, resource: /progression-library/stable-cues-and-habit.md, title: Stable cues build a training habit }
  - { id: themed, resource: /progression-library/themed-day-rotations.md, title: Themed-day rotations in home training }
  - { id: periodisation, resource: /progression-library/youth-periodisation.md, title: Youth periodisation and the football year }
  - { id: week, resource: /progression-library/proposed-week.md, title: A proposed themed week }
  - { id: block, resource: /progression-library/four-week-block.md, title: A four-week block with a lighter week }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
  - { id: progression-design, resource: /decisions/progression-design.md, title: Progression design for two people training together }
  - { id: parent-approval, resource: /decisions/parent-approval.md, title: Parent approval as a primary behaviour }
---

# Decision

The app plans training as a **themed weekly rotation**: each weekday keeps the same theme
every week, so the weekday is the cue and the pair never decide what today is
for.[^cues][^themed] The rotation sits inside a **four-week block** with a lighter
fourth week.[^block] The [training rules](/decisions/training-rules.md) override
everything here; where this Decision and the training rules disagree, the training rules
win.[^training-rules]

# The rotation

| Slot | Theme | Kind | Jump day |
|---|---|---|---|
| S1 | Legs and landing | Strength | Yes |
| S2 | Push and brace | Strength | No |
| S3 | Keeper power | Strength | Yes |
| L | Safe hands, Move well (alternating through the week) | Light | No |
| R | Rest | Rest | No |

Theme content, light-day caps and worked examples are in the
[proposed week](/progression-library/proposed-week.md).[^week] The theme names are the
app's own; no programme's names or content are used.

# What the parent sets

All of this is household data in the app, set and changed by the parent. None of it is
written into the repo, issues, fixtures or examples; examples use invented
weeks.[^parent-approval]

| Setting | Values | Notes |
|---|---|---|
| Strength weekdays | 3 weekdays, non-consecutive, the week wrapping round (the last day of the week and the first are neighbours) | The app proposes a pattern from the settings below; the parent accepts or edits it. The app refuses consecutive days. |
| Rest weekday | 1 weekday | Never a team day or match day. The app suggests the day after the match. |
| Team training weekdays | None or more | Optional. Each is a Team day. |
| Match day | A weekday, none, or varies | "None" gives the off-season shape. |
| This week's match | A date in the current or next week | Overrides the usual match day for that week only; a second match that week makes it a tournament week. |
| Session time and place, and one barrier plan | Free text | The pair's if-then plan, asked at setup, used for the reminder.[^cues] |
| Season break | On or off | On: no team days or matches until switched off. |

Changes to the strength weekdays or rest weekday take effect from the next week, never
mid-week, so the cue stays stable. A one-off match move is the only same-week change.

# Engine rules

The engine builds each week from the settings. These rules are testable:

1. **One theme per weekday.** A weekday's theme is the same every week until the parent
   changes the pattern. A strength theme that lands in a blocked window runs that week as
   its own light version under the same name.
2. **Strength days.** No match: up to 3. Match week: up to 2. Never consecutive, never on
   a team day, the match day, the day before it or the day after it. If fewer slots are
   free, plan what fits (1 or 0) and tell the parent why.
3. **Jump days.** Only S1 and S3 hold jumps and sprints. No match: up to 2. Match week:
   at most 1, the one furthest before the match that is at least 2 days from it. Light
   days, team days and match days have none.
4. **Light days.** At most 20 minutes (15 the day before a match), easy effort, zero jump
   contacts, no sprints, no load, no timed holds, no dives from standing, only approved
   light-safe exercises. A skipped light day is planned rest.[^week][^progression-design]
5. **Rest.** At least one full rest day every week that is not a team or match day. The
   day after a match is rest or Move well.
6. **Team and match days.** No app session. Logging the team session or the match keeps
   the day; not logging it never breaks a streak, because the app cannot check it.
7. **Tournament weeks** (two or more matches): no strength or jump days, light or rest
   only; the block clock holds.
8. **Block.** Weeks 1 to 3 build by the progression rule; week 4 keeps every day and cuts
   sets, jumps and sprints to about half, never above the starting dose, and starts no
   new rung. A paused week or a tournament week holds the block clock. After a week or
   more without strength sessions, restart at week 1, one step below.[^block][^training-rules]
9. **Unlocks.** Two clean sessions of an exercise in a row, then the parent's approval;
   the new rung starts on its theme's next weekday at its starting dose, or in week 1 of
   the next block if approved in week 4.[^block][^parent-approval]
10. **Approval and stops.** Every planned exercise is owner-approved; the stop button and
    the reward invariants of the progression design apply on every theme.[^training-rules][^progression-design]
11. **Season shape.** No team days and no match: off-season shape. Team days and no match:
    pre-season (3 strength days if they fit, else 2). A match day: in-season
    shape.[^periodisation]

# Why

- A stable weekday cue and an if-then plan are the best-supported levers for a habit,
  and the evidence tolerates misses.[^cues]
- Themed days space hard work and give something light to do most days, if light days
  are capped so they stay light.[^themed][^week]
- Two strength days a week hold strength in a season; three build it when there are no
  matches; a lighter week every fourth week keeps the build steady.[^periodisation][^block]
- Every rule is checked against the training rules in the
  [proposed week](/progression-library/proposed-week.md).[^week]

# Consequences

- The household profile stores the settings above; the calendar stores per-week match
  overrides. Nothing about the real schedule appears in the repo.
- The exercise library needs a theme tag per exercise, a jump flag, and a light-safe flag
  that the owner approves.
- The day states of the progression design gain **Team day** and **Match day**, which
  hold streaks like planned rest and count as kept when logged.
- The engine needs tests for each rule above, using invented weeks: an off-season week, a
  match week, a moved match, a tournament week, a paused week and a schedule where only
  one strength slot fits.

# Undo

Reversible: the theme names, light-day caps and block length are app content and
settings. Changing them needs a new version of this Decision and the owner's approval;
existing logs keep their dates and day states.

[^cues]: Stable cues build a training habit
[^themed]: Themed-day rotations in home training
[^periodisation]: Youth periodisation and the football year
[^week]: A proposed themed week
[^block]: A four-week block with a lighter week
[^training-rules]: Training rules decision
[^progression-design]: Progression design decision
[^parent-approval]: Parent approval decision
