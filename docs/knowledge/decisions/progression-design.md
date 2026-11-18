---
type: Decision
title: Progression design for two people training together
description: How the app's streaks, points, levels, quests and badges work for a keeper and a parent training together, with rest days that never break a streak, rewards for consistency and form over volume, the dark patterns refused, and no reward tied to finishing a session that should stop.
tags: [decision, progression, streaks, safety, children, dark-patterns]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: streaks, resource: /progression/streaks.md, title: Streaks and streak protection }
  - { id: points, resource: /progression/xp-and-daily-goals.md, title: Points and daily goals }
  - { id: levels, resource: /progression/levels-and-units.md, title: Levels and units }
  - { id: leagues, resource: /progression/leagues-and-leaderboards.md, title: Leagues and leaderboards }
  - { id: quests, resource: /progression/quests.md, title: Quests }
  - { id: badges, resource: /progression/badges.md, title: Badges and achievements }
  - { id: variable, resource: /progression/variable-rewards.md, title: Variable rewards }
  - { id: reminders, resource: /progression/reminders.md, title: Reminders }
  - { id: habit, resource: /progression/habit-loops.md, title: Habit loops }
  - { id: gradient, resource: /progression/goal-gradient.md, title: Goal-gradient and endowed progress }
  - { id: loss, resource: /progression/loss-aversion.md, title: Loss aversion }
  - { id: sdt, resource: /progression/self-determination-theory.md, title: Self-determination theory }
  - { id: harms, resource: /progression/harms-and-dark-patterns.md, title: Harms and dark patterns for young users }
  - { id: oss, resource: /progression/open-source-resources.md, title: Open-source references for habit and progression mechanics }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules (research item 3) }
---

# Context

The goal is a *shared training habit*: the keeper and the parent train together on
planned days, and want to come back. The science says a habit is a cue-to-behaviour link
built by regular repetition; for exercise, regular weekly frequency matters, and an
occasional miss does not undo it.[^habit] Progression mechanics help when they support
autonomy, competence and relatedness, and hurt when they feel controlling.[^sdt] For a
young athlete the overriding constraint is the [training rules](/decisions/training-rules.md)
decision:[^training-rules] it decides what is prescribed, when a session stops, and when
to rest. **Where this decision and the training rules disagree, the training rules win.**

# Principles

1. **Count consistency, not volume.** Credit comes from showing up on planned days and
   from good form; extra sets, reps or minutes earn nothing.[^points]
2. **Rest is part of the plan.** A planned rest day, a safety stop, or a declared illness
   or injury pause never breaks anything.[^loss]
3. **Gain framing only.** Show what the pair has built; never what they are about to
   lose.[^loss] [^streaks]
4. **Together, not against each other.** No competition between the two, no strangers.[^leagues]
5. **Nothing is for sale, and nothing is random.**[^variable] [^harms]

# The training calendar

The pair choose their training days (for example three or four a week) and the app marks
the rest as planned rest days. The plan from the training rules can add rest days (after
a hard block, after a pain report) and those become planned rest too. Every calendar day
has exactly one state:

| Day state | Who sets it | Effect on streaks |
|---|---|---|
| Trained together | Both check in | Extends the team streak and both individual streaks |
| Trained solo (safe-solo subset only) | One person | Extends that person's individual streak; holds the team streak |
| Stopped for safety | Automatically, when a training-rules stop fires | Counts exactly like a completed session for that day |
| Planned rest | The plan | Holds all streaks (never breaks); shown as "rest kept" |
| Pause (ill, injured, away, exams) | The parent, any time, no limit while declared | Freezes all streaks; resumes where it stood |
| Missed planned day | Nobody acted | Uses a free spare day if one is left; otherwise ends the run (see below) |

The *safe-solo subset* is whatever the training rules allow without supervision (for
example mobility and technique without load or jumps). Anything needing a supervising
adult can only be logged as "trained together".

# Streaks: shared and individual

- **Team streak** (primary, shown first): consecutive planned training days the pair
  kept, counting together sessions and safety stops, held through rest days and pauses.
- **Individual streaks**: each person's own run, so a solo mobility session on a day the
  other is away still counts for them. The parent's individual streak counts *coaching*
  check-ins (being present, rating form), so the parent does not have to do the exercises.
- **Spare days**: each person and the team start each four-week block with two free spare
  days, which cover a missed planned day automatically. Spare days are never sold,
  never earned by extra work, and unused ones do not stack beyond the block. This is the
  "emergency reserve" slack the evidence favours.[^streaks]
- **When a run ends**: no "lost" screen, no repair offer. The run is archived as a
  completed run in the history ("a 6-week run, 21 sessions") and a new run starts at the
  next session. The headline number is the forgiving **habit strength** score (below),
  which dips a little rather than resetting.[^streaks] [^oss]
- **Habit strength**: an exponentially smoothed score of planned days kept, in the style
  of the open-source Loop Habit Tracker (reimplemented from its description, not its GPL
  code).[^oss] It rewards regularity, tolerates single misses, and treats rest and pauses
  as neutral.

# Points, daily goal and levels

- **Session credit** is granted when the warm-up is logged, not when the session ends.
  A fixed amount, the same for a short or long session.
- **Form stars**: after each set the parent taps a form rating; good form earns a star.
  Stars are capped per session at the number of sets in the plan, so sets beyond the plan
  earn nothing.
