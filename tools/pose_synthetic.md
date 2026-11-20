# Synthetic pose renderer

This local-only prototype accepts one fixed, invented fixture and prints an SVG. It does not
read footage, accept file paths or URLs, call a model, provision infrastructure, or spend money.
The NASA manifest entry is disabled reference metadata, not an authorised input to this tool.
The fixture and its angles are invented; they are not exercise guidance and must not be shipped
as a card figure. No user, family or actual person's data was used.

```text
python3 tools/pose_synthetic.py synthetic-squat-v1
python3 -m unittest discover -s tests -p test_pose_synthetic.py
```

The fixture gives exactly two root points, five absolute 2D segment angles in degrees (screen X
right and Y down), and a duration in milliseconds per pose. The renderer checks the shape,
source identifier, finite bounds, on-canvas positions and timings. It prints a generic,
faceless SVG with a timed loop when requested by the `#motion` fragment and two still poses by
default, including when reduced motion is requested. It does not add a card, an approval, a
credit, or an app route. The actual source allowlist and the real extraction path do not yet
exist: a caller supplying a synthetic ID to an imported function is not proof of provenance.

## Before any real-footage or hosted-model run

The existing #88 mandate is for Gemini pose extraction, not generated images, with a USD 20
total cap. This prototype does not implement or verify that mandate. A future concrete setup
needs owner approval to lift this task's no-cloud and no-external-footage restriction and to
select the configuration below. The existing USD 20 cap remains in force; this does not ask
to renew or raise it:

- A separate tooling project and billing attachment, region, model and API endpoint, all
  supplied outside the repo; a USD 20 budget alert is an alert, not a hard spending stop.
  Enforce the remaining total locally before each call using current model prices and track
  actual and estimated usage across retries and runs; fail closed if either is unknown.
- A least-privilege service identity, private bucket and retention/deletion settings, with
  project, billing and bucket identifiers in external configuration. Credentials belong in
  Secret Manager, never in the repo or a public log. Do not make a bucket or object public.
- A checked, fixed manifest mapping each permitted coverage-table clip to its own publisher,
  rights, permitted acquisition and immutable input identity. Reject all other inputs and all
  personal or family footage; do not trust a caller-provided source label as proof.
- The exact source, private keyframe selection, transfer to the model endpoint, region,
  provider data-use and retention terms, retention/deletion of source and derived data, and
  handling of identifiers, likenesses, branding and third-party material require a concrete
  data-handling review. NASA's clip-specific status and applicable AI-use guidance must be
  checked before using that candidate. Never place footage or frames in the repo, app, issues,
  public logs or PRs; never trace or publish an identifiable person.
- Validate structured model output as untrusted numeric data, reject missing or uncertain
  joints rather than inventing them, and review the generic figure against the approved card
  spec. Record provenance and model assistance; do not imply source-provider endorsement.
  The changed figure changes the card and session versions; the parent decides both in the app.

Run evidence intended for the board should contain counts only. #88's Gemini integration,
input safeguards, budget enforcement, decision update, source-based figures and three-card
batch remain open. The synthetic renderer is not evidence that any of those gates passed.
