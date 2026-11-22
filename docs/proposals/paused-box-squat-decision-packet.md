# Decision packet: paused squat pilot

Status: proposed; the behavioral proposal in `paused-box-squat-pilot.md` passed independent review. This packet does not change a household plan or grant a parent approval.

## Decision requested

The following exact candidate files are ready for independent review and a separate owner content decision. They do not grant the parent's in-app approval.

| Item | Current or candidate | Separate decision before real use |
| --- | --- | --- |
| Prior card | Current squat-to-box version starts at 2 sets of 10; `candidates/squat-to-box-12.json`, `candidates/squat-to-box-14.json` and `candidates/squat-to-box-target.json` propose successive 2 × 12, 2 × 14 and 2 × 15 versions. | Owner content approval of each exact version, then the parent's in-app approval of each change. |
| Next card | Paused box squat: stop for 2 seconds above a stable box or step; candidate start is 2 sets of 10, 60 seconds rest. | Owner content approval of the exact card and dossier, then the parent's in-app approval. |

The existing `squat-to-box` card remains at 2 sets of 10 until a different version has those approvals. The 2-by-15 version is a destination, not a direct jump: the documented rule requires one lever at a time, two clean sessions and parent approval at each dose change. The owner chose a capped final step from 2 × 14 to 2 × 15 under those same conditions. Each exact dose version also needs owner content approval. The exact second card, matching spec, neutral figure and proposed dossier are outside runtime content. The previously rejected paused-squat illustration will not be used.

The proposed machine-readable dossier uses explicit unavailable states for unsupported
benefits, expected outcomes and muscle focus. The original checker required claims and
a muscle map, and the original projection assumed a keep-up claim. Support for explicit
unavailable states is prepared on this branch, including a parent preview of sourced
research context; it must be independently reviewed before this exact dossier can be
installed or proposed for parent approval.

## Exact candidate bytes

All paths below are under `docs/proposals/candidates/`; the hash is SHA-256 of the
file as reviewed. The three prior-card JSON files are alternative successive versions
of `content/exercises/squat-to-box.json`, not three simultaneous exercises. Each points
to the matching versioned spec under `content/exercises/`. The paused card, spec and
dossier would use their matching names under `content/exercises/`; its figure would use
`content/figures/squat-to-box-pause.svg`. Installation must preserve the reviewed bytes,
or present the changed bytes for a new decision.

| Candidate | SHA-256 |
| --- | --- |
| `squat-to-box-12.json` | `7c877c6b01e98756c5d0db708ab684a2f225068ed06e7ee38a5ceea3658b9675` |
| `squat-to-box-12.spec.md` | `a4e2b211ac3edaa17ba362ca2aee51feda6b3e19ffcaa928fbf3c2fb5defae12` |
| `squat-to-box-14.json` | `dc9feabce92ce9f80cfacffbdefc8e964207635a090fad895e9b90cebef9773f` |
| `squat-to-box-14.spec.md` | `a5f28a6150fdd9f9b03c051b0514eb29705acbe8cc918f4d54d4fcdc473b578a` |
| `squat-to-box-target.json` (2 × 15) | `95ce857b941fa1216d1ae4a5b8c2ee5d55e0162579e6b02b4b95685f7f644580` |
| `squat-to-box-15.spec.md` | `4306cd8e85e90fd82c3d56f39b97e055a5499c36662e82ee53967fe4c598d768` |
| `squat-to-box-pause.json` | `5454679c75947b11b3b4fd7e85db42efce145f3e9f6f58f7cc044ce3114684d2` |
| `squat-to-box-pause.spec.md` | `e1e0df547a120293aae4117983e542ec8e590a7a052a41311662f2eea631e785` |
| `squat-to-box-pause.dossier.json` | `844a61d7002b02723f8eb3576243b875d8e1a9e38934987f679fb6bd738f92a0` |
| `squat-to-box-pause.svg` | `3b3077d6a88ada20ab03588e7981c28a2ecc625b0f554c8b426f7acb3cae5243` |

The three prior-card versions use the existing `content/figures/squat-to-box.svg`,
SHA-256 `3e0e0ca7becff11061dd4ea25039a423424e00190cf22181113fbfb0a22e7360`.
Using these exact card and figure bytes and the current app's version algorithm,
`npx tsx tools/candidate_versions.ts` yields:

| Candidate | Effective app approval version |
| --- | --- |
| 2 × 12 prior card | `sha256:ebe9725306de0c55f06f059ca1952118` |
| 2 × 14 prior card | `sha256:445e7246d4e46e6d070a28e8be435506` |
| 2 × 15 prior card | `sha256:681d68b9e6dfd2f334ba5aa7c4f81d2a` |
| Paused card | `sha256:836073df2f6a8c3c94e99bf990df658d` |
| Paused dossier | `sha256:8365e00c6b872dd5c864c9e672869701` |

These identifiers name versions; they do not record owner content approval or a parent
decision. The app's card version binds its card and figure, while the separately hashed
specs above must also be part of the content decision.

## Evidence and safety boundary

The existing progression rules call for two consecutive sessions at the exact prior-rung target, with every repetition confirmed clean by the parent. Rest days and sessions without the card do not break the pair. A zero-completed-set record is unknown unless authoritative occurrence data proves the exercise did not start. Incomplete records, unverified order, missing confirmation and unverified holds cannot establish readiness. Pain, growth, break/restart and step-down conditions remain separate checks.

The current readiness implementation cannot yet establish the full sequence or all safety facts. The local evaluator is a tested foundation, not a live eligibility decision. The demonstration uses invented state and cannot establish readiness for the household.

## Evidence to review

- Existing ladder and candidate rung: `docs/knowledge/progression-library/ladders-strength.md`.
- Current card and stop signs: `content/exercises/squat-to-box.json` and `content/exercises/squat-to-box.spec.md`.
- Progression and safety conditions: `docs/knowledge/progression-library/unlock-rules.md` and `docs/knowledge/decisions/training-rules.md`.
- Behavioral proposal: `docs/proposals/paused-box-squat-pilot.md`.

The reviewer accepted the behavioral proposal and reviewed the paused candidate's sources and boundaries, not a dose, card, dossier or readiness state. Each exact version still needs content approval before real use.
