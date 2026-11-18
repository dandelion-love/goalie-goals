# Acceptance spec: Set position (`set-position`)

Card: [set-position.json](set-position.json). Figure: `content/figures/set-position.svg`.
Status: demo content, the first goalkeeper card. The owner approves this exercise, and each
harder version, before any real use ([training rules](/decisions/training-rules.md), rule 1).

Written from rung 1 of the set-position ladder in the
[goalkeeper ladders](/progression-library/ladders-goalkeeper.md): on the parent's call,
drop into the ready stance and hold it for 3 s; body only; reps, 2 x 10, rest 45 s;
unlock at 2 x 15; step down to a slower call with the stance held 5 s.

## Dose

From [training rules](/decisions/training-rules.md), progression limits. A technique rung
with no jump uses the repetition dose: a new exercise starts at 1 to 2 sets of 10 to 15
repetitions with no added load (rule 2). Each rep is one drop into the stance and a 3 s
hold. No added load, no maximal effort, no set taken to failure (rule 3).

- kind: reps
- sets: 2
- reps: 10
- per_side: no
- rest_s: 45

Tempo: drop on the call, hold still for 3 s.

## Progression limit

From [training rules](/decisions/training-rules.md): build from 2 x 10 toward 2 x 15
inside rule 2. Move to the harder version (rung 2 of the ladder, `set-from-walk`: walk 2 or
3 steps in, then set on a raised hand) only when every rep was clean at 2 x 15 in two
sessions in a row and the owner approves it. One variant step at a time, never more. Hold
all progressions during fast growth or new knee or heel pain, and after a week or more off
restart one step below the last level. The step down is the card's `easier`: a slower call,
with the stance held 5 s.

## Cues the parent checks

The ladder's clean cues, all visible to a parent standing in front like a shooter, with no
coaching knowledge needed ([unlock rules](/progression-library/unlock-rules.md), the cue
test):

- Feet about shoulder width; knees bent; heels just off the floor (`parent_check` 1, cue
  "Heels just up").
- Hands up in front, palms facing the parent (`parent_check` 2, cue "Palms to parent").
- Head still for the 3 s (`parent_check` 3, cue "Head still").

## Stop signs

From [training rules](/decisions/training-rules.md), warning signs that stop a session.
Stop at once and record why if any of these appears:

- Pain in an ankle, knee or hip
- Pain that changes how you move
- Chest pain, a racing heartbeat or unusual shortness of breath
- Dizziness or feeling faint
- Slipping on the floor (fix footwear or surface before going on)

## Place in the week

The card joins **Quick feet, strong arms** (`quick-feet-strong-arms` in
`server/src/weeklyPlan.ts`), first in the session: `set-position`, `lateral-shuffle`,
`wall-push-up`.

- **Why this session.** It is the footwork session, and the lateral shuffle starts from
  the same ready stance, so the stance is taught just before it is used. The footwork
  ladder builds on this card too (`quick-feet-set` and `shuffle-to-set` end in a set
  stance). As a footwork card it is quick work, so it comes before the strength card
  (training rules: quick work before strength).
- **Why not Strong middle.** Strong middle already reads "About 12 minutes". Getting it
  back to about 10 with a new card leaves room for only one of its trunk cards, and the
  quality rubric's fixed audit screens need both Front plank (K3, K5) and Glute bridge
  (K4) in it. So Strong middle is left as it is.
- **The trade.** `broad-jump-stick` leaves the week (it stays a card in the library, and
  `pogo-hops` keeps its substitute link). The session goes from about 14 minutes (830 s) to
  about 12 (739 s): the card adds 125 s and the trade takes out 216 s, so no session gets
  longer. Jumps now fall on one day a week (Spring legs), inside the limit of two.
- **Not yet about 10 minutes.** Spring legs (about 15) and this session (about 12) are
  still over the "about 10 minutes" the starter plan promises. That predates this card and
  is left to its own story.

## Approval

The card reaches the parent as a new-exercise request (`card-set-position`, kind
`exercise`), with its reason and dose. Adding it changes the session's version (the
session binds the exact card versions it uses), so **Quick feet, strong arms** also comes
back to the parent as a session request. Until both are approved, the keeper is offered
the last approved version of that session (without this card) or rest; the card is never
in a session the keeper plays before the owner, as the parent, approves it.

## Sources

The ladder row cites the goalkeeper-power research finding for the ready stance; the
stance itself is coaching practice, and no youth study tests a set-position drill. The dose
and its progression are a cautious reading of the general youth guidance, checked by the
owner's approval of each rung.

- [Goalkeeper ladders](/progression-library/ladders-goalkeeper.md), set position, rung 1.
- [Goalkeeper-specific power](/training/goalkeeper-power.md): saves are short, explosive
  dives and jumps, the actions the stance prepares for. It draws on White et al., a review
  of goalkeeper match-play (Sports Med, 2018, https://doi.org/10.1007/s40279-018-0977-2), and
  Ziv and Lidor on goalkeepers' physical attributes (Int J Sports Physiol Perform, 2011,
  https://doi.org/10.1123/ijspp.6.4.509).
- Faigenbaum et al., NSCA youth resistance training position statement (J Strength Cond
  Res, 2009, https://pubmed.ncbi.nlm.nih.gov/19620931/): technique before load, 1 to 2
  sets of 10 to 15 to start.
- Lloyd et al., NSCA position statement on long-term athletic development (J Strength Cond
  Res, 2016, https://pubmed.ncbi.nlm.nih.gov/26933920/): movement skill before speed.
- Bergeron et al., IOC consensus statement on youth athletic development (Br J Sports Med,
  2015, https://doi.org/10.1136/bjsports-2015-094962): skill-focused, varied youth training.

## Acceptance

- The card's dose matches the Dose list above exactly, and stays inside the limits it cites.
- The card's `stop_if` list matches the Stop signs above.
- Every card line the player sees meets the [quality rubric](/decisions/quality-rubric.md)'s
  CT1: cue labels at most 3 words, every other sentence at most 12 words. A long stop sign
  is split into short ones, never dropped.
- The card names at least one substitute, and its figure and credits entries exist.
- The weekly plan keeps the training rules with the card in it (`checkPlanRules` finds
  nothing), the card comes before the strength card in its session, and no session reads
  longer than before.
- The card and its session reach the parent as requests, and the card is in no session
  the keeper can play until the parent approves both.
