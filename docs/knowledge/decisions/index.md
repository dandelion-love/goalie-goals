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
