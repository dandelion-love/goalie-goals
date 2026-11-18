---
type: Research Finding
title: Add to Home Screen and the web app manifest on iPadOS
description: How a site becomes a Home Screen web app on iPadOS, what Safari reads from the manifest, and what it ignores.
tags: [platform, ipados, safari, pwa, manifest]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: webkit-26, resource: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/, title: "WebKit Features in Safari 26.0" }
  - { id: webkit-164, resource: https://webkit.org/blog/13966/webkit-features-in-safari-16-4/, title: "WebKit Features in Safari 16.4" }
  - { id: webkit-push, resource: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/, title: "Web Push for Web Apps on iOS and iPadOS" }
  - { id: webdev-manifest, resource: https://web.dev/learn/pwa/web-app-manifest, title: "web.dev Learn PWA: Web app manifest" }
  - { id: mdn-scope, resource: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope, title: "MDN: manifest scope member" }
  - { id: mdn-crossorigin, resource: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin, title: "MDN: HTML crossorigin attribute" }
---

# What happens on install

- Since iPadOS 26 (Safari 26), every site added to the Home Screen opens as a web app by
  default; the person can turn "Open as Web App" off and get a plain bookmark
  instead.[^webkit-26]
- A manifest is no longer required for the web-app experience on 26, and Safari 26 has no
  installability checks; manifest icons are still used when present.[^webkit-26]
- Before 26, a site opened as a web app only when its manifest `display` was `standalone`
  or `fullscreen`; otherwise it saved as a bookmark that opened in Safari.[^webkit-push]
- Since 16.4 the manifest `id` member lets separate installs of one app coexist, and other
  browsers on iPadOS can offer Add to Home Screen from their Share menu.[^webkit-164]
- Install is always a manual step by the person (Share, then Add to Home Screen); there is
  no install prompt the page can trigger.[^webkit-push]

# What Safari reads and ignores

| Member or tag | Safari behaviour |
| --- | --- |
| `name`, `short_name`, `icons`, `display`, `start_url`, `scope`, `id` | used[^webdev-manifest][^webkit-164] |
| `background_color` | ignored; splash screens come from a proprietary link tag, not the manifest[^webdev-manifest] |
| transparent icon areas | filled with a colour the site does not control: ship square, opaque icons[^webdev-manifest] |
| `apple-mobile-web-app-capable` meta | legacy; no longer recommended and can harm install[^webdev-manifest] |
| SVG and data-URL icons | supported from Safari 26[^webkit-26] |

Safari has no manifest debugger: the only check is to install on a real device.[^webdev-manifest]

# Scope

Navigations outside `scope` are not blocked; the installed app shows extra browser UI
(address and controls) while the person is off-scope.[^mdn-scope] This matters for a
sign-in redirect to another host (see
[Sign-in behind the proxy](/platform/sign-in-in-home-screen-app.md)).

# Manifest behind a sign-in proxy

A manifest request is made without credentials by default, even same-origin; a manifest
that needs a cookie must be linked with `crossorigin="use-credentials"`.[^mdn-crossorigin]
Behind a proxy that only lets signed-in accounts through, a credential-less manifest
request gets a sign-in redirect instead of JSON.

# Fallback

- iPadOS 18.4 to 25.x (below 26): the manifest with `display: standalone` is mandatory, or
  the app opens in a Safari tab with no push and no standalone window.[^webkit-push]
- If the person adds the app with "Open as Web App" off, the app detects
  `display-mode: browser` and shows a one-screen "install it properly" guide.

[^webkit-26]: WebKit blog, Safari 26.0 features: Home Screen web app section.
[^webkit-164]: WebKit blog, Safari 16.4 features: manifest id and Add to Home Screen in other browsers.
[^webkit-push]: WebKit blog, Web Push for Web Apps on iOS and iPadOS.
[^webdev-manifest]: web.dev, Learn PWA, web app manifest chapter.
[^mdn-scope]: MDN, manifest `scope`.
[^mdn-crossorigin]: MDN, `crossorigin` attribute, manifest example.
