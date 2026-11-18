---
type: Research Finding
title: Open motion libraries and runtimes compared
description: CSS and the Web Animations API, Motion for React, react-spring, canvas-confetti, lottie-web, dotlottie-web and the Rive web runtime, compared on licence, bundle size, iPad Safari performance and reduced-motion support.
tags: [motion, animation, libraries, licensing, performance, accessibility, ipados]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: caniuse-waapi, resource: https://caniuse.com/web-animation, title: "Can I use: Web Animations API" }
  - { id: caniuse-prm, resource: https://caniuse.com/prefers-reduced-motion, title: "Can I use: prefers-reduced-motion media query" }
  - { id: mdn-prm, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion, title: "MDN: prefers-reduced-motion" }
  - { id: webdev-anim, resource: https://web.dev/articles/animations-guide, title: "web.dev: How to create high-performance CSS animations (Basques and Andrew)" }
  - { id: motion-licence, resource: https://github.com/motiondivision/motion/blob/main/LICENSE.md, title: "Motion licence file (MIT, Motion B.V.)" }
  - { id: motion-size, resource: https://motion.dev/docs/react-reduce-bundle-size, title: "Motion docs: reduce bundle size" }
  - { id: motion-lazy, resource: https://motion.dev/docs/react-lazy-motion, title: "Motion docs: LazyMotion" }
  - { id: motion-a11y, resource: https://motion.dev/docs/react-accessibility, title: "Motion docs: accessibility and reduced motion" }
  - { id: motion-perf, resource: https://motion.dev/docs/performance, title: "Motion docs: web animation performance" }
  - { id: bp-motion, resource: https://bundlephobia.com/package/motion, title: "Bundlephobia: motion" }
  - { id: spring-licence, resource: https://github.com/pmndrs/react-spring/blob/next/LICENSE, title: "react-spring licence file (MIT)" }
  - { id: spring-prm, resource: https://react-spring.dev/docs/utilities/use-reduced-motion, title: "react-spring docs: useReducedMotion" }
  - { id: bp-spring, resource: https://bundlephobia.com/package/@react-spring/web, title: "Bundlephobia: @react-spring/web" }
  - { id: confetti, resource: https://github.com/catdad/canvas-confetti, title: "canvas-confetti README" }
  - { id: confetti-licence, resource: https://github.com/catdad/canvas-confetti/blob/master/LICENSE, title: "canvas-confetti licence file (ISC)" }
  - { id: bp-confetti, resource: https://bundlephobia.com/package/canvas-confetti, title: "Bundlephobia: canvas-confetti" }
  - { id: lottie-web, resource: https://github.com/airbnb/lottie-web, title: "lottie-web README" }
  - { id: lottie-licence, resource: https://github.com/airbnb/lottie-web/blob/master/LICENSE.md, title: "lottie-web licence file (MIT)" }
  - { id: lottie-eval, resource: https://github.com/airbnb/lottie-web/issues/2927, title: "lottie-web issue: use of eval in the player" }
  - { id: bp-lottie, resource: https://bundlephobia.com/package/lottie-web, title: "Bundlephobia: lottie-web" }
  - { id: dotlottie-licence, resource: https://github.com/LottieFiles/dotlottie-web/blob/main/LICENSE, title: "dotlottie-web licence file (MIT)" }
  - { id: bp-dotlottie, resource: https://bundlephobia.com/package/@lottiefiles/dotlottie-web, title: "Bundlephobia: @lottiefiles/dotlottie-web" }
  - { id: rive-licence, resource: https://github.com/rive-app/rive-wasm/blob/master/LICENSE, title: "Rive web runtime licence file (MIT)" }
  - { id: rive-sizes, resource: https://rive.app/docs/runtimes/runtime-sizes, title: "Rive docs: runtime sizes" }
  - { id: rive-renderers, resource: https://rive.app/docs/runtimes/web/canvas-vs-webgl, title: "Rive docs: canvas vs WebGL renderers" }
---

# Summary

Every runtime checked is MIT or ISC, so none blocks a public repo or a hosted app. They
differ by two orders of magnitude in weight: canvas-confetti is about 4 kB gzipped, the
Motion for React lazy core about 5 kB, lottie-web 75 kB, and the Rive web runtime 222 to
648 kB, mostly WebAssembly. Only Motion for React and react-spring switch to reduced motion
with one setting; canvas-confetti has an opt-in flag; lottie-web and Rive leave it to the
caller. The licence of a runtime says nothing about the animation files played on it: see
[animation file licences](/motion/animation-file-licences.md).

# Comparison

Sizes are minified and gzipped unless marked, from the package's own docs or Bundlephobia
at the version shown, checked 2026-11-18.

| Library | Licence (checked on) | Size | Reduced motion | iPad Safari notes |
| --- | --- | --- | --- | --- |
| CSS transitions and the Web Animations API (browser built-ins) | none needed | 0 kB | `@media (prefers-reduced-motion: reduce)` and `matchMedia` in script; Safari 10.1 and iOS Safari 10.3 onward[^caniuse-prm][^mdn-prm] | Full support from iOS Safari 13.4;[^caniuse-waapi] `transform` and `opacity` are the cheapest properties to animate[^webdev-anim] |
| Motion for React (`motion`) | MIT, licence file[^motion-licence] | `m` with `LazyMotion` about 5 kB at first render, plus 24 kB for the `domAnimation` features or 38 kB for `domMax`; the full `motion` component 43 kB; `useAnimate` mini 3.3 kB; `useReducedMotion` about 1 kB (Rollup figures from the docs)[^motion-size][^motion-lazy] Whole package 62.8 kB at v14.14.0[^bp-motion] | `MotionConfig reducedMotion="user"` turns off transform and layout animation app-wide and keeps opacity and colour; `useReducedMotion` hook for custom swaps[^motion-a11y] | Built on the Web Animations API, so `transform` and `opacity` can run off the main thread; springs and JS-driven values stay on the main thread[^motion-perf] |
| react-spring (`@react-spring/web`) | MIT, licence file[^spring-licence] | 19.8 kB at v10.1.2[^bp-spring] | `useReducedMotion` hook; with `Globals` `skipAnimation` every spring jumps to its end value[^spring-prm] | Spring physics computed in JavaScript each frame, which always runs on the main thread[^motion-perf] |
| canvas-confetti | ISC, licence file[^confetti-licence] | 4.2 kB (10.2 kB minified) at v1.9.4[^bp-confetti] | `disableForReducedMotion` option; **off by default**, so the app must set it[^confetti] | Draws on one canvas; `useWorker` moves drawing to a worker where supported and is ignored where not[^confetti] |
| lottie-web | MIT, licence file[^lottie-licence] | 75.0 kB (298.7 kB minified) at v5.13.0[^bp-lottie] | Nothing built in; the caller checks the preference and shows a still frame[^lottie-web] | SVG, canvas or HTML renderer;[^lottie-web] the full build uses `eval` for expressions, and the light build without expressions avoids it[^lottie-eval] |
| dotlottie-web | MIT, licence file[^dotlottie-licence] | 30.7 kB JS at v0.83.2, before its WebAssembly renderer[^bp-dotlottie] | Not documented in the sources checked | Canvas renderer in WebAssembly; not measured here |
| Rive web runtime (`@rive-app/*`) | MIT, licence file[^rive-licence] | Brotli-compressed, mostly WebAssembly: `canvas-lite` 222 kB, `canvas` 567 kB, `webgl2` 648 kB (Rive docs, January 2026)[^rive-sizes] | Nothing built in; the caller pauses the state machine or shows a still state | `webgl2` blend modes other than Normal are expensive on mobile; `canvas` can be faster; WebGL context limits apply[^rive-renderers] |

# What the numbers mean here

- **Weight against a lesson-sized app.** The app is a React and Vite web app installed on
  an iPad ([front-end approach](/decisions/frontend-approach.md)). A 4 kB confetti burst or
  a 5 kB lazy motion core is noise; a 222 kB or larger WebAssembly runtime is several
  times the size of React itself and must also be cached offline.
- **Main thread versus compositor.** A session runs a countdown, audio cues and a wake
  lock. Animations that stay on `transform` and `opacity` through CSS or the Web Animations
  API leave the main thread free for the timer;[^webdev-anim][^motion-perf] per-frame
  JavaScript (springs, particle canvases, Lottie and Rive players) competes with it.
- **Reduced motion is not free in all of them.** The two React libraries switch globally;
  canvas-confetti needs a flag; lottie-web and Rive need code in every place they play.
- **Nothing here was measured on an iPad.** The performance notes come from each
  project's documentation and general browser guidance; frame timing on the target iPad
  is a check for the build story, not a finding.

[^caniuse-waapi]: Can I use, Web Animations API
[^caniuse-prm]: Can I use, prefers-reduced-motion
[^mdn-prm]: MDN, prefers-reduced-motion
[^webdev-anim]: web.dev, high-performance CSS animations
[^motion-licence]: Motion licence file
[^motion-size]: Motion docs, reduce bundle size
[^motion-lazy]: Motion docs, LazyMotion
[^motion-a11y]: Motion docs, accessibility
[^motion-perf]: Motion docs, performance
[^bp-motion]: Bundlephobia, motion
[^spring-licence]: react-spring licence file
[^spring-prm]: react-spring docs, useReducedMotion
[^bp-spring]: Bundlephobia, @react-spring/web
[^confetti]: canvas-confetti README
[^confetti-licence]: canvas-confetti licence file
[^bp-confetti]: Bundlephobia, canvas-confetti
[^lottie-web]: lottie-web README
[^lottie-licence]: lottie-web licence file
[^lottie-eval]: lottie-web issue on eval
[^bp-lottie]: Bundlephobia, lottie-web
[^dotlottie-licence]: dotlottie-web licence file
[^bp-dotlottie]: Bundlephobia, dotlottie-web
[^rive-licence]: Rive web runtime licence file
[^rive-sizes]: Rive docs, runtime sizes
[^rive-renderers]: Rive docs, canvas vs WebGL
