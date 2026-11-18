# web

The installable web app: TypeScript, React, Vite and
[vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa), per the front-end Decision
(`docs/knowledge/decisions/frontend-approach.md`).

## Screens

- **Keeper home** and **Parent home**, chosen by the role from `/api/me`.
  - Parent home: the **Inbox** of pending requests, each with **Approve** and **Decline**,
    and a badge with the pending count (the in-app stand-in for push); then **History**.
  - Keeper home: **Your training** shows approved items only, and a count of changes
    waiting for the parent without their content; then the same **History**.
- **Not set up**: a signed-in account with no role. It shows no data.
- **Session expired**: `/api/me` returned `401`. **Reconnect** navigates the app window to
  the start URL, so the sign-in proxy's redirect runs inside the installed app.
- **Can't reach the app**: a network error, with Try again (not a sign-in problem).

API calls send `credentials: 'same-origin'` and `X-Requested-With: XMLHttpRequest`, so the
proxy answers an expired session with `401`, not a redirect.

## Layout

Width-based, from `layoutFor(width)` in `src/layout.ts`: **compact** below 600 px (phone),
**medium** 600 to 899 px (iPad portrait), **expanded** 900 px and up (iPad landscape, two
panes). A container query drops the two panes to one column in a narrow window.

## Installable app

- Manifest: `id`, `start_url` and `scope` at `/`, `display: standalone`, linked with
  `crossorigin="use-credentials"`.
- Service worker (Workbox, generated): precaches the hashed scripts, styles and icons only.
  The HTML shell is not precached and there is no navigation fallback, so a live
  navigation always reaches the network and the proxy. Offline use comes in a later story.
- Icons: `public/icon.svg` and `public/icon-maskable.svg`, original drawings made for this
  repo and licensed MIT with the code. No share-alike asset lives here. A PNG
  `apple-touch-icon` is still to come; the SVG is a stopgap.

## Commands

```bash
npm run dev --workspace web     # Vite on :5173, /api proxied to the server on :8080
npm test --workspace web        # vitest + Testing Library (jsdom)
npm run build --workspace web   # type-check, then build to web/dist
```
