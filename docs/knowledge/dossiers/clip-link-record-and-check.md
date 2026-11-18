---
type: Pattern
title: Clip link record and the pre-release link check
description: The fields every dossier clip link records, and the design of the check run before each release that strips tracking, flags dead, private, redirected, age-restricted or re-owned links, and counts the spread of clubs, leagues and countries per game action.
tags: [dossiers, clips, links, check, release]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:40:00Z }
sources:
  - { id: policy, resource: /dossiers/clip-link-policy.md, title: Policy for linking goalkeeper clips from a dossier }
  - { id: yt-api-videos, resource: https://developers.google.com/youtube/v3/docs/videos, title: "YouTube Data API: videos resource (status, contentDetails, snippet)" }
  - { id: yt-api-channels, resource: https://developers.google.com/youtube/v3/docs/channels, title: "YouTube Data API: channels resource" }
  - { id: yt-verified, resource: https://support.google.com/youtube/answer/3046484, title: "YouTube Help: verification badges on channels" }
  - { id: yt-age-restricted, resource: https://support.google.com/youtube/answer/2802167, title: "YouTube Help: age-restricted content" }
  - { id: gk-power, resource: /training/goalkeeper-power.md, title: Goalkeeper-specific power }
  - { id: approval-decision, resource: /decisions/parent-approval.md, title: Parent approval as a primary behaviour (Decision) }
---

# Schema

One record per clip, stored with the exercise's dossier content (YAML or JSON; the schema
story picks). It holds public facts about a public clip only; approvals live in the app's
data, never in the record.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | slug | stable id, for example `low-dive-01` |
| `url` | string | canonical `https://www.youtube.com/watch?v=<id>`, optional `&t=<n>s`; nothing else[^policy] |
| `platform` | enum | `youtube` (the only one allowed for now) |
| `video_id` | string | the platform's id, repeated so a URL edit is caught |
| `start_s` | integer or null | where the move starts; matches `t` in the URL |
| `length_s` | integer | the clip's length when checked |
| `channel.name` | string | the channel's display name when checked |
| `channel.id` | string | the platform's channel id (`UC...`); the owner test keys on this |
| `channel.kind` | enum | `league`, `club`, `federation`, `confederation` or `broadcaster` |
| `channel.official_evidence` | string | how it was shown to be official: badge, and which official site links to it or is linked from it[^yt-verified] |
| `shows` | string | what the clip shows, in neutral words, with the moment (for example "penalty; low dive to his right at 0:09") |
| `game_action` | enum | named after the goalkeeper actions in the training research (dives, jumps, punches): `low-dive`, `high-dive`, `jump-catch`, `punch` to start, extended by a reviewed change[^gk-power] |
| `exercises` | list of ids | the exercise cards this clip illustrates |
| `keeper.name` | string | the professional keeper, as the channel names them |
| `keeper.adult_professional` | boolean | must be `true`; confirmed from a public source at review |
| `team` | string | club or national team at the time of the clip |
| `competition` | string | league or tournament |
| `competition_country` | string | the league's country, or the tournament's confederation |
| `game` | enum | `men` or `women` |
| `published` | date | the platform's publish date |
| `reviewed` | object | `{ by, at }`: who watched it whole against the policy, and when (UTC, `Z`) |
| `checked` | object | `{ at, result }`: the last check run (UTC, `Z`) and its result |

# The check

A script in `tools/` (built in the dossier schema story), run before every release and on
a weekly schedule, and on any change to a clip record. It needs a YouTube Data API key read
from the environment (Secret Manager or a CI secret), never from the repo. It makes
requests from the build machine only; the app itself never contacts the platform.

| Step | How | Result on failure |
| --- | --- | --- |
| 1. Canonical URL | parse; host must be `www.youtube.com`, path `/watch`, query only `v` and `t`; `v` equals `video_id`; `t` equals `start_s` | **fail**, with the stripped URL suggested |
| 2. Exists and public | `videos.list` with `part=snippet,status,contentDetails` for the id; no item returned, `status.privacyStatus` not `public`, or `status.uploadStatus` not `processed` means dead, private or removed[^yt-api-videos] | **fail** (dead) |
| 3. Same owner | `snippet.channelId` equals `channel.id`; the API notes a video can be moved to another channel[^yt-api-videos] | **fail** (changed owner) |
| 4. Channel still the official one | `channels.list` for `channel.id`: exists; title equals `channel.name`. A renamed channel loses its badge, so a title change sends the record to a person, who re-checks the badge and the official site link[^yt-api-channels][^yt-verified] | **flag** for a person |
| 5. Not age-restricted | `contentDetails.contentRating.ytRating` is not `ytAgeRestricted`[^yt-api-videos][^yt-age-restricted] | **fail** |
| 6. Viewable | `contentDetails.regionRestriction` absent; if present, a person checks it privately against the household's region, which is never written here[^yt-api-videos] | **flag** for a person |
| 7. Not redirected | an HTTP `GET` of `url` without following redirects; a `3xx` to anything but the same watch URL (or the platform's cookie-consent page) means the link moved | **flag** (redirected) |
| 8. Length unchanged | `contentDetails.duration` within a second of `length_s`; a changed length means the upload was replaced | **flag** for a person to re-watch |
| 9. Spread | per `game_action`: no `team` more than twice; no `competition`, `competition_country` or confederation above half of the clips; at least one clip from each game where the action has five or more clips | **fail** with the counts |
| 10. Adults | `keeper.adult_professional` is `true` for every record | **fail** |

- A **fail** blocks the release, and the app hides that link at once (hiding is doing less,
  so it needs no approval).[^approval-decision] A **flag** blocks the release until a person
  clears it in the PR.
- A passing run writes `checked.at` and `checked.result: ok`. A replacement link is a new
  record, reviewed and approved again with its exercise.[^approval-decision]
- Steps 2 to 8 batch ids into a few `videos.list` and `channels.list` calls, which take a
  comma-separated list of ids.[^yt-api-videos]
- The check prints only public clip data. It never prints the API key.

# Examples

```yaml
- id: low-dive-01
  url: https://www.youtube.com/watch?v=RjTxA_Qrb3A
  platform: youtube
  video_id: RjTxA_Qrb3A
  start_s: null
  length_s: 17
  channel: { name: Major League Soccer, id: UCSZbXT5TLLW_i-5W8FZpFsg, kind: league,
             official_evidence: "verified badge; description links to the league's site" }
  shows: "late penalty; full-length low dive to his right, ball kept out at about 0:09"
  game_action: low-dive
  ...
```

The full sample is in the [low diving save sample](/dossiers/clip-sample-low-diving-save.md).

[^policy]: Clip link policy, sections 1 to 5.
[^yt-api-videos]: YouTube Data API, videos resource: snippet.channelId (can change), status.privacyStatus, status.uploadStatus, contentDetails.contentRating.ytRating, contentDetails.regionRestriction, contentDetails.duration.
[^yt-api-channels]: YouTube Data API, channels resource: snippet.title.
[^yt-verified]: YouTube Help, verification badges: official channel; a name change removes the badge.
[^yt-age-restricted]: YouTube Help, age-restricted content: not viewable signed out or under 18.
[^gk-power]: Goalkeeper-specific power: dives, jumps and punches as the position's decisive actions.
[^approval-decision]: Parent-approval Decision: approval bound to a content hash; doing less needs no approval.
