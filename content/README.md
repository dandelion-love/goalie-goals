# Exercise content

Everything in this folder (exercise text, figures, diagrams and icons) is licensed under
[CC BY-SA 4.0](LICENSE), copyright the goalie-goals contributors, except where
`credits.json` names another compatible licence and author. The app's code outside this
folder is MIT (see `/LICENSE`).

Every file here, other than this README, `LICENSE` and `credits.json`, has an entry in
`credits.json`. Share-alike material (CC BY-SA) lives only in this folder.
`python3 tools/credits_check.py` enforces both; see the exercise-media Decision in
`docs/knowledge/decisions/exercise-media.md`.

## Exercise cards

- `exercises/<id>.json`: one exercise card, in the shape of the exercise card pattern
  (`docs/knowledge/exercise-apps/explanation-elements.md`) plus the equipment fields of
  the equipment-model Decision. Every card starts unapproved; the owner approves it
  before real use.
- `exercises/<id>.spec.md`: the card's acceptance spec. It cites the training-rules
  Decision for the dose, the progression limit and the stop signs.
- `figures/<id>.svg`: the card's figure, a plain SVG with no metadata.
- `exercises/<id>.dossier.json`: the card's dossier (why it matters for a goalkeeper, what
  to expect, and the evidence), in the shape of the exercise-dossier Decision
  (`docs/knowledge/decisions/exercise-dossier.md`). Every claim names its sources and
  evidence label. It starts unapproved; the parent approves it in the app, and any change
  to the file asks again.

`python3 tools/content_check.py` validates every card against its schema, its spec, the
default equipment profiles, the training-rules limits, its figure and its credits, and
every dossier against the Decision and the claim rules (`docs/knowledge/dossiers/`).
