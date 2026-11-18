# Acceptance spec: Broad jump with stick landing (`broad-jump-stick`)

Card: [broad-jump-stick.json](broad-jump-stick.json). Figure: `content/figures/broad-jump-stick.svg`.
Status: demo content. The owner approves this exercise, and each harder version, before
any real use ([training rules](/decisions/training-rules.md), rule 1).

## Dose

From [training rules](/decisions/training-rules.md), progression limits. Power work stays within 1 to 3 sets of 3 to 6. Jump contacts start at 50 to 60 a session, never above about 100, at most twice a week. This card uses 9 contacts, which leaves room for other jump work in the same session. No
added load, no maximal effort, no set taken to failure (rule 3).

- kind: contacts
- sets: 3
- reps: 3
- per_side: no
- rest_s: 90

Tempo: load, jump, freeze for two.

## Progression limit

From [training rules](/decisions/training-rules.md): move to the harder version
(a slightly longer jump, still freezing for two seconds) only when every rep was clean in two
sessions in a row and the owner approves it. One variant step at a time, never more. Hold
all progressions during fast growth or new knee or heel pain, and after a week or more off
restart one step below the last level.

## Stop signs

From [training rules](/decisions/training-rules.md), warning signs that stop a session.
Stop at once and record why if any of these appears:

- Pain in the knee, below the kneecap, heel or ankle
- Chest pain, dizziness, feeling faint, a racing heartbeat or unusual shortness of breath
- Landing on straight knees, or the knees cave in (end the set)

## Acceptance

- The card's dose matches the Dose list above exactly, and stays inside the limits it cites.
- The card's `stop_if` list matches the Stop signs above.
- The card names at least one substitute, and its figure and credits entries exist.
