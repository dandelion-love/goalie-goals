---
type: Research Finding
title: Google sign-in behind the cloud sign-in proxy in a Home Screen web app
description: How the identity-aware proxy's session cookie, redirects and 401s behave for an installed iPad web app, and the patterns that keep sign-in working.
tags: [platform, ipados, sign-in, proxy, cookies]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:15:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: iap-sessions, resource: https://docs.cloud.google.com/iap/docs/sessions-howto, title: "Identity-Aware Proxy: Managing sessions" }
  - { id: iap-signed, resource: https://docs.cloud.google.com/iap/docs/signed-headers-howto, title: "Identity-Aware Proxy: Securing your app with signed headers" }
  - { id: mdn-scope, resource: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope, title: "MDN: manifest scope member" }
  - { id: mdn-crossorigin, resource: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin, title: "MDN: HTML crossorigin attribute" }
  - { id: pwa-cookies, resource: https://www.netguru.com/blog/how-to-share-session-cookie-or-state-between-pwa-in-standalone-mode-and-safari-on-ios, title: "Community write-up: sharing session state between an iOS standalone PWA and Safari" }
  - { id: google-auth-lib, resource: https://github.com/googleapis/google-auth-library-nodejs, title: "google-auth-library for Node.js (Apache-2.0)" }
---

# How the proxy signs people in

- The proxy gives the browser a session cookie tied to the person's Google sign-in. For
  Google accounts the session lasts as long as the Google session does; signing out,
  suspension or a password reset forces a new sign-in, and the proxy re-checks
  authorization on every request.[^iap-sessions]
- When the session has expired, a normal page load is redirected to the Google sign-in
  flow (invisibly if the person is still signed in to Google). A request the proxy
  recognises as script-driven gets HTTP `401` instead; sending the header
  `X-Requested-With: XMLHttpRequest` makes that detection reliable.[^iap-sessions]
- For single-page apps the documented pattern on a `401` is: show a control; on tap, open a
  new window at the app URL with the session-refresh query parameter the docs name; poll a
  cheap endpoint until it stops returning `401`; close the window.[^iap-sessions]
- The proxy adds a signed JWT header to each request; the app should verify its signature,
  issuer, audience and expiry, which protects it if the proxy is ever bypassed or
  misconfigured.[^iap-signed] The open-source `google-auth-library` can verify it.[^google-auth-lib]

# What changes in a Home Screen web app

- An installed web app on iOS and iPadOS keeps its own cookie and storage partition,
  separate from Safari, so signing in in Safari does not sign the installed app in. This is
  community-reported, not stated in WebKit docs, and has varied by version; test on the
  target device.[^pwa-cookies]
- The Google sign-in pages are on another host, outside the manifest `scope`. Off-scope
  navigation is not blocked: the app window shows browser UI until the redirect returns to
  the app.[^mdn-scope]
- The manifest and icons are fetched without cookies unless the manifest link carries
  `crossorigin="use-credentials"`.[^mdn-crossorigin]
- `window.open` from a standalone app may open an in-app browser sheet whose cookie jar
  is not guaranteed to be the app's; whether the session-refresh window's cookie reaches
  the installed app is not documented by Apple or the proxy docs. Treat it as unverified.

# Patterns that follow

1. First run happens inside the installed app: the first top-level load of `start_url` goes
   through the proxy, the redirect to Google and back, and the cookie lands in the app's own
   partition.[^iap-sessions][^pwa-cookies]
2. Every API call uses `credentials: 'same-origin'` and `X-Requested-With`, so an expired
   session shows as a `401`, never as an opaque cross-origin redirect.[^iap-sessions]
3. The service worker never serves a cached page in place of a live navigation when the
   network is up, and never caches a redirect.
4. On `401`: keep unsaved work in the IndexedDB outbox, show **Reconnect**, then try the
   documented refresh window; if polling still returns `401` after about 20 seconds, do a
   top-level navigation to `start_url`, which runs the full redirect inside the app window.
5. The server verifies the signed header and maps the verified account to a role (parent
   or keeper) held in the app's own data. No account, domain or project value is ever in
   the repo; they live in deployment config.

[^iap-sessions]: Identity-Aware Proxy docs, Managing sessions.
[^iap-signed]: Identity-Aware Proxy docs, signed headers.
[^mdn-scope]: MDN, manifest `scope`.
[^mdn-crossorigin]: MDN, `crossorigin` attribute, manifest example.
[^pwa-cookies]: Third-party write-up on standalone PWA and Safari storage; community evidence only.
[^google-auth-lib]: google-auth-library-nodejs repository, Apache-2.0 licence.
