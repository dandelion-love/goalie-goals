---
type: Research Finding
title: Video and animation sources
description: Creative Commons and stock video, LottieFiles animations and the open Lottie players, with licences and fit, and why the app animates its own vector figures instead.
tags: [exercise-media, video, animation, lottie, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:45:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: yt-cc, resource: https://support.google.com/youtube/answer/2797468, title: YouTube help, Creative Commons licence on videos }
  - { id: commons-reuse, resource: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia, title: Wikimedia Commons, reusing content outside Wikimedia }
  - { id: commons-people, resource: https://commons.wikimedia.org/wiki/Commons:Photographs_of_identifiable_people, title: Wikimedia Commons, photographs of identifiable people }
  - { id: wger-api-video, resource: "https://wger.de/api/v2/video/?format=json", title: wger API, exercise video endpoint }
  - { id: pexels, resource: https://www.pexels.com/license/, title: Pexels licence }
  - { id: unsplash, resource: https://unsplash.com/license, title: Unsplash licence }
  - { id: lottie-licence, resource: https://help.lottiefiles.com/animation-licensing-basics-, title: LottieFiles help, animation licensing basics }
  - { id: lottie-web, resource: https://github.com/airbnb/lottie-web, title: lottie-web player (MIT) }
  - { id: dotlottie-web, resource: https://github.com/LottieFiles/dotlottie-web, title: dotlottie-web player (MIT) }
  - { id: darebee-terms, resource: https://darebee.com/terms-of-use.html, title: Darebee terms of use }
  - { id: mdn-waapi, resource: https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API, title: MDN, Web Animations API }
  - { id: mdn-reduced-motion, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion, title: MDN, prefers-reduced-motion }
---

# Summary

Openly licensed exercise video exists but shows real people, varies in quality, and needs per-video licence checks; stock sites use custom licences rather than Creative Commons. Lottie animation files from LottieFiles use a custom licence with an anti-compilation clause. The open players are fine, but this app does not need them: a few vector key poses animated with the browser's own animation features cover a short demo loop. The app therefore ships no third-party video in its first version.

# Creative Commons video

| Source | Licence | Attribution | Fit |
|---|---|---|---|
| YouTube videos marked CC | CC BY only; valid only where the uploader had the right to license the content[^yt-cc] | Title, author, source URL and licence[^yt-cc] | Legal per video if the uploader truly owns it. Embedding loads a third-party player that tracks viewers, and the videos show real people. Not used. |
| Wikimedia Commons video | Per file[^commons-reuse] | Creator, licence, link[^commons-reuse] | Few exercise clips; personality rights apply to people shown.[^commons-people] Not used. |
| wger videos | Per file; the records checked were CC BY-SA 4[^wger-api-video] | Author, licence, link | Real people; small set. Not used for v1; may be linked out later on a person's decision. |

# Stock photo and video sites

| Source | Licence | Notable limits | Fit |
|---|---|---|---|
| Pexels | Own licence, not Creative Commons[^pexels] | No redistribution on other stock platforms; identifiable people may not be shown in a bad light; no implied endorsement[^pexels] | Real people; a custom licence the app would have to track. Not used. |
| Unsplash | Own licence, not Creative Commons[^unsplash] | No compiling images to build a similar or competing service[^unsplash] | Same. Not used. |

# Animation files

| Source | Licence | Notable limits | Fit |
|---|---|---|---|
| LottieFiles public animations | Lottie Simple License, a custom licence; commercial use allowed, attribution recommended[^lottie-licence] | No collecting animations to build a competing service[^lottie-licence]; provenance rests on each uploader | Uneven style, few exercise loops, unclear provenance. Not used. |
| lottie-web and dotlottie-web players | MIT[^lottie-web][^dotlottie-web] | none | Usable if the app ever authors its own Lottie files; not needed now. |
| Darebee animated and poster material | Own terms | No alteration; no use in any app[^darebee-terms] | Rejected. |

# The app's own animation

A short demo loop is two to four key poses of the app's own vector figure, cross-faded or interpolated with CSS or the Web Animations API, which every current browser supports with no library.[^mdn-waapi] When the device asks for reduced motion, the card shows the start and end poses side by side instead.[^mdn-reduced-motion] See [drawn and generated figures](/exercise-media/drawn-and-generated-figures.md).

[^yt-cc]: YouTube help, Creative Commons licence on videos
[^commons-reuse]: Wikimedia Commons, reusing content outside Wikimedia
[^commons-people]: Wikimedia Commons, photographs of identifiable people
[^wger-api-video]: wger API, exercise video endpoint
[^pexels]: Pexels licence
[^unsplash]: Unsplash licence
[^lottie-licence]: LottieFiles help, animation licensing basics
[^lottie-web]: lottie-web player (MIT)
[^dotlottie-web]: dotlottie-web player (MIT)
[^darebee-terms]: Darebee terms of use
[^mdn-waapi]: MDN, Web Animations API
[^mdn-reduced-motion]: MDN, prefers-reduced-motion
