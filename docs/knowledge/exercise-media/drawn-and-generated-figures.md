---
type: Research Finding
title: Drawn and generated figures
description: Ways to illustrate exercises that no open source covers - a simple vector figure with key poses, top-down set-up diagrams, low-poly tracing and AI-generated images - with licence, effort and fit.
tags: [exercise-media, illustration, svg, animation, ai-images]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:50:00Z }
sources:
  - { id: everkinetic, resource: https://github.com/everkinetic/data, title: Everkinetic open exercise data (two-frame line drawings) }
  - { id: gk-app, resource: https://www.thegoalkeeperapp.com, title: The Goalkeeper App on the App Store (set-up diagrams) }
  - { id: open-peeps, resource: https://www.openpeeps.com/, title: Open Peeps (CC0) }
  - { id: feeel-contributing, resource: https://gitlab.com/enjoyingfoss/feeel/-/blob/master/CONTRIBUTING.md, title: Feeel contributing guide, low-poly processing }
  - { id: fosstriangulator, resource: https://github.com/FOSStriangulator/FOSStriangulator, title: FOSStriangulator }
  - { id: inkscape, resource: https://inkscape.org/about/license/, title: Inkscape licence }
  - { id: mdn-svg, resource: https://developer.mozilla.org/en-US/docs/Web/SVG, title: MDN, SVG }
  - { id: mdn-waapi, resource: https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API, title: MDN, Web Animations API }
  - { id: usco-ai, resource: https://www.copyright.gov/ai/, title: US Copyright Office, copyright and artificial intelligence }
  - { id: wger-image-model, resource: https://github.com/wger-project/wger/blob/master/wger/exercises/models/image.py, title: wger exercise image model (AI-generated flag) }
---

# Summary

Goalkeeper technique has no open media, so the app draws its own. A single parametric vector figure posed by joint angles gives every exercise the same look at very low cost per new exercise, animates with built-in browser features, and shows no real person. Top-down set-up diagrams cover where cones, ball and parent stand. Low-poly tracing is a fallback; AI-generated images are not used without a person's decision.

# Options

## 1. A parametric vector figure (chosen as the main method)

- **How:** one figure made of simple shapes (head circle, rounded limbs, torso), defined once; a pose is a short list of joint angles stored as data. A small build step or runtime function turns a pose into SVG.[^mdn-svg] An exercise needs two to four poses (start, middle, end), the same idea as the two-frame line drawings in open sets.[^everkinetic]
- **Animation:** interpolate between poses with the Web Animations API or CSS; no library.[^mdn-waapi]
- **Style for a teen keeper:** thick rounded strokes, a keeper-kit colour fill, gloves highlighted, no facial features, no gender or skin cues beyond a neutral tone, arrows and motion lines in an accent colour. Character art from a CC0 set such as Open Peeps can inspire a mascot or parent figure.[^open-peeps]
- **Licence:** the app's own work, so the app chooses (CC BY-SA 4.0 fits if drawings are combined with adapted CC BY-SA art).
- **Effort:** a few days for the rig; minutes per new pose after that.

## 2. Top-down set-up diagrams

- **How:** a small SVG vocabulary (goal, cones, ball, keeper marker, parent marker, arrows for movement and for ball flight), placed by data. Goalkeeper apps pair each drill video with such a diagram.[^gk-app]
- **Use:** every drill that involves space, a server or a sequence.

## 3. Hand-drawn SVG for a few hero images

- Drawn in a free editor such as Inkscape, whose GPL licence covers the program, not the drawings made with it.[^inkscape] Used for badges, level art and onboarding, kept to the same palette.

## 4. Low-poly tracing of a licensed photo (fallback)

- **How:** take an openly licensed photo of an adult model (CC0, CC BY or CC BY-SA), triangulate it into a low-poly image with an open tool, as Feeel does.[^feeel-contributing][^fosstriangulator]
- **Limits:** the result inherits the photo's licence and credit; the tool is used offline and not shipped. Never a photo of the keeper or the family, even as a source to trace.

## 5. AI-generated images (not used by default)

- **Status:** in the US, purely machine-generated material is not protected by copyright, so nobody can grant a licence for it, while questions about training data remain open.[^usco-ai] Open databases have started to flag AI images separately.[^wger-image-model]
- **Risks for this app:** uneven anatomy that teaches wrong form, a style that drifts from image to image, and unclear provenance.
- **Position:** not used unless a person decides otherwise for a specific asset, in which case the asset is flagged as AI-generated in the credits.

# Comparison

| Option | Licence clarity | Consistent style | Cost per exercise | Shows a real person |
|---|---|---|---|---|
| Parametric figure | Own work | High | Very low | No |
| Set-up diagram | Own work | High | Very low | No |
| Hand-drawn SVG | Own work | Medium to high | Medium | No |
| Low-poly trace | Inherits photo licence | Medium | Medium | Hidden, but based on one |
| AI-generated | Unclear | Low | Low | No, but may resemble someone |

[^everkinetic]: Everkinetic open exercise data (two-frame line drawings)
[^gk-app]: The Goalkeeper App on the App Store (set-up diagrams)
[^open-peeps]: Open Peeps (CC0)
[^feeel-contributing]: Feeel contributing guide, low-poly processing
[^fosstriangulator]: FOSStriangulator
[^inkscape]: Inkscape licence
[^mdn-svg]: MDN, SVG
[^mdn-waapi]: MDN, Web Animations API
[^usco-ai]: US Copyright Office, copyright and artificial intelligence
[^wger-image-model]: wger exercise image model (AI-generated flag)
