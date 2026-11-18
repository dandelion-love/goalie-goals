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
- Every other path that is not `/api/...` gets the web app (`WEB_ROOT`), with
  `index.html` for app routes. Hashed assets are cached for a year; the shell, manifest and
  service worker never.

## Configuration (environment only)

| Variable | Meaning |
| --- | --- |
| `IAP_AUDIENCE` | Expected audience of the signed header. Required unless the dev mock is on; there is no default. |
| `GOALIE_ROLES` | Role seed for the in-memory store: `account=keeper;account=parent`. |
| `ROLE_STORE` | `memory` (the only store wired so far). |
| `WEB_ROOT` | Folder of the built web app; unset means API only. |
| `PORT` | Default 8080. |
| `GOALIE_DEV_MOCK_IDENTITY` | `1` turns on the mock identity (below). Refused with `NODE_ENV=production`. |
| `GOALIE_DEV_AS` | Account the mock signs in as by default. |

Roles sit behind a `RoleStore` interface. `MemoryRoleStore` serves the walking skeleton;
`FirestoreRoleStore` reads `members/{account}.role` through a minimal interface the
Firestore client satisfies, and is tested against a fake. It is not wired in yet.

## Local development with a mock identity

```bash
GOALIE_DEV_MOCK_IDENTITY=1 GOALIE_ROLES='kai@example.com=keeper;sam@example.com=parent' \
  npm run dev --workspace server
npm run dev --workspace web   # proxies /api to :8080
```

With the flag on, the server makes an ES256 key in memory at startup and signs a header
shaped like the proxy's for each `/api` request that lacks one, then verifies it through
the same code path as production. Switch accounts with `/api/dev/as?account=sam@example.com`;
`account=none` sends no header, so the app shows the expired-session state. The key is
never written to disk, and the flag stops the server from starting when
`NODE_ENV=production`.

## Tests

`npm test --workspace server` (vitest). Fixtures use the demo cast at `example.com` and
headers signed by a key made for the test run.
