# server

The API and the host for the built web app, in one container. Node 22, TypeScript,
[Fastify](https://github.com/fastify/fastify) (MIT) and
[google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) (Apache-2.0).

## What it does

- `GET /api/me` reads the sign-in proxy's signed header (`x-goog-iap-jwt-assertion`),
  verifies its signature, issuer, audience and expiry, and maps the account to a role from
  the app's own data:
  - no header, or one that does not verify: `401`
  - verified, no role: `{"role": null}` (the app shows "not set up")
  - verified: `{"role": "keeper"}` or `{"role": "parent"}`
- Parent approval (per `docs/knowledge/decisions/parent-approval.md`). Every route checks
  the caller's role from the app's own data; an account with no role gets `403`.

  | Route | Roles | What it does |
  | --- | --- | --- |
  | `GET /api/approvals/pending` | parent | The inbox: pending plan, exercise and harder-version requests. |
  | `POST /api/approvals/:id/approve` | parent | Approves that item version. The keeper gets `403`, logged as `refused`. |
  | `POST /api/approvals/:id/decline` | parent | Declines, with an optional `{"reason"}`. |
  | `GET /api/training/approved` | keeper, parent | Approved item versions only, plus a `waiting` count without content. |
  | `GET /api/audit` | keeper, parent | The append-only audit log: requested, approved, declined, expired, refused. Roles, never accounts. |
  | `GET /api/notifications/badge` | keeper, parent | Unread count for the in-app badge. |
  | `GET /api/training/today?date=YYYY-MM-DD` | keeper, parent | Today's session with its cards, only when the session version and every card version in it are approved. Otherwise `lastApproved` (the newest approved earlier version whose cards are all approved) or neither, which means rest. |
  | `GET /api/training/cards` | keeper, parent | The card library: the latest approved version of each card. |
  | `GET /api/training/cards/:id/figure.svg?v=` | keeper, parent | A card's figure, for an approved card version only (`404` otherwise), served with `default-src 'none'`. |

  An approval is bound to the item's content hash (`itemVersion`): an edit is a new version
  and needs a new request, and the keeper keeps the last approved version meanwhile. A
  request unanswered for 7 days becomes `expired`; silence never approves. A decided request
  never changes again (`409`).
- Exercise cards and figures (`src/content.ts`, `src/training.ts`). The server reads
  `content/` at startup (`CONTENT_ROOT`, default the repo's `content/`; the container copies
  it to `/app/content`). Each card is an approval item `card-<id>` (kind `exercise`) bound to
  a hash of the card and its figure; each session is `session-<id>` (kind `plan`) bound to
  its warm-up, its cards' doses and the exact card versions. At startup the app proposes
  today's session and its cards to the parent. The card's credit line comes from the
  figure's entry in `content/credits.json`, built as `tools/content_check.py` builds it. The
  `approved` flag in a card file is ignored: approval lives in the approvals service.
  Versions are kept in memory next to the in-memory approval store (`MemorySnapshotStore`).
  `SingleSessionPlan` offers the starter session every day until weekly plans arrive; the
  fallback's "approved maintenance session" rung is not built yet, so rest is offered.
- XP and streaks (`src/progression.ts`, `src/progress.ts`), per
  `docs/knowledge/decisions/progression-design.md`. The rules are pure functions with a test
  for each day type: trained together, trained solo, stopped for safety, planned rest,
  paused and missed.

  | Route | Roles | What it does |
  | --- | --- | --- |
  | `POST /api/progress/sessions` | keeper, parent | Records a finished session (`date`, `itemId`, `itemVersion`, `outcome`, `warmUpLogged`, `praised`) and returns its credit and the summary. |
  | `GET /api/progress/summary?date=YYYY-MM-DD` | keeper, parent | Team XP, the team streak, the keeper's and the parent's streaks, today's state and completed runs. |

  XP is a fixed session credit once the warm-up is logged plus one form star per set the
  parent rated well, capped at the planned sets of the approved session version (the
  server's own count, never the client's). Sets, reps and minutes earn nothing, nor does an
  extra session the same day or a session on a rest day. A safety stop (`stopped` or
  `hurt`) earns the same credit as finishing and counts as a kept day. Planned rest and a
  pause hold every streak; a missed planned day ends the run, which is kept as a completed
  run with no repair. Records sit behind `ProgressStore` (`MemoryProgressStore` for now);
  pauses come in through `PauseSource`. Not built yet: spare days and the habit-strength
  score from the Decision, and a solo path in the player (the content has no safe-solo flag
  yet, so the player records a together session).
- Something hurts (`src/pain.ts`, `src/painRoutes.ts`), per the parent-approval and
  training-rules Decisions. A pain report pauses all training for the keeper until a parent
  clears it.

  | Route | Roles | What it does |
  | --- | --- | --- |
  | `POST /api/pain` | keeper, parent | Records a report (`id` made by the device, `bodyArea` from a fixed list, optional `note`, `date`) and pauses training. The same `id` sent again is stored once, so the device's offline outbox can retry. |
  | `GET /api/pain/status` | keeper, parent | Whether training is paused and since when. The parent gets the open reports; the keeper's device gets their ids only. |
  | `POST /api/pain/clear` | parent | Clears the pause. The keeper gets `403`, logged as `refused`. |

  While paused, `GET /api/training/today` answers `paused: true` with no session and no
  fallback, and the pause days count as `paused` for streaks (they never break one). The
  report and the clear go into the same audit log as approvals (`kind: pause`, actions
  `paused` and `cleared`), with roles and the body area only, never the note. The report is
  stored in the app's data only: no handler logs it, errors answer with a code and no echo,
  and Fastify never logs request bodies (`test/pain.test.ts` reads every log line). Reports
  sit behind `PainStore` (`MemoryPainStore` for now). Not built yet: the clearance details
  from the Decision (rest days taken, a professional seen, a stepped return plan) and push to
  the parent's phone; the in-app inbox and badge stand in.
- Every other path that is not `/api/...` gets the web app (`WEB_ROOT`), with
  `index.html` for app routes. Hashed assets are cached for a year; the shell, manifest and
  service worker never.

## Configuration (environment only)

| Variable | Meaning |
| --- | --- |
| `IAP_AUDIENCE` | Expected audience of the signed header. Required unless the dev mock is on; there is no default. |
| `GOALIE_ROLES` | Role seed for the in-memory store: `account=keeper;account=parent`. |
| `ROLE_STORE` | `memory` (the only store wired so far). |
| `SCHEDULE_STORE` | Where the parent's training days live: `firestore` (the default, and the only choice, with `NODE_ENV=production`) or `memory` (the default otherwise). |
| `FIRESTORE_DATABASE` | Firestore database id; unset means the project's default database. The project comes from the runtime's credentials or `GOOGLE_CLOUD_PROJECT`. |
| `WEB_ROOT` | Folder of the built web app; unset means API only. |
| `PORT` | Default 8080. |
| `GOALIE_DEV_MOCK_IDENTITY` | `1` turns on the mock identity (below). Refused with `NODE_ENV=production`. |
| `GOALIE_DEV_AS` | Account the mock signs in as by default. |
| `CONTENT_ROOT` | The `content` folder; unset means the one two levels above `src`/`dist`. |
| `GOALIE_DEMO_SEED` | `1` seeds the demo household at startup (below). Needs the mock identity; refused with `NODE_ENV=production`. |

Roles sit behind a `RoleStore` interface. `MemoryRoleStore` serves the walking skeleton;
`FirestoreRoleStore` reads `members/{account}.role` through a minimal interface the
Firestore client satisfies, and is tested against a fake. It is not wired in yet.

Approval sits behind `ApprovalStore` and `AuditLog` (`src/approvals.ts`), with in-memory
implementations; `FirestoreApprovalStore` and `FirestoreAuditLog` are stubs that refuse to
run until a later story wires them. The audit log has `append` and `list` only. The clock is
injected so tests can move time.

Notifications go through `Notifier` (`src/notifier.ts`). `InAppNotifier` is the mock for
push: it keeps unread notifications in memory for the badge and sends nothing. A later story
adds web push behind the same interface; the inbox and badge stay.

## Local development with a mock identity

```bash
GOALIE_DEV_MOCK_IDENTITY=1 GOALIE_ROLES='kai@example.com=keeper;sam@example.com=parent' \
  npm run dev --workspace server
npm run dev --workspace web   # proxies /api to :8080
```

With the flag on, the server makes an ES256 key in memory at startup and signs a header
shaped like the proxy's for each `/api` request that lacks one, then verifies it through
the same code path as production. Switch accounts with `/api/dev/as?account=sam@example.com`;
`account=none` sends no header, so the app shows the expired-session state. With the mock
on, the server also seeds three demo requests (a starter plan, an exercise and a harder
version) for the parent's inbox, and approves today's session and its cards as the demo
parent so the keeper's player has something to run. The key is
never written to disk, and the flag stops the server from starting when
`NODE_ENV=production`.

## The demo household

`src/demo.ts` seeds the household that [`docs/demo.md`](../docs/demo.md) scripts: keeper Kai
(`kai@example.com`) and parent Sam (`sam@example.com`); today's starter session and its cards
approved as the demo parent; the demo requests from `src/demoData.ts` waiting in the parent's
inbox (real cards at their spec doses); and the week before today as history: five trained
days, one planned rest day (`DemoPlan`) and one safety stop, so the team streak starts at 6.
Dates are the machine's local date, as the web app's are.

```bash
npm run demo          # from the repo root: build the web app, then npm run demo:seed
npm run demo:seed --workspace server   # start on :8080 with the mock identity and the seed
npm run demo:reset --workspace server  # restore the seeded state on the running server
```

The stores are in memory, so the seed runs inside the server: at startup with
`GOALIE_DEMO_SEED=1`, or through `POST /api/dev/demo/reset`, a dev-only route that exists
only with the mock identity on the app's own in-memory stores. The reset wipes those stores
and seeds again; the dev mock's audit log is a `DemoAuditLog`, which starts a new append-only
log rather than deleting events. Both the seed and the reset refuse (`DemoRefused`; the
route answers `409`) in production, without the mock identity, or when the data holds any
account outside `@example.com`: in the roles, as the decider of a request, or in the audit
log. A refused seed stops the server from starting. Refusals never name the account.

## Tests

`npm test --workspace server` (vitest). Fixtures use the demo cast at `example.com` and
headers signed by a key made for the test run.
