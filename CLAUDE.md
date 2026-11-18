# goalie-goals

A web app that turns a young goalkeeper's off-field training into a shared, game-like
habit with a parent: short daily sessions, streaks, XP and levels, done together.

**This repository is PUBLIC**, and so are its issues, pull requests, comments, commit
messages and author lines. Before writing anything that leaves this machine, follow the
[public-repo privacy skill](.claude/skills/public-repo-privacy/SKILL.md). The privacy guard
(`tools/privacy_guard.py`) runs in the git hooks and the Claude Code hooks; never bypass it.

- Guard tests: `python3 tests/test_privacy_guard.py`
- Secrets and deployment addresses live outside the repo (Secret Manager, a gitignored
  `.env.local`, git config). Commit only `.env.example`, with placeholders.

Board work (gtd-board-kit): @.gtd/kit/BOARD.md then @.gtd/BOARD.local.md
