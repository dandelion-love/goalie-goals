# goalie-goals

Training together, one short session at a time.

goalie-goals is a small web app for a youth goalkeeper and a parent who train together. It
borrows what makes language-learning apps sticky (short daily sessions, streaks, XP,
levels, gentle reminders) and points it at what a keeper stepping up to an older age group
needs most: explosive jumping, reach and punching power, footwork and reaction speed.

**Status:** setting up. Work is planned as epics and stories on the project board.

## Privacy

This repository is public. The people who use the app are not. Names, photos, places,
health data, account details and infrastructure addresses stay out of this repo, its
issues and its pull requests; a guard in the git hooks enforces it. See the
[public-repo privacy skill](.claude/skills/public-repo-privacy/SKILL.md).

Sign-in is with Google accounts, limited to an allowlist kept outside the repo.

## Development

- Turn the guard on in a new clone: `git config core.hooksPath .githooks`
- Keep private terms (names, places, teams) in `~/.config/goalie-goals/private-terms.txt`,
  one per line. That file is never committed.
- Guard tests: `python3 tests/test_privacy_guard.py`
