---
type: Pattern
title: Elements of a clear exercise explanation
description: The parts proven training apps use to explain an exercise without a coach, compared across apps, and the exercise card shape this app should use.
tags: [exercise-apps, ux-patterns, exercise-card, safety, timers]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:20:00Z }
sources:
  - { id: wger-api-exercise, resource: "https://wger.de/api/v2/exerciseinfo/?format=json", title: wger API, exerciseinfo endpoint }
  - { id: wger-image-model, resource: https://github.com/wger-project/wger/blob/master/wger/exercises/models/image.py, title: wger exercise image model }
  - { id: exercises-json-contrib, resource: https://github.com/wrkout/exercises.json/blob/master/CONTRIBUTING.md, title: exercises.json contributing guide (naming and alias convention) }
  - { id: free-exercise-db, resource: https://github.com/yuhonas/free-exercise-db, title: free-exercise-db repository (schema idea) }
  - { id: ntc-ggr, resource: https://www.garagegymreviews.com/nike-training-club-review, title: Garage Gym Reviews, Nike Training Club review }
  - { id: ntc-tg, resource: https://tomsguide.com/reviews/nike-training-club-app, title: Tom's Guide, Nike Training Club review }
  - { id: freeletics-skills, resource: https://www.freeletics.com/en/blog/posts/skill-progressions/, title: Freeletics blog, skill progressions }
  - { id: freeletics-easier, resource: https://www.freeletics.com/en/blog/posts/easier-bodyweight-exercises, title: Freeletics blog, easier bodyweight exercises }
  - { id: fitbod-faq, resource: https://fitbod.me/faqs/, title: Fitbod FAQ }
  - { id: seven-store, resource: https://seven.app, title: Seven on the App Store }
  - { id: seven-review, resource: https://pushinteractions.com/app-review-7-minute-workout-seven, title: App review of Seven }
  - { id: fitbod-details, resource: https://fitbod.me, title: Fitbod on the App Store }
  - { id: jefit-library, resource: https://www.jefit.com/exercises, title: JEFIT public exercise library }
  - { id: gk-app, resource: https://www.thegoalkeeperapp.com, title: The Goalkeeper App on the App Store }
  - { id: feeel-contributing, resource: https://gitlab.com/enjoyingfoss/feeel/-/blob/master/CONTRIBUTING.md, title: Feeel contributing guide }
  - { id: mdn-wakelock, resource: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API, title: MDN, Screen Wake Lock API }
  - { id: mdn-speech, resource: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis, title: MDN, SpeechSynthesis }
  - { id: mdn-vibrate, resource: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate, title: MDN, Navigator.vibrate }
  - { id: mdn-reduced-motion, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion, title: MDN, prefers-reduced-motion }
---

# Comparison

Which apps make each element explicit, from their public pages and reviews. "Text" means it may appear inside free text but has no field or screen of its own; "n/c" means the public sources did not show it either way, so it was not checked.

| Element | wger | Feeel | Nike TC | Freeletics | Seven | Fitbod | JEFIT | Goalkeeper app |
|---|---|---|---|---|---|---|---|---|
| Name and aliases | yes, aliases per language[^wger-api-exercise] | name | name | name | name | name | name | drill name |
| Short cues | notes list[^wger-api-exercise] | no | tips during workout[^ntc-tg] | n/c | instructor voice[^seven-review] | written cues[^fitbod-faq] | tips section[^jefit-library] | coaching points[^gk-app] |
| Common mistakes | text | no | n/c | n/c | n/c | text | text | focus points[^gk-app] |
| Regressions, progressions | variation group[^wger-api-exercise] | no | filter by level[^ntc-ggr] | easier versions, skill paths[^freeletics-easier][^freeletics-skills] | n/c | n/c | no | new sessions monthly[^gk-app] |
| Tempo and rep counting | no | timed | on-screen count[^ntc-ggr] | reps, then rating[^freeletics-skills] | timed[^seven-store] | n/c | sets and reps | n/c |
| Timers | no | timed sequence | yes[^ntc-ggr] | n/c | workout timer with final-seconds countdown[^seven-store] | n/c | n/c | n/c |
| Demo media | images, video, muscle map[^wger-api-exercise] | picture per move | trainer video[^ntc-ggr] | n/c | n/c | video[^fitbod-details] | demo[^jefit-library] | video and set-up diagram[^gk-app] |
| Form self-check | no | no | none, a noted gap[^ntc-ggr] | honest post-move rating[^freeletics-skills] | no | n/c | no | video upload to a coach[^gk-app] |
| Before-start summary | no | no | time, level, kit[^ntc-ggr] | n/c | n/c | n/c | no | kit list[^gk-app] |

# Findings

1. **Short cues beat long text.** Apps that work without a coach give two or three cues at the moment of the move, by voice or a line on screen, and keep the full steps one tap away.
2. **Every hard move has an easier sibling.** Freeletics publishes easier versions of common moves and suggests swapping mid-session;[^freeletics-easier] wger groups variations.[^wger-api-exercise] A "move on when" rule turns the list into a path.[^freeletics-skills]
3. **Timers carry the session.** Big, accurate countdowns with a voice or beep for the last seconds; users notice and complain when the countdown drifts.[^seven-store] Allowed misses on a streak help keep teens going.[^seven-review]
4. **Demo media is short and looped.** A two-to-four frame picture or a short loop, shown before and during the move. The goalkeeper app adds a set-up diagram and "when you use this in a match".[^gk-app]
5. **Form checks are the weakest part everywhere.** Reviewers name the lack of form feedback as a gap;[^ntc-ggr] Freeletics relies on self-rating;[^freeletics-skills] the goalkeeper app uses video upload.[^gk-app] With a parent present, a short checklist the parent watches for is a better fit and needs no camera.
6. **Name, aliases and naming convention.** A stable id, one display name, aliases for other common names, and the equipment in brackets when it changes the move.[^exercises-json-contrib]

# Exercise card

The shape this app should use for every exercise. Field names are this app's own; the idea of one structured file per exercise validated by a schema is borrowed from the open datasets.[^free-exercise-db]

# Schema

| Field | Purpose | Shown when |
|---|---|---|
| `id` | Stable slug, never changes | never |
| `name`, `aliases` | Display name; other names people use | card title; search |
| `why` | One sentence linking the move to a keeper skill (jump, reach, footwork, reaction) | card intro |
| `setup` | Space, equipment, where the parent stands, a set-up diagram reference | before start |
| `steps` | Three to five numbered steps | one tap away |
| `cues` | Two or three cues of a few words, spoken and shown during the move | during move |
| `mistakes` | Two or three common mistakes, each with its fix | card; parent view |
| `parent_check` | Two or three things the parent watches for, ticked after the set | after set |
| `stop_if` | Safety stop signals (pain, dizziness, landing on a straight knee) | before start; card |
| `easier`, `harder` | Links to sibling exercises, plus a `move_on_when` rule | swap button; path |
| `dose` | Reps or time, sets, rest; optional tempo in plain words | timer |
| `timer` | `reps`, `interval` (work and rest), `countdown`, or `none` | timer |
| `media` | Asset ids for start and end poses or a loop, and the diagram | card; during move |
| `credits` | For adapted content: source URL, author, licence, changes made | credit line |
| `licence` | The licence of this card's text | credits page |

**Tempo** is written as words a teen reads at a glance ("down slow for three, up fast"), not as a code like 3-1-X.

# Delivery on the web, with no extra libraries

- Keep the screen on during a session with the Screen Wake Lock API.[^mdn-wakelock]
- Speak cues and the last-seconds countdown with the browser's speech synthesis.[^mdn-speech]
- Buzz on phase change where the device allows it.[^mdn-vibrate]
- Respect reduced-motion settings: show still start and end poses instead of a loop.[^mdn-reduced-motion]

# Privacy

No feature records the keeper. The form check is the parent's eyes plus a checklist, not a camera; the goalkeeper app's video-upload model is not adopted. Media that shows a real person's face is not used; the identity-hiding illustration practice seen in Feeel is the model.[^feeel-contributing][^wger-image-model]

[^wger-api-exercise]: wger API, exerciseinfo endpoint
[^wger-image-model]: wger exercise image model
[^exercises-json-contrib]: exercises.json contributing guide (naming and alias convention)
[^free-exercise-db]: free-exercise-db repository (schema idea)
[^ntc-ggr]: Garage Gym Reviews, Nike Training Club review
[^ntc-tg]: Tom's Guide, Nike Training Club review
[^freeletics-skills]: Freeletics blog, skill progressions
[^seven-store]: Seven on the App Store
[^seven-review]: App review of Seven
[^fitbod-details]: Fitbod on the App Store
[^jefit-library]: JEFIT public exercise library
[^gk-app]: The Goalkeeper App on the App Store
[^feeel-contributing]: Feeel contributing guide
[^mdn-wakelock]: MDN, Screen Wake Lock API
[^mdn-speech]: MDN, SpeechSynthesis
[^mdn-vibrate]: MDN, Navigator.vibrate
[^mdn-reduced-motion]: MDN, prefers-reduced-motion
[^freeletics-easier]: Freeletics blog, easier bodyweight exercises
[^fitbod-faq]: Fitbod FAQ
