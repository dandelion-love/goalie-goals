---
type: Decision
title: Policy for linking goalkeeper clips from a dossier
description: Dossier clips are plain links to official league, club, federation or broadcaster channels that open outside the app, carry no tracking parameters or referrer, pass the platform's own age rules, are chosen by the move with a spread across clubs, leagues and countries, and reach the keeper only once the parent has switched clip links on and approved each link with its exercise.
tags: [dossiers, clips, links, privacy, parent-approval, youtube]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:40:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: epic, resource: https://github.com/dandelion-love/goalie-goals/issues/70, title: "Epic: give every exercise a dossier the keeper wants to read" }
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media (Decision) }
  - { id: video-research, resource: /exercise-media/video-and-animation.md, title: Video and animation sources }
  - { id: approval-decision, resource: /decisions/parent-approval.md, title: Parent approval as a primary behaviour (Decision) }
  - { id: what-needs-approval, resource: /parent-approval/what-needs-approval.md, title: What needs a parent's approval in a youth training app }
  - { id: baseline, resource: /parent-approval/minors-privacy-regimes.md, title: "Privacy rules for minors' data, compared: common baseline" }
  - { id: ico-aadc, resource: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/, title: "UK ICO: Age appropriate design code" }
  - { id: sign-in, resource: /platform/sign-in-in-home-screen-app.md, title: Google sign-in behind the cloud sign-in proxy in a Home Screen web app }
  - { id: firt-pwa, resource: https://firt.dev/ios-12.2/, title: "Firtman: iOS 12.2 PWA changes, out-of-scope links open in an in-app browser" }
  - { id: privacy-skill, resource: https://github.com/dandelion-love/goalie-goals/blob/main/.claude/skills/public-repo-privacy/SKILL.md, title: Public-repo privacy skill (public figures rule) }
  - { id: yt-terms, resource: https://www.youtube.com/t/terms, title: "YouTube Terms of Service (effective 2022-01-05): age requirements and parent permission" }
  - { id: yt-age-restricted, resource: https://support.google.com/youtube/answer/2802167, title: "YouTube Help: age-restricted content" }
  - { id: yt-teen, resource: https://support.google.com/youtube/answer/15253498, title: "YouTube Help: supervised experiences for teens" }
  - { id: yt-content-settings, resource: https://support.google.com/youtube/answer/10315823, title: "YouTube Help: content settings for supervised kid and teen accounts" }
  - { id: yt-verified, resource: https://support.google.com/youtube/answer/3046484, title: "YouTube Help: verification badges on channels" }
  - { id: ga-campaigns, resource: https://support.google.com/analytics/answer/10917952, title: "Google Analytics Help: custom campaigns and utm parameters" }
  - { id: mdn-noreferrer, resource: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noreferrer, title: "MDN: rel=noreferrer" }
  - { id: mdn-referrer-policy, resource: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy, title: "MDN: Referrer-Policy" }
  - { id: record-check, resource: /dossiers/clip-link-record-and-check.md, title: Clip link record and the pre-release link check }
  - { id: sample, resource: /dossiers/clip-sample-low-diving-save.md, title: "Sample clip links: the low diving save" }
---

# Context

The dossier epic gives every exercise a section showing top goalkeepers making the move
the exercise trains, as links to clips.[^epic] The media Decision already refuses video
embeds and third-party players, because an embedded player tracks viewers and shows real
people inside the app.[^media-decision][^video-research] The parent-approval Decision
gates every new exercise and anything that leaves the household.[^approval-decision]
This policy sets how clip links work within both.

# Decision

## 1. Where a link may point

- Only an **official channel** of a league, club, national federation, confederation
  (FIFA, UEFA and the like) or a rights-holding broadcaster.
- On YouTube, official means both: the channel carries YouTube's verification badge,
  which YouTube grants to the official channel of a company or public figure,[^yt-verified]
  and the channel's own links point to the organisation's own website (or that website
  links to the channel). A name change removes the badge, so the check re-reads it
  (see the [record and check](/dossiers/clip-link-record-and-check.md)).[^yt-verified]
  A few official channels have no badge (some women's league channels did not show one
  on 2026-11-18); such a channel needs the second test from both directions and a
  person's note.
- Never fan channels, compilation channels, re-uploads, coaching channels, betting or
  gaming channels, or a player's personal channel, however popular.
- One platform to start: YouTube, because the leagues and federations publish there.
  Another platform needs its own terms check before its first link.

## 2. How a link opens

- A plain link, never an embed, iframe, player SDK, thumbnail fetched from the platform, or
  preview card. The media Decision's refusal of embeds stands.[^media-decision]
- The app requests nothing from the platform at runtime: no thumbnail, no oEmbed, no
  title lookup. Titles and descriptions are stored in the record at review time.
- Every clip link carries `rel="noopener noreferrer"`, and the app sends
  `Referrer-Policy: no-referrer`, so the platform does not learn the app's address or the
  page the keeper came from.[^mdn-noreferrer][^mdn-referrer-policy]
- Before leaving, the app shows a one-line notice: "This opens YouTube, outside the app."
  It shows the channel name and the clip length from the record.
- On an iPad home-screen app, a link outside the app's scope opens in an in-app browser
  sheet or in Safari, depending on the version; the app cannot force one or the
  other.[^firt-pwa][^sign-in] With the YouTube app installed, the system may hand the link
  to that app. Either way the keeper leaves the app and taps back; this is tested on the
  target devices before the first clip ships.
- The app records no click, view or watch time for a clip, in analytics or in the audit
  log. Opening a clip is not an event the app needs.[^baseline]

## 3. No tracking parameters

- A stored URL is the canonical watch form, `https://www.youtube.com/watch?v=<id>`, with an
  optional `t=<seconds>s` start time. Nothing else.
- Every other query parameter is removed before the record is written, including the
  share parameter `si`, every `utm_*` campaign parameter,[^ga-campaigns] `feature`, `pp`,
  `ab_channel`, `list`, `index`, `fbclid` and `gclid`. Short forms (`youtu.be`,
  `/shorts/`, `m.youtube.com`) are rewritten to the canonical form.
- The check refuses any record whose URL holds a parameter outside `v` and `t`.[^record-check]

## 4. Age-appropriate under the platform's own rules

- YouTube's terms set 13 as the minimum age, allow younger children only when a parent
  enables it, and say a user under 18 represents that a parent or guardian permits their
  use.[^yt-terms] A link out of this app does not change who may use YouTube: the
  household's own YouTube account choices stay with the parent.
- **No age-restricted video.** Such videos play only for signed-in viewers over 18, and a
  link from another site sends the viewer to YouTube to sign in.[^yt-age-restricted] A
  link that hits that wall is broken for the keeper, and the restriction is a signal the
  clip is not for this audience. The check fails any video rated `ytAgeRestricted`.
- **Within a supervised account's settings.** Where the keeper uses a supervised teen
  account, the parent's content setting decides what plays, and no setting for under-18
  accounts includes age-restricted content.[^yt-teen][^yt-content-settings] Which setting
  a given clip falls under is the platform's judgement and is not published per video, so
  the person who reviews a clip watches it whole rather than relying on it.
- A clip is short (under about three minutes, or a `t=` start at the move) so the keeper
  sees the move and not an hour of autoplay. The notice says that YouTube will suggest
  more videos afterwards.
- The reviewer watches every clip in full before it is proposed and refuses one with
  fights, injuries shown in replay, crowd abuse, gambling advertising inside the video, or
  commentary unsuited to a young teen.

## 5. Which clips: the move first, then the spread

- A clip is chosen because it shows the game action the exercise trains (a low diving
  save for a lateral push-off drill, for example), named from the goalkeeper actions in
  the training research.[^epic]
- **Adult professionals only**, never youth, academy or under-age players, even at a
  senior club.[^privacy-skill]
- **The spread rule.** Clips for one game action spread across clubs, leagues and
  countries, and across the men's and women's game: at most two from one club, and no
  league, country or confederation supplies more than half the clips for that action.
  Clips are never chosen because of the keeper's own team, favourite club or local league;
  a pattern of choices can say what no sentence does.[^privacy-skill] The check counts
  this per action.[^record-check]
- Records name the professional keeper, the club or national team at the time, the
  competition and its country. They never say why a clip appeals to this family.

## 6. Parent approval

Clip links count as content the parent approves, in two layers.

1. **Once, a household switch: "Clip links in dossiers", off by default.** Following a
   clip takes the keeper out of the app onto a platform with its own recommendations,
   comments and ads. The parent-approval Decision treats anything leaving the household
   as approve-before-use and off by default, which matches the common baseline of the
   privacy regimes and the ICO code's high-privacy defaults.[^approval-decision][^what-needs-approval][^baseline][^ico-aadc]
   No data leaves with the keeper (no referrer, no account), so this is not "sharing"; it
   is leaving the app, and the parent decides once whether the household does that at
   all. While off, the dossier shows the clip's text (keeper, competition, what it shows)
   without a link. The keeper sees the switch's state but cannot change it.
2. **Per link, carried by the exercise approval.** A dossier is part of the exercise the
   parent already approves before the keeper sees it, and that approval is bound to a
   content hash of the item.[^approval-decision] The clip records of an exercise are in
   that hash. So each link is approved once, with its exercise, at no extra tap; adding,
   changing or replacing a link makes a new request, batched into the weekly review like
   other routine changes. A link that fails the check is hidden at once without waiting
   for anyone, since hiding is "doing less".[^what-needs-approval]

Why not per click: asking at each tap would gate a 45-second save the parent has already
approved, against the approval Decision's rule that the keeper chooses freely within what
is approved, and it would need the app to log clicks.[^approval-decision] Why not only the
switch: a link can rot or change owner after approval, so each link has to be pinned to
the version the parent saw.

The keeper may not add links. The "ask for something new" request in the approval Decision
covers asking for a clip of a move, which a reviewer then sources under this policy.

# Consequences

- The [record format and the check](/dossiers/clip-link-record-and-check.md) implement
  sections 1, 3, 4 and 5; the [sample](/dossiers/clip-sample-low-diving-save.md) is their
  first test.[^sample]
- The dossier schema story adds a `clips` list of records and the household switch; the
  dossier screen story renders a link with the notice and no platform request.
- The media Decision's refusal of embeds and of video in the app stands; a clip link is
  not media in the app.
- The release check fails while any shipped record fails the link check.

[^epic]: Dossier epic, scope and risks: clip links, link rot, clip choice revealing the family.
[^media-decision]: Exercise media Decision, "Never used" table: video embeds and tracking players.
[^video-research]: Video and animation research: an embedded player tracks viewers and shows real people.
[^approval-decision]: Parent-approval Decision: what is gated, approval bound to a content hash, batching.
[^what-needs-approval]: What needs approval: anything leaving the household; doing less needs no approval.
[^baseline]: Regime comparison, common baseline: protective defaults, data minimisation.
[^ico-aadc]: UK ICO, Age appropriate design code: high privacy by default.
[^sign-in]: Bundle concept on the installed iPad app: off-scope navigation shows browser UI; in-app sheets.
[^firt-pwa]: Firtman, iOS 12.2: out-of-scope links open in an in-app browser; target and rel cannot force Safari.
[^privacy-skill]: Public-repo privacy skill: public figures chosen by the move, spread, adults only.
[^yt-terms]: YouTube Terms of Service, "Age Requirements" and "Permission by Parent or Guardian".
[^yt-age-restricted]: YouTube Help, age-restricted content: not viewable signed out or under 18; links from other sites go to YouTube to sign in.
[^yt-teen]: YouTube Help, supervised teen accounts: voluntary, agreed by parent and teen, parent sets content settings.
[^yt-content-settings]: YouTube Help, content settings: Older kids (9+), Teens (13+), Older teens (16+); age-restricted content unavailable under 18.
[^yt-verified]: YouTube Help, verification badges: the official channel; a channel name change removes the badge, a handle change does not.
[^ga-campaigns]: Google Analytics Help: utm_ parameters identify campaign traffic.
[^mdn-noreferrer]: MDN, rel=noreferrer: no Referer header is sent.
[^mdn-referrer-policy]: MDN, Referrer-Policy: no-referrer.
[^record-check]: Clip link record and check: canonical URL, owner, age rating and spread checks.
[^sample]: Low diving save sample: three clips that pass the policy.
