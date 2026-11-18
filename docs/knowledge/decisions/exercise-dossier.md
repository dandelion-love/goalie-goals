---
type: Decision
title: Exercise dossier content model
description: Each exercise card gets a dossier file beside it with six fixed sections, claim records that each carry source ids and an evidence label, length limits, a muscle vocabulary for the muscle map, an empty clip list until the link policy lands, and owner approval; the content check enforces it.
tags: [decision, dossiers, exercise-card, content-check, schema]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:24:00Z }
sources:
  - { id: sections, resource: /dossiers/sections.md, title: The sections of an exercise dossier }
  - { id: rules, resource: /dossiers/claim-rules.md, title: Claim rules for exercise dossiers }
  - { id: adaptations, resource: /dossiers/youth-adaptations.md, title: What training changes in a young athlete, and how fast }
  - { id: example, resource: /dossiers/example-front-plank.md, title: Worked example - the front plank dossier }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
  - { id: approval, resource: /decisions/parent-approval.md, title: Parent approval as a primary behaviour }
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media decision }
  - { id: reuse, resource: /decisions/exercise-content-reuse.md, title: Reuse of exercise content }
  - { id: wcag-reading, resource: https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html, title: "W3C. Understanding WCAG 2.2, Success Criterion 3.1.5 Reading Level" }
---

# Context

Epic #70 gives every exercise card a dossier: why it matters for a goalkeeper, what to
expect, the muscles worked, the move in top-level play, how to do it, and the science.
The [sections](/dossiers/sections.md) and the [claim rules](/dossiers/claim-rules.md) say
what each part must hold; the [front plank example](/dossiers/example-front-plank.md)
shows them applied.[^sections][^rules][^example] A build story needs a file shape the
screen can render and the content check can refuse. This Decision sets it. It changes no
code; the build story implements it.

# Decision

## Where it lives

- One file per card: `content/exercises/<id>.dossier.json`, beside `<id>.json` and
  `<id>.spec.md`. The dossier's `id` is the card's id.
- Released under CC BY-SA 4.0 with the cards (`licence`), written clean-room from the
  cited sources, never copied from them.[^reuse]
- The keeper sees a dossier only when `approved` is true. The owner approves it with the
  card, in the same flow as any new exercise; a changed dossier returns to unapproved.
  [^approval][^training-rules]

## Shape

```json
{
  "id": "plank",
  "card": "content/exercises/plank.json",
  "approved": false,
  "licence": "CC-BY-SA-4.0",
  "reviewed_at": "2026-11-18T00:00:00Z",
  "stale_after": "2027-11-18T00:00:00Z",
  "sources": [
    { "id": "granacher-2014", "url": "https://pubmed.ncbi.nlm.nih.gov/25584193/",
      "title": "Granacher et al. Core strength training in adolescents (2014)",
      "kind": "trial", "population": "youth", "band": "early teens", "year": 2014 }
  ],
  "why": {
    "headline": "A strong, steady middle keeps your body in one piece when you dive.",
    "claims": [ { "action": "dive", "text": "...", "sources": ["dipaolo-2022"], "evidence": "youth" } ]
  },
  "expect": {
    "claims": [
      { "text": "...", "sources": ["granacher-2014"], "evidence": "youth",
        "outcome": { "measure": "trunk strength tests", "change_pct": [8, 22],
                     "weeks": [6, 6], "sessions_per_week": [2, 2], "band": "early teens" } }
    ],
    "keep_up": { "text": "...", "sources": ["nunes-2021", "ioc-2015"], "evidence": "youth" }
  },
  "muscles": {
    "map": [
      { "muscle": "rectus-abdominis", "plain": "The long muscle down the front of your tummy",
        "role": "main", "basis": "measured", "sources": ["ekstrom-2007", "snarr-2014"],
        "evidence": "adult" }
    ],
    "note": { "text": "...", "sources": ["ekstrom-2007"], "evidence": "adult" }
  },
  "clips": [],
  "science": {
    "claims": [ { "text": "...", "sources": ["ekstrom-2007"], "evidence": "adult" } ],
    "limits": [ { "text": "...", "sources": ["soligard-2008"], "evidence": "youth", "negates": true } ]
  }
}
```

"How to do it" has no field: the screen renders the card named by `card`.

## The claim record

Every keeper-facing sentence group is a claim record:

| Field | Type and limit | Rule |
|---|---|---|
| `text` | Text, 20 to 220 characters | Plain words; refused words checked ([claim rules](/dossiers/claim-rules.md)) |
| `sources` | List of 1 to 4 source ids | **Required.** Each id resolves to `sources[]`; a claim with none fails |
| `evidence` | `youth`, `adult`, `mixed` or `app` | Must match the cited sources' `population` (below) |
| `detail` | Optional text, up to 400 characters | Parent-facing "more"; same source and word rules |
| `action` | `dive`, `set-position`, `jump`, `distribution`, `recovery` | Required in `why`, absent elsewhere |
| `outcome` | Object, required in `expect.claims` | See below |
| `negates` | Optional true | Allowed only in `science.limits`; lets a claim name prevention to deny it |

