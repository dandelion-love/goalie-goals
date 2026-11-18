# Quality measures for a game-like training app

Published heuristics and design-quality measures, and how each applies to an app a keeper
and a parent use together during physical training.

## Usability

* [Usability heuristics and severity ratings](/quality/usability-heuristics.md) - Nielsen's ten heuristics and the 0-4 severity scale give a published, repeatable way for one evaluator to find and rank usability problems without recruiting users.
* [Usability measures - effectiveness, efficiency and satisfaction](/quality/usability-measures.md) - ISO 9241-11 defines usability by effectiveness, efficiency and satisfaction; task success, steps or time on task, and a short post-task question are the standard measures, and only some of them can be taken without participants.
* [The System Usability Scale and child-adapted versions](/quality/system-usability-scale.md) - SUS is a ten-item questionnaire scored 0-100 with published benchmarks; child-adapted versions exist but have thin validity evidence, so the keeper's score needs care.

## Accessibility and platform floors

* [WCAG 2.2 criteria that set measurable thresholds](/quality/wcag-22.md) - The WCAG 2.2 success criteria with numeric or testable thresholds and which of them bite on a training app used from the floor.
* [Platform human interface guidelines as a quality floor](/quality/platform-guidelines.md) - Apple's and Android's design guidelines set concrete floors for hit size, type, contrast, motion, feedback and audio.
* [Legibility at a distance](/quality/legibility-at-distance.md) - Character height is judged by the visual angle it subtends; display ergonomics asks for at least 16 and prefers 20 to 22 minutes of arc, which sets a minimum digit height for a timer read from the floor.

## Look and feel

* [Visual consistency, design tokens and the aesthetic-usability effect](/quality/visual-consistency.md) - Attractive, consistent interfaces are rated easier to use; a small set of named design tokens keeps them consistent, and distinct values in use can be counted.
* [Game feel and juiciness](/quality/game-feel-and-juice.md) - Layered, redundant feedback on every action raises visual appeal reliably and competence only sometimes, so it should confirm the action, not replace information.
* [Motion durations and reduced motion](/quality/motion-and-reduced-motion.md) - Interface animations work best between about 100 and 400 ms, honour a reduced-motion preference, and stay under the flash threshold.
* [Sound levels and audio-visual sync](/quality/sound-levels-and-sync.md) - Even loudness, a peak ceiling and the window in which a sound and its visual event feel simultaneous, all measurable from files and timestamps.
* [Copy tone and plain language](/quality/copy-tone-and-plain-language.md) - Word counts, a glossary and a banned-phrase list make copy checkable without judging taste.

## Speed

* [Response-time limits and web performance thresholds](/quality/response-time-limits.md) - The 0.1 s, 1 s and 10 s limits, and the web's interaction, paint and layout-shift thresholds, timed in a browser on a local run.

# Decision

* [Quality rubric for look, feel and usability](/decisions/quality-rubric.md) - 37 items scored 0-3 by the reviewer from a local demo-data run, each with a target and a repeatable method.
