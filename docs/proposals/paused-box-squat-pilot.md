# Proposed acceptance: paused box squat pilot

Status: proposed for review. This document does not approve a dose, exercise, dossier or session. It does not make the next card available to a household.

## Candidate and sources

The existing progression library lists `squat-to-box-pause` as the second squat rung. Its movement is the first rung with a still two-second pause just above the box, followed by standing. The documented starting dose is two sets of ten repetitions with 60 seconds of rest; its later unlock target is two sets of fifteen. The listed equipment is body only and a stable step or box. These are candidate content values, not a new prescription. See `docs/knowledge/progression-library/ladders-strength.md` and `docs/knowledge/decisions/training-rules.md`.

The existing `squat-to-box` card starts at two sets of ten. That version cannot satisfy the two-by-fifteen prior-rung threshold. A real dose increase must follow the documented single-lever steps, with two clean sessions and parent approval at each change; it cannot jump directly to the target. The owner has chosen a capped final one-repetition step from 2 × 14 to 2 × 15, under the same clean-session and parent approval conditions. Each exact dose version also requires owner content approval and parent in-app approval. The new paused exercise and its dossier likewise need their own reviewed versions, owner content approval and parent in-app approval before use. No content approval follows from the rule decision, this proposal or the synthetic preview.

## Behavioral acceptance

1. The candidate card and dossier are written and independently reviewed against the existing ladder, source evidence and stop rules. The movement, two-second pause, candidate dose, required equipment, easier alternative and cues agree with the reviewed sources. Any unsupported claim remains unavailable rather than inferred. The owner separately approves content before it can be proposed for real use.
2. In an isolated synthetic run, a server-authorized prior-card version at a qualifying dose and two consecutive parent-confirmed clean sessions establish readiness only when authoritative ordering and all applicable safety, growth, break and step-down conditions are clear. Sessions without the exercise do not break the pair; an unclean performed session does. Unknown or incomplete evidence never counts as clean.
3. Readiness alone does not publish, schedule or unlock the new card. The next card becomes available only after its exact content version has owner approval and an explicit parent decision through the existing in-app approval flow. The resulting state is persisted and survives reload without duplicating the decision.
4. Tests cover the current two-by-ten dose, missing and negative set confirmations, incomplete sessions, unknown or out-of-order history, pain and other safety holds, absent prior-dose approval, absent owner content approval, absent parent approval, replay and household reset. Each remains held or unknown as appropriate; none grants the next card.
5. The same approved versions and recorded state are visible to authorized household roles only. A synthetic fixture never writes to a real household and is not included in the production bundle. Displayed rank and artwork do not imply an exercise is safe, approved, scheduled or completed.

## Review outputs required before implementation

- A checked exercise specification, dossier, source and licence record, and suitable figure or neutral fallback.
- A versioned, reviewed plan for each prior-dose transition, including resolution of the final step to fifteen, and for the second card; none is approved by this draft.
- Authoritative sequence completeness and safety/restart facts from issue 154, with positive and rejection tests.
- A review of the owner approval and parent in-app approval boundaries, including the exact versions they cover.