- **Daily goal** = "today's planned session done (or stopped safely)". There is no
  light/regular/intense volume tier.
- **Weekly goal** = planned sessions this week, shown as a near goal across days (the
  goal-gradient effect across a week, never inside a set).[^gradient]
- **Levels** are *technique* levels per skill area (for example handling, footwork,
  diving, landing). They rise only through a unit checkpoint, a form check rated by the
  parent against the cues in the plan, never through accumulated points. Points never
  unlock harder or heavier work; only the training plan does.[^levels]

# Quests and badges

- **One weekly team quest**, cooperative and opt-out, built only from safe-to-repeat aims:
  "log the warm-up every session", "three great-landing ratings", "both say thanks after
  a session". No quest counts reps, sets, minutes, height or load.[^quests]
- **Badges** recognise competence and consistency (first month together, a technique
  level reached, a full block with every warm-up logged) and safe choices (first time a
  session was stopped for safety, a block with every rest day kept). They are shown when
  earned, not announced in advance as targets, and no badge is for volume.[^badges]

# Reminders

One reminder at most per planned training day, at the time the pair chose, to the parent
by default (the keeper opts in), never during school hours or after the evening cut-off,
none on rest or pause days. Copy is a plan, not a plea ("training at the usual time
today"). After three ignored reminders in a row they stop until the pair next train.
The app suggests a real-world cue (same time and place) so the habit stops needing the
phone.[^reminders] [^habit]

# Stop on pain: reward invariants

No reward ever depends on finishing a session that the training rules say to stop. These
are testable rules for the implementation:

1. Session credit and the day's streak credit are granted when the warm-up is logged,
   before any work set. Stopping later cannot remove them.
2. When any training-rules stop condition fires (pain, a warning sign, either person
   pressing stop), the session ends at once. The remaining sets cannot be logged that day,
   and no quest, star, badge, level or streak credit is lost or forgone because of it.
3. A stopped session gets the same end screen tone as a finished one ("good call, session
   kept"), and the day state is "stopped for safety", which counts as kept.
4. Within a session the UI shows sets done, not "sets left to earn a reward"; no progress
   bar, quest or badge is ever one set from completing.
5. After a pain report the next days follow the training rules (rest, reduced plan, or
   see a professional), and those days are planned rest or pause, which hold all streaks.
6. No mechanic rewards training on a day the plan marks as rest; logging extra sessions
   gives no credit.

# Refused dark patterns

| Refused | Instead |
|---|---|
| Guilt messaging (sad or scolding character, "you broke your streak", "don't let your parent down") | Neutral plan reminders; gain-framed history; no message at all after a miss |
| Pay-to-repair, paid protection, any purchase, ads | Free spare days; nothing for sale |
| Pushing through pain (completion rewards, "finish the set", near-full bars) | The invariants above |
| Leagues, leaderboards, comparison with strangers or between the pair | The pair against their own past weeks; no public profiles |
| Variable rewards (chests, random bonuses, multipliers) | Fixed, predictable credit; badges shown on earning |
| Fake urgency (countdowns, expiring rewards, "only today") | No timers outside work and rest intervals |
| Endless play ("one more session", autoplay) | A clear "done for today" end and a cool-down |
| Volume rewards (points per rep or minute, volume badges) | Session credit and capped form stars |

# Evidence gaps and safeguards (AC4)

| Mechanic | Evidence of habit building | Evidence of harm to young users | This app |
|---|---|---|---|
| Streaks | Yes, with caveats (correlational product data; lab and field studies)[^streaks] | Named by regulator as a nudge; broken streaks demotivate[^harms] | Kept, with rest-safe calendar, free spare days, pause, no repair, habit-strength headline |
| Points and daily goal | Small to medium effects in learning[^points] | Expected rewards can undermine interest | Kept, show-up and form only, capped |
| Levels and units | No direct habit evidence[^levels] | None found | Kept for competence, gated by form checks |
| Leagues and leaderboards | No habit evidence; mixed or negative in classrooms[^leagues] | Social comparison; contact with strangers | Refused |
| Quests | No habit evidence[^quests] | Volume pressure if worded badly | One cooperative weekly quest, no volume aims |
| Badges | No habit evidence alone[^badges] | Can undermine motivation when controlling | Informational only, competence and safety |
| Variable rewards | None found[^variable] | Linked to problem gambling in adolescents when paid | Refused |
| Reminders | Short-term return, yes; lasting habit, unproven[^reminders] | Notification overload in teens | One, planned, auto-stopping |

# Consequences

- The data model needs a per-day state (table above), per-person and team runs, a spare-day
  balance per block, and a habit-strength score. No currency, inventory or store.
- Every stop path in the training rules must call a single "end session safely" action
  that sets the day state and grants nothing more and removes nothing.
- The UX of these mechanics follows the [UX patterns](/decisions/ux-patterns.md)
  decision.

[^streaks]: Streaks and streak protection
[^points]: Points and daily goals
[^levels]: Levels and units
[^leagues]: Leagues and leaderboards
[^quests]: Quests
[^badges]: Badges and achievements
[^variable]: Variable rewards
[^reminders]: Reminders
[^habit]: Habit loops
[^gradient]: Goal-gradient and endowed progress
[^loss]: Loss aversion
[^sdt]: Self-determination theory
[^harms]: Harms and dark patterns for young users
[^oss]: Open-source references
[^training-rules]: Training rules decision
