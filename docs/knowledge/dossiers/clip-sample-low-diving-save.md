---
type: Research Finding
title: "Sample clip links: the low diving save"
description: Three official-channel clips of adult professional keepers making a low diving save, from three confederations and both the men's and women's game, recorded in the clip link format with tracking stripped, plus the candidates turned down and why.
tags: [dossiers, clips, sample, diving]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:40:00Z }
stale_after: 2027-02-18T00:00:00Z
sources:
  - { id: policy, resource: /dossiers/clip-link-policy.md, title: Policy for linking goalkeeper clips from a dossier }
  - { id: record-check, resource: /dossiers/clip-link-record-and-check.md, title: Clip link record and the pre-release link check }
  - { id: gk-power, resource: /training/goalkeeper-power.md, title: Goalkeeper-specific power }
  - { id: clip-mls, resource: "https://www.youtube.com/watch?v=RjTxA_Qrb3A", title: "Major League Soccer (YouTube): John Pulskamp late penalty save for Sporting KC" }
  - { id: clip-jl, resource: "https://www.youtube.com/watch?v=sGVc_QhLhes", title: "J.LEAGUE International (YouTube): penalty saved by Park Il Gyu, Oita Trinita 1-1 Sagan Tosu" }
  - { id: clip-uefa, resource: "https://www.youtube.com/watch?v=W0o6-7srrUY&t=9s", title: "UEFA (YouTube): Women's EURO great saves, matchday 3, 2025" }
  - { id: ch-mls, resource: https://www.youtube.com/@mls, title: Major League Soccer channel }
  - { id: ch-jl, resource: https://www.youtube.com/@JLEAGUEInternational, title: J.LEAGUE International channel }
  - { id: ch-uefa, resource: https://www.youtube.com/@UEFA, title: UEFA channel }
  - { id: bio-pulskamp, resource: https://www.mlssoccer.com/players/john-pulskamp, title: "MLS player profile: John Pulskamp" }
  - { id: bio-park, resource: https://en.wikipedia.org/wiki/Park_Il-gyu, title: "Wikipedia: Park Il-gyu" }
  - { id: bio-peng, resource: https://en.wikipedia.org/wiki/Livia_Peng, title: "Wikipedia: Livia Peng" }
---

# Summary

Three clips pass the [policy](/dossiers/clip-link-policy.md) for the low diving save, the
dive the lateral push-off drills build towards.[^gk-power][^policy] Each is from a
verified league or confederation channel, is public, plays without sign-in, shows an adult
professional, and was looked at frame by frame on its storyboard on 2026-11-18 to confirm
a low dive at the stated moment. A person still watches each clip whole before it is
proposed to the parent; the `reviewed` field stays empty until then.

| # | Keeper | Team | Competition | Country or confederation | Game | Channel |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | John Pulskamp | Sporting Kansas City | MLS | United States, CONCACAF | men | Major League Soccer |
| 2 | Park Il-gyu | Sagan Tosu | J1 League | Japan, AFC | men | J.LEAGUE International |
| 3 | Livia Peng | Switzerland | UEFA Women's EURO 2025 | UEFA | women | UEFA |

Spread: three teams, three competitions, three confederations, both games. No team appears
twice and no competition or confederation holds more than one of three.[^record-check]

# Examples

```yaml
- id: low-dive-01
  url: https://www.youtube.com/watch?v=RjTxA_Qrb3A
  platform: youtube
  video_id: RjTxA_Qrb3A
  start_s: null
  length_s: 17
  channel:
    name: Major League Soccer
    id: UCSZbXT5TLLW_i-5W8FZpFsg
    kind: league
    official_evidence: "verified badge; handle @mls; description links to the league's official site"
  shows: "late penalty; full-length low dive to his right, ball kept out at about 0:09 (net-camera replay 0:13-0:17)"
  game_action: low-dive
  exercises: []
  keeper: { name: John Pulskamp, adult_professional: true }
  team: Sporting Kansas City
  competition: MLS
  competition_country: United States
  game: men
  published: 2026-03-01T04:25:13Z
  reviewed: null
  checked: { at: 2026-11-18T06:20:00Z, result: "ok (public, plays signed out, not age-restricted)" }

- id: low-dive-02
  url: https://www.youtube.com/watch?v=sGVc_QhLhes
  platform: youtube
  video_id: sGVc_QhLhes
  start_s: null
  length_s: 53
  channel:
    name: J.LEAGUE International
    id: UCmQp6ZaAejJKKkXc_Y_lh1A
    kind: league
    official_evidence: "verified badge; description says it is the league's official international channel and links to the league's English site"
  shows: "late penalty; low dive to his right, ball parried at about 0:32 (replays 0:37-0:43); opens with a short league promo"
  game_action: low-dive
  exercises: []
  keeper: { name: Park Il-gyu, adult_professional: true }
  team: Sagan Tosu
  competition: J1 League
  competition_country: Japan
  game: men
  published: 2021-05-21T05:16:27Z
  reviewed: null
  checked: { at: 2026-11-18T06:20:00Z, result: "ok (public, plays signed out, not age-restricted)" }

- id: low-dive-03
  url: https://www.youtube.com/watch?v=W0o6-7srrUY&t=9s
  platform: youtube
  video_id: W0o6-7srrUY
  start_s: 9
  length_s: 111
  channel:
    name: UEFA
    id: UCyGa1YEx9ST66rYrJTGIKOw
    kind: confederation
    official_evidence: "verified badge; handle @UEFA; description links to the confederation's official site"
  shows: "match save; low dive to her right, ball smothered at about 0:21; part of a saves round-up, so the link starts at 0:09"
  game_action: low-dive
  exercises: []
  keeper: { name: Livia Peng, adult_professional: true }
  team: Switzerland
  competition: UEFA Women's EURO 2025
  competition_country: UEFA
  game: women
  published: 2025-07-14T12:36:57Z
  reviewed: null
  checked: { at: 2026-11-18T06:20:00Z, result: "ok (public, plays signed out, not age-restricted)" }
```

Sources: the clips and channels,[^clip-mls][^clip-jl][^clip-uefa][^ch-mls][^ch-jl][^ch-uefa]
and a public profile confirming each keeper is an adult professional.[^bio-pulskamp][^bio-park][^bio-peng]
The `checked` entries record a manual run of the check's steps 1, 2, 3, 5 and 10, read
from the public watch page (playable while signed out, marked family-safe, not unlisted,
owner channel as recorded); the API-based check does not exist yet.[^record-check]

# Turned down

| Candidate | Channel | Why |
| --- | --- | --- |
| Save of the Month, May 2019 (Ron-Robert Zieler) | Bundesliga | a high, flying save to the top corner, not a low dive |
| Save of the Month, August 2019 (Florian Müller) | Bundesliga | a full-stretch dive at mid height; better for a `high-dive` set |
| Tim Howard penalty save | Major League Soccer | the channel describes a save in the top corner; also a second MLS clip |
| NWSL Save of the Week, week 11 2017 (Stephanie Labbé) | National Women's Soccer League | described as a leaping stop |
| Season "best saves" round-ups of 10 minutes to an hour | league channels | too long for the dossier and mixed actions; a `t=` start can rescue one only if the move comes early |
| Coaching, fan and compilation channels with low-dive titles | not official | fail section 1 of the policy |

# Gaps

- Each clip still needs a person to watch it whole against section 4 of the policy (no
  fights, injuries in replay, crowd abuse or gambling ads) before it is proposed.
- "Official" was shown from the channel side (badge and the channel's own links); the
  reverse link, from each organisation's site to its channel, was not checked.
- The low dives were confirmed on one-second storyboard frames, not at full frame rate;
  the times are approximate to a second.
- Region availability was not checked, on purpose: it depends on where the household is,
  which is never written here. The check's step 6 handles it privately.

[^gk-power]: Goalkeeper-specific power: dives as a decisive action; lateral push-off drills.
[^policy]: Clip link policy: official channels, no tracking, age rules, the spread rule.
[^record-check]: Clip link record and check: the format, and steps 1 to 10.
[^clip-mls]: Major League Soccer, penalty save clip, 17 seconds, published 2026-03-01.
[^clip-jl]: J.LEAGUE International, penalty save clip, 53 seconds, published 2021-05-21.
[^clip-uefa]: UEFA, Women's EURO 2025 matchday 3 saves, 111 seconds, published 2025-07-14.
[^ch-mls]: Major League Soccer channel, verified.
[^ch-jl]: J.LEAGUE International channel, verified.
[^ch-uefa]: UEFA channel, verified.
[^bio-pulskamp]: MLS profile: professional goalkeeper, born 2001.
[^bio-park]: Park Il-gyu: professional goalkeeper, born 1989.
[^bio-peng]: Livia Peng: professional goalkeeper and Swiss international, born 2002.
