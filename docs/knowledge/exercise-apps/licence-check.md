---
type: Reference
title: Licence check of exercise apps and datasets
description: Code, data and media licences, attribution rules and a use or reject verdict for each exercise app and dataset surveyed, for a public repo and a hosted app.
tags: [exercise-apps, licensing, attribution, reference]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:25:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: wger-repo, resource: https://github.com/wger-project/wger, title: wger server repository }
  - { id: wger-docs, resource: https://wger.readthedocs.io/en/latest/, title: wger documentation, licence section }
  - { id: wger-api-license, resource: "https://wger.de/api/v2/license/?format=json", title: wger API, licence list }
  - { id: wger-api-exercise, resource: "https://wger.de/api/v2/exerciseinfo/?format=json", title: wger API, exerciseinfo endpoint }
  - { id: feeel-repo, resource: https://gitlab.com/enjoyingfoss/feeel, title: Feeel repository }
  - { id: everkinetic, resource: https://github.com/everkinetic/data, title: Everkinetic open exercise data }
  - { id: free-exercise-db, resource: https://github.com/yuhonas/free-exercise-db, title: free-exercise-db repository }
  - { id: free-exercise-db-issue, resource: https://github.com/yuhonas/free-exercise-db/issues/2, title: free-exercise-db issue on image licensing }
  - { id: exercises-json-contrib, resource: https://github.com/wrkout/exercises.json/blob/master/CONTRIBUTING.md, title: exercises.json contributing guide }
  - { id: exercises-json-issue, resource: https://github.com/wrkout/exercises.json/issues/305, title: exercises.json issue on image licence status }
  - { id: exercemus, resource: https://github.com/exercemus/exercises, title: Exercemus exercise list repository }
  - { id: exercisedb-repo, resource: https://github.com/ExerciseDB/exercisedb-api, title: ExerciseDB API repository }
  - { id: exercisedb-terms, resource: https://exercisedb.notion.site/ExerciseDB-API-Terms-of-Use-226983b728ca8090bf7be79564e4b356, title: ExerciseDB API terms of use }
  - { id: darebee-terms, resource: https://darebee.com/terms-of-use.html, title: Darebee terms of use }
  - { id: tabler, resource: https://github.com/tabler/tabler-icons, title: Tabler Icons (MIT) }
  - { id: lucide, resource: https://github.com/lucide-icons/lucide, title: Lucide icons (ISC) }
  - { id: cc-by-sa-4, resource: https://creativecommons.org/licenses/by-sa/4.0/, title: CC BY-SA 4.0 licence deed }
  - { id: cc-best-practice, resource: https://wiki.creativecommons.org/wiki/Best_practices_for_attribution, title: Creative Commons, best practices for attribution }
  - { id: odbl, resource: https://opendatacommons.org/licenses/odbl/, title: Open Database License }
  - { id: agpl-3, resource: https://www.gnu.org/licenses/agpl-3.0.en.html, title: GNU AGPL 3.0 }
---

# How to read this table

"Fits" means the licence allows copying into a public repository and serving from a hosted app, given the conditions listed. A licence that forbids reuse, is unclear, or needs attribution the app cannot show means **reject**, per the [reuse decision](/decisions/exercise-content-reuse.md). The goalie-goals repository has no licence file yet; the decision lists that as a prerequisite.

# Table

| Resource | Code | Data or text | Media | Attribution rule | Verdict |
|---|---|---|---|---|---|
| wger | AGPL-3.0+[^wger-repo] | Per record: CC BY-SA 3 or 4, CC BY 4, CC0, ODbL[^wger-api-license][^wger-api-exercise] | Per file, same set, with author fields[^wger-api-exercise] | Author, licence, link to source, note changes; share adapted text alike[^cc-by-sa-4][^cc-best-practice] | **Adapt** data and media records that have a CC0, CC BY or CC BY-SA licence and a named author. Code not used. ODbL records left out pending a person's ruling.[^odbl] |
| Feeel | AGPL-3.0[^feeel-repo] | From wger | From wger and contributors | As wger | **Pattern only.** |
| Everkinetic | build scripts in repo | CC BY-SA 4.0[^everkinetic] | CC BY-SA 4.0 SVG and PNG[^everkinetic] | Credit the project, licence link, share adapted drawings alike | **Adapt** files of stated origin. |
| free-exercise-db | Unlicense[^free-exercise-db] | Unlicense label, but derived from a scraped set[^free-exercise-db-issue] | Scraped; owner unknown[^free-exercise-db-issue][^exercises-json-issue] | Not meaningful | **Reject** (unclear and likely infringing). |
| exercises.json | Unlicense | Same as above | Maintainer says images are not his[^exercises-json-contrib] | Not meaningful | **Reject.** |
| Exercemus | MIT label[^exercemus] | Mix of CC BY-SA and scraped records relabelled | none | Labels do not match sources | **Reject** (licence does not reflect the inputs). |
| ExerciseDB | AGPL-3.0[^exercisedb-repo] | Owned by the API provider | GIFs, images and video owned by the provider; storing them is forbidden[^exercisedb-terms] | Paid, revocable licence | **Reject.** |
| Darebee | none | Free to share unaltered | Free to share unaltered | Requested link-back | **Reject**: no alteration, and no use inside any app.[^darebee-terms] |
| Nike Training Club, Freeletics, Seven, Fitbod, JEFIT, a goalkeeper app | proprietary | proprietary | proprietary | none offered | **Pattern only**; no text, media or audio copied. |
| Tabler Icons | MIT[^tabler] | none | MIT SVG icons | Keep the MIT notice in the repo | **Reuse as-is** for UI icons. |
| Lucide | ISC, with some icons under MIT from an earlier set[^lucide] | none | ISC SVG icons | Keep the notice | **Reuse as-is** (alternative to Tabler). |

# Notes on the licence families

- **AGPL-3.0:** copying code into this app would make the whole app AGPL, and its network clause requires offering source to users of the hosted app.[^agpl-3] This app needs no AGPL code, so it copies none.
- **CC BY-SA 4.0:** allows commercial and non-commercial use, adaptation and hosting, if the app credits the author, links the licence, says what changed, and releases its adaptation under the same or a compatible licence.[^cc-by-sa-4] Adapted exercise text therefore lives in a content folder under CC BY-SA 4.0, separate from the code's licence.
- **ODbL:** a database licence with its own share-alike on derived databases.[^odbl] Not mixed in without a person's ruling.
- **Unlicense or MIT on scraped content:** a licence is only as good as the licensor's rights. Where a maintainer says the content was taken from elsewhere, the label is disregarded.

[^wger-repo]: wger server repository
[^wger-docs]: wger documentation, licence section
[^wger-api-license]: wger API, licence list
[^wger-api-exercise]: wger API, exerciseinfo endpoint
[^feeel-repo]: Feeel repository
[^everkinetic]: Everkinetic open exercise data
[^free-exercise-db]: free-exercise-db repository
[^free-exercise-db-issue]: free-exercise-db issue on image licensing
[^exercises-json-contrib]: exercises.json contributing guide
[^exercises-json-issue]: exercises.json issue on image licence status
[^exercemus]: Exercemus exercise list repository
[^exercisedb-repo]: ExerciseDB API repository
[^exercisedb-terms]: ExerciseDB API terms of use
[^darebee-terms]: Darebee terms of use
[^tabler]: Tabler Icons (MIT)
[^lucide]: Lucide icons (ISC)
[^cc-by-sa-4]: CC BY-SA 4.0 licence deed
[^cc-best-practice]: Creative Commons, best practices for attribution
[^odbl]: Open Database License
[^agpl-3]: GNU AGPL 3.0
