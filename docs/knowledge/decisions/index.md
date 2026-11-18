# Decisions

## Infrastructure

* [A dedicated cloud project with a small monthly budget](/decisions/dedicated-cloud-project.md) - the app's data and hosting live in a project of their own, with a budget that alerts before it is spent

## Building for the iPad

* [Front-end approach for the iPad web app](/decisions/frontend-approach.md) - React and Vite as an installable web app with an offline session cache, iPad-first breakpoints, iPadOS 18.4 as the minimum, and sign-in run inside the installed app behind the proxy.

## Parent approval

* [Parent approval as a primary behaviour](/decisions/parent-approval.md) - The parent approves every new exercise, load increase, plan change and any sharing before the keeper sees it; a pain report pauses all training until the parent clears it; while anything waits, only already-approved sessions run.

## UX patterns

* [UX patterns this app adopts](/decisions/ux-patterns.md) - Which game-like learning-app patterns the app adopts, how each is adapted to physical training done by a keeper and a parent together, and which it leaves out and why.

## Progression and habit

* [Progression design for two people training together](/decisions/progression-design.md) - How the app's streaks, points, levels, quests and badges work for a keeper and a parent training together, with rest days that never break a streak, rewards for consistency and form over volume, the dark patterns refused, and no reward tied to finishing a session that should stop.

## Safe training for U15 athletes

* [Training rules for an early-teens keeper](/decisions/training-rules.md) - What the app may and must never prescribe, its progression limits, the warning signs that stop a session, and when the family should see a professional.

## Equipment at home

* [Equipment model](/decisions/equipment-model.md) - How the app records each household's equipment, how every exercise declares what it needs, how substitutes are chosen, the generic default profile, and the rule that an exercise with no safe substitute is left out.

## How training apps explain exercises

* [Reuse of exercise content](/decisions/exercise-content-reuse.md) - What the app reuses as-is, adapts, and builds to explain exercises, with each licence named and checked for a public repo and hosted app, and what it rejects.

## Exercise media

* [Exercise media](/decisions/exercise-media.md) - The media and text sources the app uses to illustrate exercises, how attribution is shown, the stored format, how an exercise with no open media is illustrated, and what is never used.
