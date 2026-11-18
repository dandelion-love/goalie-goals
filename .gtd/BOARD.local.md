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
