---
name: public-repo-privacy
description: Keep private data out of this public repo and everything attached to it on GitHub. Use before writing any issue, epic, story, comment, PR body, commit message, doc, fixture or seed data; before adding images or audio; when the privacy guard blocks a call; and at once if something private may already be public.
metadata:
  version: 0.1.0
---

# Public-repo privacy

This repo is public, and so is everything GitHub attaches to it: issues, pull requests,
comments and their edit history, commit messages and author lines, Actions logs. Forks,
caches and archives keep it after deletion. The app is about a real teenager training with
a parent. Treat what you know about them like a medical record: it stays with the app's
data at runtime, never in this repo.

## What never goes in

| Kind | Examples | Where it lives instead |
| --- | --- | --- |
| Who they are | names, nicknames, birthday, exact age, photos, video, voice, jersey number | the app's database at runtime; the private-terms file, for the guard |
| Where they are | home, school, club, team, league, field, city or neighbourhood, coaches, schedules with places | the app's database |
| Body and health | weight, height, growth, injuries, heart rate, test results of a real person | the app's database; fixtures use invented values |
| Contact and accounts | email addresses, phone numbers, account ids, social handles | the sign-in allowlist in the cloud console; Secret Manager |
| Secrets | API keys, OAuth client id and secret, tokens, service-account keys, `.env` files | Secret Manager, a gitignored `.env.local`, GitHub Actions secrets |
| Infrastructure | cloud project number, service URLs, the deployment's domain, service accounts, buckets, the gtd server's address | config outside the repo: `.env.local`, `git config`, `~/.config/` |
| Terraform values | state and its backups, plan files, `.tfvars`, project ids or bucket names as variable defaults | remote state; `-var-file` and `-backend-config` files outside the repo; commit `*.tf`, the lock file and a `.tfvars.example` with placeholders |
| Private links | claude.ai sessions and artifacts, private repos, Drive and Docs links | the conversation, or a private channel |

## How to write about people in public text

- Say **the keeper** for the young athlete and **the parent** for the training partner.
  Both are users of the app. Never give either one a gendered pronoun (he, she, his,
  her): repeat "the keeper" or "the parent", or use they. A pronoun tells readers the
  child's gender, which nothing public says. Sources may describe their own study groups
  ("male youth athletes") in citations; that describes the study, not the keeper.
- Use an age band ("U15", "early teens"), never an age or birthday. A narrow range of
  years is an age too; research cites age groups as bands as well.
- State needs as training goals: "vertical jump and lateral speed lag the older age group",
  not a personal story.
- Research that compares places (laws, regulators, currencies, regions) gives each the
  same depth and cites shared points to several of them. Leaning on one country's
  sources tells readers where the family lives, even if no sentence says so.
- Public figures (professional players, coaches) may be named in content such as clip
  links, but choose them by the move, spread across clubs, leagues and countries, and
  never because of the keeper's own team, favourite club or local league: a pattern of
  choices can say what no sentence does. Only adult professionals, never youth players.
- Fixtures, seed data, screenshots and examples use the invented cast: keeper **Kai**,
  parent **Sam**, emails at `example.com`. Screenshots come from seeded demo data only.
- Images are drawn or generated assets (PNG, SVG, WebP) with no camera metadata. Camera
  formats (JPEG, HEIC, MOV, MP4, voice memos) and workout exports (FIT, GPX, TCX) are
  refused outright.

## The guard

`tools/privacy_guard.py` runs by itself:

- git hooks `pre-commit`, `commit-msg` and `pre-push` (`core.hooksPath=.githooks`, set by
  the SessionStart hook; in a new clone run `git config core.hooksPath .githooks`);
- Claude Code and Codex hooks before a git commit or push, a `gh` write, and every write
  tool of the gtd and GitHub MCP servers (issues, comments, captures, PRs, board drafts).

The agent hooks see only what is already staged, so the git hooks are the final word.

By hand: `python3 tools/privacy_guard.py --text < draft.md` checks a draft,
`--all` the tree, `--history origin/main` every author line already on GitHub (commits
GitHub writes itself, such as web merges, skip our hooks), `--status` which private-term
sources are loaded.

Private terms (the family's names, places, teams, school, private domains) live outside the
repo in `~/.config/goalie-goals/private-terms.txt`: one per line, `re:` for a regular
expression, `#` for a comment. A cloud session or CI job gets them from the
`GOALIE_PRIVATE_TERMS_TEXT` environment variable, set in that environment's private
settings. If `--status` shows no term source, names are not being checked: tell the owner,
and publish nothing about people until it is fixed.

## When it blocks

1. Never bypass it: no `--no-verify`, no hooks-path change, no splitting or encoding text
   to slip past, no moving the text to a gist or another public place.
2. Rewrite in neutral terms, or move the data to its home in the table above.
3. A false alarm (a version string, a fake value) is still a rewrite. If a rule is wrong
   in general, change the guard in its own PR with a test; the owner reviews it.
4. You learned a new private term (a coach's name, a club): ask the owner to add it to
   their private-terms file. Never write it into the repo to "remember" it.

## If something private got out

Stop and tell the owner now (`needs:james`). Say what kind of data and where, without
repeating it: the ask is public too. Then, with the owner:

- A secret: revoke or rotate it first. Deleting the text does not un-leak it.
- An issue or comment: delete it. Editing leaves the old text in the edit history.
- A pushed commit: rewrite history only on the owner's word, then ask GitHub Support to
  purge cached views. Assume it was copied.

## Before you publish

- [ ] No real names, except GitHub logins and labels the board already defines.
- [ ] No ages, birthdays, schools, teams, places or schedules.
- [ ] No body or health numbers about a real person.
- [ ] No emails, phone numbers, account ids, keys or deployment addresses.
- [ ] Images are drawn assets or demo-data screenshots, without camera metadata.
- [ ] Long text went through `--text` first.
- [ ] Timestamps written in docs and records are UTC (`Z`), not a local offset, and dates
      sit at `T00:00:00Z`, not at local midnight.
- [ ] Nothing private sits in an earlier commit of the branch: a fix goes into the failing
      commit before the first push, never on top of it.
