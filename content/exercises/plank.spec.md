# Acceptance spec: Front plank (`plank`)

Card: [plank.json](plank.json). Figure: `content/figures/plank.svg`.
Status: demo content. The owner approves this exercise, and each harder version, before
any real use ([training rules](/decisions/training-rules.md), rule 1).

## Dose

From [training rules](/decisions/training-rules.md), holds: 1 to 2 sets, a starting
hold of 10 to 20 seconds, at most 5 seconds longer at a time after two clean sessions
and the owner's approval, never longer than 30 seconds, and at least 30 seconds rest
between sets. The hold ends when the position breaks. No added load, no maximal
effort, no set taken to failure (rule 3).

- kind: hold
- sets: 2
- seconds: 20
- per_side: no
- rest_s: 45

Tempo: still and steady.

## Progression limit

From [training rules](/decisions/training-rules.md): move to the harder version
(lift one foot a little for two seconds, then the other) only when every rep was clean in two
sessions in a row and the owner approves it. One variant step at a time, never more. Hold
all progressions during fast growth or new knee or heel pain, and after a week or more off
restart one step below the last level.

## Stop signs

From [training rules](/decisions/training-rules.md), warning signs that stop a session.
Stop at once and record why if any of these appears:

- Pain in the lower back or shoulders, or pain that changes how you move
- Chest pain, dizziness, feeling faint, a racing heartbeat or unusual shortness of breath
- Hips sag and cannot be lifted again (end the set)

## Acceptance

- The card's dose matches the Dose list above exactly, and stays inside the limits it cites.
- The card's `stop_if` list matches the Stop signs above.
- The card names at least one substitute, and its figure and credits entries exist.
