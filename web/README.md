# web

The installable web app: TypeScript, React, Vite and
[vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa), per the front-end Decision
(`docs/knowledge/decisions/frontend-approach.md`).

## Screens

- **Keeper home** and **Parent home**, chosen by the role from `/api/me`.
  - Parent home: the **Inbox** of pending requests, each with **Approve** and **Decline**,
    and a badge with the pending count (the in-app stand-in for push); then **History**.
  - Both homes show **Together so far** (XP and streaks) under the first panel.
  - Keeper home: **Today** at the top, then **Your training** (approved items only, and a
    count of changes waiting for the parent without their content), then the same
    **History**.
- **Today** (`src/LessonPath.tsx`): today's approved session as a path of steps (warm-up,
  each card, cool-down, finish) with **Start session**. When today's session is not
  approved it offers **Do last version** (the last approved one, if the server sent it) or **Rest
  today**, never an unapproved session. A planned rest day says so.
- **Session player** (`src/SessionPlayer.tsx`, flow in `src/player.ts`): about 10 minutes.
  Warm-up moves on a countdown, then each card with its figure and credit line, steps, cues,
  common mistakes and stop signs; a countdown for holds and rests and a rep counter for
  counted work; after each set the parent taps a cue that looked good and the app says
  "<cue>: nice" (the cue, never the person). **Something hurts** and **Stop** are always on
  screen. Every ending has a positive finish screen with no "one more?" prompt. The keeper's
  home sends each finished session to `/api/progress/sessions` and the finish screen shows
  its XP and the streaks; the `onSessionFinish` prop on `App` also receives the result.
- **Something hurts** (`src/pain.ts`, `src/PainScreens.tsx`): on every player screen and on
  the keeper's home. It ends the session at once and pauses training on the device before
  anything is sent, then asks where it hurts (a short fixed list) with an optional note. The
  pause lives in localStorage (`LocalPauseStore`), so it holds and shows with the network
  off; an unsent report waits there and is sent when the app is online again, then its
  content is dropped from the device. While paused the keeper's home shows **Training is
  paused** and offers nothing to train. The parent's **Inbox** shows the report as an urgent
  item with **Clear the pause**; the keeper's device lifts the pause when the server no longer
  has it. Report content never goes to the console or anywhere but `/api/pain`.
  With the network off, an open app keeps the pause, and an app whose `/api` calls fail shows
  it above "Can't reach the app". The HTML shell is still not cached (see **Installable
  app**), so a cold start with no network at all needs the offline story.
- **Together so far** (`src/ProgressPanel.tsx`, client in `src/progress.ts`), on both homes:
  team XP, the team streak and each person's streak. A run that ended shows under
  **Completed runs** with "A new run starts with your next session": no "lost" screen and
  no repair offer.
- **Wake lock** (`src/wakeLock.ts`): requested on Start, re-requested when the page is
  visible again, released at the end. Without it (a Home Screen app below iPadOS 18.4, or a
  refused request) the player shows "Screen may dim: tap the timer to keep it awake" and a
  running timer waits for a tap once 50 s pass without one.
- **Start fresh** (`src/StartFresh.tsx`, story 121): the last card on the parent's home,
  below the History. It opens a confirm step that lists what is cleared and what stays (with
  a line about the pause), asks the parent to type `RESET`, and has **Cancel**; **Clear all
  data** stays disabled until the word is typed. The server checks the role and the word again.
- **Reset generation** (`src/generation.ts`, story 121): `App` wraps every API call. It sends
  the device's last seen generation (`X-Household-Generation`) and reads the server's on each
  answer. An answer that names a new one drops today's cached session and the outbox of
  session starts, finishes and history records before the caller sees it, and the home draws
  again from the server with "Training data was cleared. Starting fresh." A pain report made on
  the device and not yet sent is never dropped: it keeps its pause and is sent under the new
  generation, and the pause holds until the server says training is paused. A pause whose
  report the server already had is dropped. Nothing is dropped without such an answer.
- **Not set up**: a signed-in account with no role. It shows no data.
- **Session expired**: `/api/me` returned `401`. **Reconnect** navigates the app window to
  the start URL, so the sign-in proxy's redirect runs inside the installed app.
- **Can't reach the app**: a network error, with Try again (not a sign-in problem).

API calls send `credentials: 'same-origin'` and `X-Requested-With: XMLHttpRequest`, so the
proxy answers an expired session with `401`, not a redirect.

## Layout

Width-based, from `layoutFor(width)` in `src/layout.ts`: **compact** below 600 px (phone),
**medium** 600 to 899 px (iPad portrait), **expanded** 900 px and up (iPad landscape, two
panes). A container query drops the two panes to one column in a narrow window. In the
player, medium puts the figure above the controls; expanded puts the figure and timer left
and the steps, cues and set log right. Buttons are at least 44 px; in-session controls
(`.session-control`) at least 56 px.

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
