# Acceptance spec: Split squat (`split-squat`)

Card: [split-squat.json](split-squat.json). Figure: `content/figures/split-squat.svg`.
Status: demo content. The owner approves this exercise, and each harder version, before
any real use ([training rules](/decisions/training-rules.md), rule 1).

## Dose

From [training rules](/decisions/training-rules.md), progression limits. Technique before load: a new exercise starts at 1 to 2 sets of 10 to 15 repetitions with no added load (rule 2), inside the strength limit of 1 to 3 sets of 6 to 15. No
added load, no maximal effort, no set taken to failure (rule 3).

- kind: reps
- sets: 2
- reps: 10
- per_side: yes
- rest_s: 60

Tempo: down for two, up smoothly.

## Progression limit

From [training rules](/decisions/training-rules.md): move to the harder version
(pause for two seconds at the bottom) only when every rep was clean in two
sessions in a row and the owner approves it. One variant step at a time, never more. Hold
all progressions during fast growth or new knee or heel pain, and after a week or more off
restart one step below the last level.

## Stop signs

From [training rules](/decisions/training-rules.md), warning signs that stop a session.
Stop at once and record why if any of these appears:

- Pain in the knee, hip or lower back
- Pain that changes how you move
- Chest pain, a racing heartbeat or unusual shortness of breath
- Dizziness or feeling faint
- Losing balance again and again (end the set)

## Acceptance

- The card's dose matches the Dose list above exactly, and stays inside the limits it cites.
- The card's `stop_if` list matches the Stop signs above.
- Every card line the player sees meets the [quality rubric](/decisions/quality-rubric.md)'s
  CT1: cue labels at most 3 words, every other sentence at most 12 words. A long stop sign
  is split into short ones, never dropped.
- The card names at least one substitute, and its figure and credits entries exist.
