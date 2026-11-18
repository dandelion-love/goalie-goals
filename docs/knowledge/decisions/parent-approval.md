---
type: Decision
title: Parent approval as a primary behaviour
description: The parent approves every new exercise, load increase, plan change and any sharing before the keeper sees it; a pain report pauses all training until the parent clears it; while anything waits, only already-approved sessions run.
tags: [decision, parent-approval, safety, privacy, audit]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:45:00Z }
sources:
  - { id: ask-to-buy, resource: https://support.apple.com/en-us/105055, title: "Apple Support: Ask to Buy" }
  - { id: play-approvals, resource: https://support.google.com/googleplay/answer/7039872, title: "Google Play Help: Purchase approvals on Google Play" }
  - { id: lloyd-2014, resource: https://doi.org/10.1136/bjsports-2013-092952, title: "Lloyd et al. 2014, Position statement on youth resistance training, Br J Sports Med" }
  - { id: ardern-2016, resource: https://pubmed.ncbi.nlm.nih.gov/27226389/, title: "Ardern et al. 2016, Consensus statement on return to sport, Br J Sports Med" }
  - { id: gao-2024, resource: https://doi.org/10.3389/fpsyg.2023.1291711, title: "Gao et al. 2024, parents and young athletes' motivation, Frontiers in Psychology" }
  - { id: ico-aadc, resource: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/, title: "UK ICO: Age appropriate design code" }
  - { id: coppa-2025, resource: https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data, title: "US FTC: final changes to the children's privacy rule (2025)" }
  - { id: baseline, resource: /parent-approval/minors-privacy-regimes.md, title: "Privacy rules for minors' data, compared: common baseline" }
  - { id: opc-youth, resource: https://www.priv.gc.ca/en/about-the-opc/what-we-do/provincial-and-territorial-collaboration/joint-resolutions-with-provinces-and-territories/res_231005_01/, title: "Canadian commissioners' joint resolution on young people's privacy (2023)" }
  - { id: webkit-push, resource: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/, title: "WebKit: Web Push for Web Apps on iOS and iPadOS" }
  - { id: web-push-lib, resource: https://github.com/web-push-libs/web-push, title: "web-push (MPL-2.0)" }
  - { id: xstate, resource: https://github.com/statelyai/xstate, title: "XState (MIT)" }
  - { id: zod, resource: https://github.com/colinhacks/zod, title: "Zod (MIT)" }
  - { id: dexie, resource: https://github.com/dexie/Dexie.js, title: "Dexie.js (Apache-2.0)" }
---

# Decision

Approval is approve-before-use for anything that adds physical risk or shares data,
request-and-wait for the keeper's own asks, and never approve-after for load. Silence is
never consent. The rules sit on top of the [training rules](/decisions/training-rules.md):
technique before load, no maximal lifts, the parent approves every exercise.

Research: [patterns](/parent-approval/family-app-approval-patterns.md),
[what needs approval](/parent-approval/what-needs-approval.md),
[teen autonomy](/parent-approval/teen-autonomy-in-youth-sport.md),
[privacy regimes](/parent-approval/minors-privacy-regimes.md).

# 1. Who holds the parent role

- A role in the app's own data, attached to an account the sign-in proxy already admits.
  Being admitted by the proxy grants nothing by itself.
- The first parent is set at deployment from configuration outside the repo. A further
  parent (for example a second guardian) is added only by an existing parent, as Ask to
  Buy lets the organiser add another approver.[^ask-to-buy]
- The keeper role cannot approve anything, cannot grant roles and cannot clear a pause.
  The server enforces this on every write (approver role is parent, approver is not the
  requester); the UI hiding a button is not the control.
- With two parents, any parent may approve; a decline from either parent wins over an
  approval made before the keeper starts the item.

# 2. What is gated before the keeper sees it

| Item | Gate |
| --- | --- |
| New exercise (not in the approved library) | approve before use; shown with demo, coaching cues and the reason |
| Load or volume up (weight, sets, reps, jumps, sessions per week) | approve before use; shown as a before-and-after diff, and only after the parent has ticked "technique looks right" for the current level[^lloyd-2014] |
| Plan change (weekly plan, session template) | approve before use |
| Return after pain or injury | parent clearance, then each return step approved[^ardern-2016] |
| Sharing, leaderboards, exports, any new person or account | approve before use, off by default, and the keeper must also agree; this meets the common baseline of the regimes surveyed[^baseline][^ico-aadc][^coppa-2025][^opc-youth] |

Pending items are invisible as training content: the keeper sees only "a change is waiting
for your parent". The server refuses to create any request that contains a maximal or
test-to-failure lift; such a request never reaches the parent.

An approval is bound to one version of one item (a content hash). Any edit, including a
change to the training rules that touches it, makes a new request.[^ask-to-buy]

# 3. What the keeper may choose alone

- Which approved session to do on which day, and in what order within the week.
- Which approved alternative drill when one is offered.
- Doing less: skipping sets, ending early, resting, declining a session.
- Effort ratings, notes, themes, sounds and avatar.
- Asking for something new (a request the parent answers).
- Reporting pain, at any time, with no gate.

This keeps real choice in the keeper's hands, which the youth-sport evidence links with
better motivation than pressure.[^gao-2024]

# 4. How a request reaches the parent (phone first)

1. The request is stored server-side, then sent as a web push to every device where a
   parent enabled notifications; the parent's phone is the primary target. Server push
   reuses `web-push`.[^web-push-lib] On an iPhone this needs the app on the Home Screen and
   a tap to allow notifications.[^webkit-push]
2. The push opens the request page: what changes, why the app proposes it, the training
   rule it satisfies, a demo, and buttons **Approve**, **Approve lower** (pick a smaller
   step), **Decline** (with a reason) and **Ask the keeper**.
3. The parent's in-app inbox and badge show every pending request, so a missed push is not
   a lost request, as Ask to Buy keeps requests findable.[^ask-to-buy]
4. **Ask in person:** the iPad shows a code the parent scans with their phone to open the
   same request page. The parent never approves by signing in on the keeper's iPad. This
   mirrors Play's "ask in person" without sharing a device login.[^play-approvals]
5. Batching: routine requests (load steps) gather into one weekly review; safety items
   (pain, return steps) go at once.

# 5. While a request waits

- The keeper sees the request as pending, with a "remind my parent" button usable once a
  day.
- Today's session never waits; see the fallback below.
- A request unanswered for 7 days lapses to "not approved (expired)"; the keeper can send
  it again. Ask to Buy lapses after 24 hours; a week suits a weekly training review.[^ask-to-buy]
- Approvals are never granted offline, by timeout or by default.

# 6. Fallback when approval would block a daily session (AC4)

The app picks the first that exists and is fully approved:

1. The approved session already scheduled for today.
2. The last approved version of that session, before the pending change.
3. An approved maintenance session from the approved library (technique and mobility).
4. A rest day with an optional approved warm-up.

An unapproved or pending session is never offered, including offline: the iPad caches only
approved sessions. If training is paused for pain, the fallback is rest only.

# 7. Pain or injury report

- A **Something hurts** button is always on screen during a session and on the home
  screen, at least 56 px.
- The keeper marks a body area on a drawing, a 0 to 10 score, when it started and during
  which drill. Nothing else is required.
- Effect, immediately and on the device even when offline: the current session stops and
  shows a gentle cool-down; the whole training state becomes **Paused**; every session is
  blocked until cleared. The outbox sends the report when online.
- The parent gets an immediate push and an inbox item marked urgent.
- Red flags named in the training rules (for example a knock to the head, severe pain,
  swelling, numbness, or pain that changes how the keeper moves) show "stop and tell an
  adult; see a health professional" on both devices.
- Only a parent can clear the pause. Clearing records: rest days taken, whether a
  professional was seen (yes or no, no medical details), and a return plan of reduced,
  approved steps (technique only, then part volume, then the plan). Return is a sequence,
  not a switch.[^ardern-2016]
- Pain during a return step pauses training again and restarts the return.
- **Tapped by mistake** (story 104): after **Something hurts**, the keeper can mark the report
  as a mistake, on the report form or the paused screen. It is a note for the parent, never a
  clear: training stays paused until the parent checks in and clears it with one tap, and
  nothing clears it on its own. Only the keeper sends it, once per pause and only while the
  pause is open; it carries the role and the time, no text, and waits in the device's outbox
  when offline. Anything else is refused and logged.
- The keeper's view is recorded with the clearance, so the decision is shared.[^ardern-2016]

# 8. Audit trail

- An append-only event log in the document database: event id, time, actor role and
  internal account reference, action (requested, approved, approved lower, declined,
  expired, paused, cleared, approval undone, role granted, role removed, refused by server), item reference
  and content hash, before-and-after diff, reason.
- No event is edited or deleted; a correction is a new event.
- A parent may undo an approval for 30 seconds (`UNDO_WINDOW_MS`), unless the keeper has
  already started that session; the request goes back to the inbox and the undo is its own
  event.
- Parent and keeper both see the full history, so oversight is visible to the
  keeper.[^baseline][^ico-aadc][^opc-youth]
- The log keeps only what the decision needs, is kept while the account is used, and is
  exported or deleted with the rest of the keeper's data on request.[^baseline][^coppa-2025][^ico-aadc][^opc-youth]

# Rejection and failure cases

| Case | Behaviour |
| --- | --- |
| Parent declines | the item never appears; the keeper sees the reason; the app proposes no heavier option instead; the keeper may ask again after 7 days or with a change |
| Request expires | treated as not approved; fallback session runs |
| Keeper or a script tries to approve, or calls the API directly | server refuses (role check), logs "refused by server" |
| Request includes a maximal lift | server refuses to create it; logged |
| Approved item later edited, or training rules change | approval no longer matches the hash; a new request; fallback meanwhile |
| Parents disagree | a decline wins until the parents resolve it |
| Parent role removed and no parent left | pending requests cancelled; no new content; approved sessions continue; a pause cannot be cleared, so a paused keeper stays paused |
| Push not allowed or not installed | inbox, badge and ask-in-person code still work |
| Keeper offline | only cached approved sessions; pain pause applies locally at once |

# Reused open-source pieces

| Need | Library | Licence |
| --- | --- | --- |
| Request lifecycle as an explicit state machine | XState[^xstate] | MIT |
| Validating requests and refusing forbidden content | Zod[^zod] | MIT |
| Push to the parent's phone | web-push[^web-push-lib] | MPL-2.0 |
| Offline approved-session cache and outbox | Dexie.js[^dexie] | Apache-2.0 |

No real person, account or deployment value appears here; the invented cast for fixtures is
the keeper and the parent only.

[^ask-to-buy]: Apple Support, Ask to Buy.
[^play-approvals]: Google Play Help, purchase approvals: ask in a message or in person.
[^lloyd-2014]: Lloyd et al., 2014 International Consensus on youth resistance training.
[^ardern-2016]: Ardern et al., 2016 Bern consensus on return to sport.
[^gao-2024]: Gao et al., systematic review on parents and young athletes' motivation.
[^ico-aadc]: UK ICO, Age appropriate design code (including standard 11, parental controls).
[^coppa-2025]: US FTC, January 2025 press release on the final COPPA rule changes.
[^baseline]: This bundle's regime comparison, common baseline section.
[^opc-youth]: Canadian commissioners' 2023 joint resolution on young people's privacy.
[^webkit-push]: WebKit blog, Web Push for Web Apps on iOS and iPadOS.
[^web-push-lib]: web-push repository; MPL-2.0 per package metadata.
[^xstate]: XState repository, MIT.
[^zod]: Zod repository, MIT.
[^dexie]: Dexie.js repository, Apache-2.0.
