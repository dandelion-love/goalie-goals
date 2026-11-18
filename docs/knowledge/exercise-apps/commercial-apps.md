---
type: Research Finding
title: Well-known commercial training apps
description: How Nike Training Club, Freeletics, Seven, Fitbod, JEFIT, a goalkeeper app and Darebee explain an exercise; their patterns are ideas to learn from, their content is not reusable.
tags: [exercise-apps, commercial, ux-patterns, goalkeeper]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-11-17T00:00:00Z
sources:
  - { id: ntc-ggr, resource: https://www.garagegymreviews.com/nike-training-club-review, title: Garage Gym Reviews, Nike Training Club review }
  - { id: ntc-tg, resource: https://tomsguide.com/reviews/nike-training-club-app, title: Tom's Guide, Nike Training Club review }
  - { id: freeletics-skills, resource: https://www.freeletics.com/en/blog/posts/skill-progressions/, title: Freeletics blog, skill progressions }
  - { id: freeletics-easier, resource: https://www.freeletics.com/en/blog/posts/easier-bodyweight-exercises, title: Freeletics blog, easier bodyweight exercises }
  - { id: seven-store, resource: https://seven.app, title: Seven on the App Store }
  - { id: seven-review, resource: https://pushinteractions.com/app-review-7-minute-workout-seven, title: App review of Seven }
  - { id: fitbod-details, resource: https://fitbod.me, title: Fitbod on the App Store }
  - { id: fitbod-faq, resource: https://fitbod.me/faqs/, title: Fitbod FAQ }
  - { id: jefit-library, resource: https://www.jefit.com/exercises, title: JEFIT public exercise library }
  - { id: gk-app, resource: https://www.thegoalkeeperapp.com, title: The Goalkeeper App on the App Store }
  - { id: darebee-terms, resource: https://darebee.com/terms-of-use.html, title: Darebee terms of use }
---

# Summary

Commercial apps agree on a small set of things: a short demo loop before or during the move, two or three spoken or written cues, a visible timer or rep target, an easier swap when a move is too hard, and a feedback step after the session that steers the next one. They differ on how much text they show. All their videos, drawings and text are all-rights-reserved, so this app takes ideas only. Nothing here is copied.

# Apps

## Nike Training Club

- **Demo media:** every workout and move has a video demonstration, most led by certified trainers.[^ntc-ggr]
- **Before starting:** length, difficulty and equipment are shown up front, so the user knows what they are in for.[^ntc-ggr]
- **Cues:** form tips are given during the workout.[^ntc-tg]
- **Gaps reviewers note:** on-screen rep and time numbers can be hard to read, and with no live coaching there is no feedback on form.[^ntc-ggr]

Lesson: show length, level and equipment before the session; make the timer and the rep count big.

## Freeletics

- **Easier and harder versions:** Freeletics publishes easier versions of its common bodyweight moves (for example knee push-ups for push-ups) and suggests swapping to one mid-session, then telling the coach so later sessions adjust.[^freeletics-easier]
- **Progressions:** skill progressions are paths of exercises toward a skill; the user moves on by completing the set reps with correct technique and no breaks, then rating the session; mastered skills come back now and then for upkeep.[^freeletics-skills]
- **Self-check:** progress rests on the user's own honest rating after each exercise.[^freeletics-skills]

Lesson: a regression-progression ladder per skill, with a plain "move on when" rule and a post-session rating, is the core of a game-like path.

## Seven

- **Format:** short equipment-free circuits run by a workout timer that counts down the final seconds into each change, led by instructor voices with selectable personalities.[^seven-store][^seven-review]
- **Motivation:** achievements and a monthly challenge in which a few missed days are allowed before progress resets, like lives in a video game.[^seven-review][^seven-store]
- **Explanation:** the move is learned by doing it in a short timed loop rather than by reading; store reviews show users notice when the final countdown seconds run at the wrong speed, so timer accuracy matters.[^seven-store]

Lesson: for simple moves, a picture plus a big, accurate countdown and a voice is enough; a streak with a few allowed misses keeps motivation without guilt.

## Fitbod

- **Exercise details:** each exercise comes with video guidance and step-by-step instructions, from set-up to form.[^fitbod-details]
- **Cues:** written coaching cues alongside the video.[^fitbod-faq]

Lesson: keep the full step list one tap away from the video, so the demo stays short and the detail is still there.

## JEFIT

- **Exercise page:** a demonstration, category and equipment label, target muscles, then numbered steps split into setup, movement and tips.[^jefit-library]

Lesson: split text into setup, steps and tips; it reads faster than one paragraph.

## A goalkeeper training app

- **Format:** monthly goalkeeper sessions needing little equipment, each with a demo video, coaching points, a set-up diagram, an equipment list and focus points; separate videos show when each technique is used in a match.[^gk-app]
- **Feedback:** the keeper may upload video of themselves for a coach to review.[^gk-app]
- **Price:** subscription.[^gk-app]

Lesson: a set-up diagram (where the cones, the ball and the server stand) plus "when you use this in a match" turns a drill into something a teen cares about. The video-upload feature is **rejected** for this app: no recording of the keeper is ever made or stored.

## Darebee

- **Format:** a free, non-profit library of illustrated workouts and exercise posters with simple figures.
- **Terms:** materials may be shared but not altered and may not be included in any packaged product, apps included, even free ones.[^darebee-terms]

Lesson: the poster style (one figure per move, numbered, big labels) is a good model. The content itself is **not used**: its terms forbid use in an app.

# Licence position

All the apps above are proprietary. Their text, video, drawings and audio are protected and are not reused. Patterns such as "show an easier version" or "interval timer with voice" are general ideas, which are free to apply; this app writes and draws its own.

[^ntc-ggr]: Garage Gym Reviews, Nike Training Club review
[^ntc-tg]: Tom's Guide, Nike Training Club review
[^freeletics-skills]: Freeletics blog, skill progressions
[^freeletics-easier]: Freeletics blog, easier bodyweight exercises
[^seven-store]: Seven on the App Store
[^seven-review]: App review of Seven
[^fitbod-details]: Fitbod on the App Store
[^fitbod-faq]: Fitbod FAQ
[^jefit-library]: JEFIT public exercise library
[^gk-app]: The Goalkeeper App on the App Store
[^darebee-terms]: Darebee terms of use
