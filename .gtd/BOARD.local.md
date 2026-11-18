# goalie-goals board

Read after `.gtd/kit/BOARD.md`. Where this file differs from the kit, this file wins,
except that it never relaxes the kit's rule 1 (board only through the gtd MCP server) or
rule 9 (hard limits).

**This repo is public, and so is this file**, along with every issue, comment, report
and PR on the board's items. The privacy section below applies to every board write.

## Board and profile

- Profile: `software` (`.github/gtd-context.json`)
- Board: `dandelion-love/11`. Pass `project: dandelion-love/11` on every claim, renew,
  report, release and status call: the server's default board is a different one.
- Other boards or channels agents here may write to: none.
- Knowledge bundle: `docs/knowledge/` (OKF, at the version the kit pins).
- The owner's `needs` value: `needs:james`
- Standing chore item: none yet.

## Public repo: privacy first

- Every board write is public text: `capture`, `clarify`, issue edits, comments,
  `item_report`, `pr_open` bodies, board drafts. Write it to
  `.claude/skills/public-repo-privacy/SKILL.md`: "the keeper" and "the parent", age
  bands, and no names, places, teams, schools, body data, contacts or deployment
  addresses.
- In Claude Code the privacy guard runs before gtd and GitHub MCP writes. Other runtimes
  run `python3 tools/privacy_guard.py --text` on the text before posting it.
- A detail only a person can give (a schedule, a coach's input, a measurement) is asked
  for with `board-needs-person` in neutral words. The answer goes into the app's data or
  the owner's private notes, never into an issue.
- The gtd server's address is resolved locally (`mcp_url` is `"local"`). Run
  `python3 .gtd/kit/tools/init_checkout.py` once per clone; never write the address in a
  file, issue or PR.

## Domain rules

- Training content is for an early-teens athlete. Ground it in published youth
  strength-and-conditioning and goalkeeper-coaching guidance and cite the source.
  Technique comes before load; no maximal lifts. The owner approves every exercise the
  app prescribes.
- An exercise, progression or load rule is a behavioural story: it needs an acceptance
  spec before it is `agent-ready`.

## Notifications

- Pinged for asks: @hobpond (`notify.mentions` in `.github/gtd-context.json`)
- Louder channel: web-push
- New issues: view

## Labels this repo adds or uses differently

None beyond the `software` profile.

## Status per label

This repo has no label-to-Status bridge (`project-sync.yml`). Set Status with
`project_set_status` as well as the label.

| Label | Status column |
| --- | --- |
| agent-running | In Progress |
| waiting-for-review | In Review |
| blocked | Blocked |
| agent-failed | Blocked |
| gate-failed | In Progress |
| needs:james | Needs owner |
| needs:spec, needs:triage, agent-proposed | Backlog |
| accepted | Done |

Closed items: Done, on close. If the board has not moved it, set it with
`project_set_status`. The template's auto-add workflow did not copy, so put every new
issue on the board with `project_add_item`.

## Queue and ETA

- Queue view: Agent queue
- ETA field: Target date
- Start field: Start date

## What agents may pick up here

Until the owner changes this line: only items the owner points an agent at. No unpointed
pickup while the product is being shaped.

## Procedure differences: the builder and reviewer loop

The owner runs two standing sessions on this board: a **builder** and a **reviewer**. The
reviewer also owns the clean-room check (no private data, no copied text or assets).

1. The builder triages every new and `agent-proposed` item, adds `agent-review`, and
   notifies the reviewer.
2. The reviewer reviews it with `board-review`. If it is ready, the reviewer removes
   `agent-review`, adds `agent-ready`, sets Status Ready, and notifies the builder. Here this
   overrides `board-review`'s "never add agent-ready". If it is not ready, the reviewer
   comments its findings and notifies the builder, who fixes it and sends it back.
3. The builder claims and builds `agent-ready` items, with `project: dandelion-love/11` on
   every board call.
4. Before every push, the builder sends the reviewer the branch. Before every merge, the
   builder sends the PR. The reviewer replies `clean-room: pass` or `clean-room: fail`
   and, on a PR, posts one comment with the verdict. Nothing is pushed or merged on a fail.
   On a fail, the builder fixes it by rewriting the failing commit locally (amend, or
   squash the fix into it) and asks again before the first push. It never pushes the
   failing commit with a fix on top, because the history keeps it public. If a failing
   commit is already public, stop and tell the owner (`needs:james`), as the privacy
   skill's leak steps say. Only the owner deletes or rewrites a pushed branch.
5. Each new kind of finding is codified (a guard rule with a test, a line in the privacy
   skill, or a rule here), never by writing the private value into the repo.
6. The reviewer never reviews its own work, and the builder never passes its own.
7. Both notify each other at every hand-off. If one session is offline, the other leaves
   the hand-off on the issue (label plus comment) and does not act in its place.

## Merge grants

### merge: pre-release

- paths: every file in a PR, until the first release
- granted_by: hobpond (the owner)
- date: 2026-11-17
- link: the owner's own session, in his words: "There are no users atm and we do not have
  users. Take this as explicit permission to merge. The grant will be removed when we have
  first release."
- also: only after the reviewer's `clean-room: pass` on that PR and green checks. The
  reviewer never merges its own PRs; the builder merges them after its own read. This is
  the owner's explicit override, for the pre-release period only, of the kit's default
  that a grant names exact files and never covers `.gtd/` or `.github/`. It is removed in
  the PR that cuts the first release.