`evidence` is computed and compared, not trusted. `app` sources (this repo's own card or
Decisions, which support only statements about the app's rules) are set aside unless they
are all there is. Of the rest: all `youth` gives `youth`; all `adult` gives `adult`, and
then the text must contain "adult"; any other mix gives `mixed`; only `app` sources give
`app`.

## Sources

| Field | Type and limit | Rule |
|---|---|---|
| `id` | Lowercase kebab, up to 40 characters | Unique in the file; each used by at least one claim |
| `url` | `https://` URL | PubMed, PMC, a publisher, a standards body or an official guidance page, or a path in this repo for `app`; never a private link |
| `title` | Text, up to 200 characters | Authors, short title, journal or body, year |
| `kind` | `position-statement`, `meta-analysis`, `review`, `trial`, `observational`, `lab-study`, `guidance`, `reference`, `app` | |
| `population` | `youth`, `adult`, `mixed`, `app` | What the source studied or addresses |
| `band` | Text, up to 30 characters | An age band ("early teens", "children", "adults"); never an age |
| `year` | Whole number | |

## Sections and their limits

| Section | Field | Count | Extra rule |
|---|---|---|---|
| Why it matters | `why.headline` | 1, 10 to 80 characters | No source needed: it may only restate a claim below it |
| | `why.claims` | 2 to 4 | Each has an `action` |
| What to expect | `expect.claims` | 2 to 4 | Each has an `outcome` and at least one `youth` source |
| | `expect.keep_up` | 1 | Cites a source on stopping or on individual variation |
| Muscles | `muscles.map` | 2 to 8 entries | `muscle` from the vocabulary; `plain` up to 60 characters; `role` `main` or `helping`; `basis` `measured` or `cued`; `main` needs `measured` |
| | `muscles.note` | 0 or 1 claim | |
| Top-level play | `clips` | 0 to 3 | Must be empty until the clip policy Decision (#73) exists; that Decision adds its own fields. Links only, never embeds[^media-decision] |
| The science | `science.claims` | 2 to 5 | |
| | `science.limits` | 1 to 3 | At least one limits claim is required |

A whole dossier keeps keeper-facing `text` under about 2,000 characters, so it fits two
iPad screens.[^sections]

## The outcome record

| Field | Type | Rule |
|---|---|---|
| `measure` | Text, up to 60 characters | What was tested ("trunk strength tests") |
| `change_pct` | `[low, high]` numbers | low at most high; both present, even when equal |
| `weeks` | `[low, high]` whole numbers | The time frame studied |
| `sessions_per_week` | `[low, high]` whole numbers | |
| `band` | Text | The group studied, as a band |

The text must quote the range and the time frame it holds; the check compares the
numbers in `text` with the record.[^rules][^adaptations]

## Muscle vocabulary

Ids the muscle map draws (#72 maps each to a region of the chosen asset):
`rectus-abdominis`, `external-oblique`, `internal-oblique`, `transversus-abdominis`,
`erector-spinae`, `gluteus-maximus`, `gluteus-medius`, `hip-adductors`, `hip-flexors`,
`quadriceps`, `hamstrings`, `calves`, `tibialis-anterior`, `pectorals`, `deltoids`,
`triceps`, `biceps`, `latissimus-dorsi`, `trapezius`, `serratus-anterior`,
`rotator-cuff`, `forearm-flexors`. A new id is added here and in the check together.

## What the content check enforces

`tools/content_check.py` gains a dossier pass, run for every card. It fails when:

1. a card has no dossier, or a dossier has no card, or `id` and `card` disagree;
2. a field is missing, the wrong type, or outside the counts and lengths above;
3. a claim has no `sources`, or a source id does not resolve, or a source is unused;
4. `evidence` differs from the value computed from the sources, or an `adult` claim's
   text does not say "adult";
5. an `expect` claim has no `outcome`, no `youth` source, or a text that does not carry
   its range and weeks;
6. keeper-facing text contains a refused word from the claim rules, outside a
   `negates` limits claim;
7. a `main` muscle is not `measured`, or a muscle id is not in the vocabulary;
8. `clips` is not empty while no clip policy Decision exists;
9. a source URL is not `https://`, or is a private link the privacy guard would refuse;
10. `stale_after` has passed (a warning, not a failure, so a stale dossier is reviewed
    rather than hidden).

It also reports a reading-grade estimate for keeper-facing text (Flesch-Kincaid,
standard library only, muscle names excluded) and warns above grade 8, the
lower-secondary level WCAG 2.2 uses.[^wcag-reading] It is an estimate; the reviewer's
read decides.

# Choices made, and how to undo them

| Choice | Why | Undo |
|---|---|---|
| A separate `.dossier.json` beside the card, not new card fields | Keeps the card schema and its check unchanged, and lets a dossier be approved and versioned on its own | Fold the fields into the card and drop the file pass |
| Owner approval per dossier, reset on change | The parent approves what the app asks of a teen; dossier text makes claims to the keeper | Approve with the card only |
| `evidence` computed from sources | A label the writer sets can drift; a computed one cannot | Trust the field |
| Clips empty until #73 | The link policy is not decided | #73's Decision sets the clip fields |
| Reading level as a warning | Formulas misjudge short texts and muscle names | Make it a failure once calibrated |

# Consequences

- A build story adds the dossier schema and pass to the content check, with tests, and
  writes dossiers for the current cards, starting from the
  [front plank example](/dossiers/example-front-plank.md).
- A build story adds the dossier screen, reachable from the card and the session
  player's rest screen.
- #72 maps the muscle vocabulary to an open muscle-map asset; #73 adds the clip fields.
- Every new card needs a dossier before the check passes.

[^sections]: The sections of an exercise dossier
[^rules]: Claim rules for exercise dossiers
[^adaptations]: What training changes in a young athlete, and how fast
[^example]: Worked example - the front plank dossier
[^training-rules]: Training rules for an early-teens keeper
[^approval]: Parent approval as a primary behaviour
[^media-decision]: Exercise media decision
[^reuse]: Reuse of exercise content
[^wcag-reading]: WCAG 2.2, Understanding Reading Level
