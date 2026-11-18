---
type: Decision
title: Motion libraries and reduced-motion fallbacks
description: CSS and the Web Animations API for most motion, Motion for React loaded lazily for the reward moments, canvas-confetti for the finish, no Lottie or Rive for now, only original or CC0 animation files, and a still fallback for every moment.
tags: [decision, motion, animation, accessibility, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: runtimes, resource: /motion/libraries-and-runtimes.md, title: "Open motion libraries and runtimes compared" }
  - { id: files, resource: /motion/animation-file-licences.md, title: "Animation file licences, checked apart from runtimes" }
  - { id: principles, resource: /motion/motion-principles.md, title: "Motion principles for this app" }
  - { id: ux-decision, resource: /decisions/ux-patterns.md, title: "UX patterns decision" }
  - { id: frontend, resource: /decisions/frontend-approach.md, title: "Front-end approach decision" }
  - { id: media, resource: /decisions/exercise-media.md, title: "Exercise media decision" }
  - { id: motion-licence, resource: https://github.com/motiondivision/motion/blob/main/LICENSE.md, title: "Motion licence file (MIT)" }
  - { id: confetti-licence, resource: https://github.com/catdad/canvas-confetti/blob/master/LICENSE, title: "canvas-confetti licence file (ISC)" }
  - { id: lottie-licence, resource: https://github.com/airbnb/lottie-web/blob/master/LICENSE.md, title: "lottie-web licence file (MIT)" }
  - { id: dotlottie-licence, resource: https://github.com/LottieFiles/dotlottie-web/blob/main/LICENSE, title: "dotlottie-web licence file (MIT)" }
  - { id: rive-licence, resource: https://github.com/rive-app/rive-wasm/blob/master/LICENSE, title: "Rive web runtime licence file (MIT)" }
  - { id: spring-licence, resource: https://github.com/pmndrs/react-spring/blob/next/LICENSE, title: "react-spring licence file (MIT)" }
  - { id: lottie-files, resource: https://lottiefiles.com/page/license, title: "LottieFiles: Lottie Simple License" }
  - { id: rive-marketplace, resource: https://rive.app/docs/community/marketplace-overview, title: "Rive docs: Marketplace overview" }
---

# Context

The UX Decision named canvas-confetti, lottie-web and the Rive runtime as candidates for
celebration and designer animation.[^ux-decision] The comparison[^runtimes] gives them
numbers, and the principles[^principles] say which moments move and what stays still
during a set. The app is React and Vite on an iPad, offline-first.[^frontend]

# Decision

1. **CSS transitions and the Web Animations API** for press feedback, crossfades, the set
   check mark and the countdown. No library, 0 kB, compositor-friendly.
2. **Motion for React (`motion`, MIT)**[^motion-licence] for the reward moments (XP chip
   and bar, streak bump, summary card entering), as `m` components inside `LazyMotion`
   with `domAnimation` loaded **asynchronously**, so the first render carries about 5 kB
   and the features load before the first set ends.[^runtimes] The app root wraps
   everything in `MotionConfig reducedMotion="user"`.
3. **canvas-confetti (ISC)**[^confetti-licence] for the finish only, one burst, about
   4 kB, always called with `disableForReducedMotion: true` and built-in shapes or the
   app's own paths.[^runtimes][^files]
4. **No Lottie or Rive for now.** lottie-web is 75 kB and needs `eval` for
   expressions; Rive is 222 kB or more of WebAssembly; neither switches to reduced motion
   by itself, and the app has no designer-made files to play.[^runtimes] Revisit if the
   app gets an original animated character: then the Rive `canvas-lite` runtime or the
   lottie-web light build, with files the app made itself.
5. **react-spring is not added**: it is a sound MIT library,[^spring-licence] but it
   overlaps Motion and runs every frame in JavaScript.[^runtimes]
6. **Animation files are original or CC0, never from LottieFiles or the Rive
   Marketplace.** LottieFiles uses a custom licence; Marketplace files are CC BY with
   provenance resting on each uploader.[^files][^lottie-files][^rive-marketplace] Each file
   gets a credits entry like any other media.[^media]

# Each moment and its reduced-motion fallback

| Moment | Full motion | Built with | Reduced motion |
| --- | --- | --- | --- |
| Button press | Scale to about 0.96 and darken, 100 ms | CSS `:active` transition | Darken only, no scale |
| Set done | Check draws in, row settles, 200 ms | CSS or Web Animations API on the SVG check | Check appears at once; row colour changes |
| XP gain | "+N XP" chip rises and fades; bar fills 400 to 600 ms, after the set | Motion `m` components | Number shown at once; bar set to its new value with a 150 ms opacity crossfade |
| Streak | Count bumps once, 300 ms; larger at a milestone | Motion spring with little overshoot | Count and a "milestone" label appear with a crossfade; no scale |
| Finish | Summary card enters 300 ms, one confetti burst; "Done for today" live at once | Motion `AnimatePresence`, canvas-confetti | Card fades in; no confetti; same summary text |
| Pause or stop, pain report | Calm 200 ms crossfade; nothing celebratory | CSS | Instant change |
| During a set | Only the countdown advances, linearly | CSS or Web Animations API | Same: the countdown is the information. Figure loop shows a still key pose |

The device setting (`prefers-reduced-motion`) is the default; a settings switch can turn
motion down for either person even when the device does not ask.

# Licence table

| Runtime | Licence | Checked on | Use |
| --- | --- | --- | --- |
| Motion for React | MIT | project licence file[^motion-licence] | Adopted |
| canvas-confetti | ISC | project licence file[^confetti-licence] | Adopted |
| react-spring | MIT | project licence file[^spring-licence] | Not added |
| lottie-web | MIT | project licence file[^lottie-licence] | Not now |
| dotlottie-web | MIT | project licence file[^dotlottie-licence] | Not now |
| Rive web runtime | MIT | project licence file[^rive-licence] | Not now |

| Animation files | Licence | Checked on | Use |
| --- | --- | --- | --- |
| The app's own SVG and motion | the repo's MIT licence | this repo | Adopted |
| CC0 files with a named source page | CC0 1.0 | each file's source page | Allowed per file, with credits |
| LottieFiles free animations | Lottie Simple License (custom) | platform licence page[^lottie-files] | Never |
| Rive Marketplace files | CC BY 4.0 | Rive docs[^rive-marketplace] | Not used; a person may approve one file, credited |

# Consequences

- As built (story #78), Motion's `m` core measured about 17 kB gzipped at motion 14.14.0,
  not the 5 kB the docs give, so none of Motion is in the first render. `m`, `LazyMotion`
  with `domAnimation`, and a `MotionConfig reducedMotion="user"` around each reward element
  live in a lazy `rewards` chunk of about 31 kB gzipped. It loads 1 s after first render and
  again at session start, and is precached for offline sessions. canvas-confetti is its own
  lazy chunk of about 4 kB, loaded at session start. First render grows about 3 kB: the Web
  Animations API moments, the tokens and the pressed states. A reward element that mounts
  before the chunk arrives shows still, never hidden.
- A custom path shape is passed to canvas-confetti with its matrix precomputed (story #98).
  Without one, `shapeFromPath` tests a 500 by 500 grid of points to measure the path: one call
  was a 210 to 350 ms main-thread task at 4x CPU. With the matrix it takes under a
  millisecond, runs once when the chunk loads, and is reused. A finish that comes before
  the shapes are ready skips the burst rather than waiting. The burst starts in a task of
  its own, after the finish screen's.
- The large screen changes (Start session, each step moving on, Done for today) are React
  transitions (story #98), so a tap paints its response before the new screen renders.
  Stop and "Something hurts" stay urgent. The audio context is made while the keeper's
  home is idle, so the Start tap only resumes it.
- Two parts of the table above are not built yet and are left for a later story: the XP
  bar filling (the app has no XP bar yet) and the larger streak bump with a "milestone"
  label (the app has no milestone rule yet).
- Something hurts and Stop never move: held, they darken only, in every motion setting.
- Every moving component has a test that renders it with reduced motion on and checks the
  same text and numbers appear.
- Frame timing has not been measured on an iPad; the first build story with motion checks
  the finish moment on a real device alongside a running countdown.

# Undo

Each choice is reversible: CSS moments need no library; removing Motion means swapping
`m` components for CSS classes; removing canvas-confetti leaves the summary card as the
whole finish.

[^runtimes]: Open motion libraries and runtimes compared
[^files]: Animation file licences
[^principles]: Motion principles for this app
[^ux-decision]: UX patterns decision
[^frontend]: Front-end approach decision
[^media]: Exercise media decision
[^motion-licence]: Motion licence file
[^confetti-licence]: canvas-confetti licence file
[^lottie-licence]: lottie-web licence file
[^dotlottie-licence]: dotlottie-web licence file
[^rive-licence]: Rive web runtime licence file
[^spring-licence]: react-spring licence file
[^lottie-files]: LottieFiles, Lottie Simple License
[^rive-marketplace]: Rive docs, Marketplace overview
