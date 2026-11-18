---
type: Pattern
title: Claim rules for exercise dossiers
description: What any sentence in a dossier may claim - youth sources first, adult-only evidence labelled, outcomes as ranges with time frames, no promises about looks, size, shape or weight, injury claims no stronger than the evidence, and plain words a teen reads.
tags: [dossiers, claims, evidence, safety, youth, writing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:24:00Z }
sources:
  - { id: adaptations, resource: /dossiers/youth-adaptations.md, title: What training changes in a young athlete, and how fast }
  - { id: csep-2008, resource: https://pubmed.ncbi.nlm.nih.gov/18461111/, title: "Behm et al. CSEP position paper: resistance training in children and adolescents (Appl Physiol Nutr Metab, 2008)" }
  - { id: ioc-2015, resource: https://pubmed.ncbi.nlm.nih.gov/26084524/, title: "Bergeron et al. IOC consensus statement on youth athletic development (Br J Sports Med, 2015)" }
  - { id: soligard-2008, resource: https://pubmed.ncbi.nlm.nih.gov/19066253/, title: "Soligard et al. Comprehensive warm-up programme to prevent injuries in young female footballers (BMJ, 2008)" }
  - { id: reds-2023, resource: https://pubmed.ncbi.nlm.nih.gov/37752011/, title: "Mountjoy et al. 2023 IOC consensus statement on Relative Energy Deficiency in Sport (Br J Sports Med, 2023)" }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
  - { id: wcag-reading, resource: https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html, title: "W3C. Understanding WCAG 2.2, Success Criterion 3.1.5 Reading Level" }
  - { id: privacy, resource: https://github.com/dandelion-love/goalie-goals/blob/main/.claude/skills/public-repo-privacy/SKILL.md, title: Public-repo privacy skill }
---

# Summary

Every sentence in a dossier is a claim, and every claim carries at least one source id.
The rules below decide what a claim may say. The content check enforces the parts a
program can check (see the [content model](/decisions/exercise-dossier.md)); the
reviewer's clean-room read covers the rest.

# The rules

1. **One claim, one or more sources.** Each claim names the source ids it rests on. A
   claim with no source is not shown. A claim that sums up several sources cites all of
   them.
2. **Youth sources first.** Cite a study or position statement on children or
   adolescents when one exists. Rank: youth position statements and meta-analyses, then
   youth trials, then youth observational studies, then adult evidence.
3. **Adult-only evidence is labelled.** When every source for a claim studied adults, the
   claim says so in its own words ("In studies with adults, ...") and is marked `adult`.
   When youth and adult sources mix, it is marked `mixed`. A claim with no youth source
   never sits in "what to expect".
4. **Outcomes are ranges with time frames.** An expected change names what changes, a
   range (low to high), the time it took, how often people trained, and who was studied
   ("in a trial with pupils in their early teens, 6 weeks, twice a week, trunk strength
   tests improved by 8 to 22%"). Quote the low end first. Never a single number, never
   "you will".[^adaptations]
5. **No promises about looks, size, shape or weight.** No bigger, toned, sculpted, lean or
   flat; no abs, six-pack, fat burning, weight loss or gain; no muscle growth or
   hypertrophy. Youth strength gains are mainly the nervous system learning to use the
   muscles (coordination and recruitment), so that is what a dossier
   describes.[^csep-2008][^adaptations] The training rules already rule out any body-
   composition goal, and worry about weight or body shape is a reason to see a
   professional, not a feature.[^training-rules][^reds-2023]
6. **Growth and maturation vary.** Any claim that touches growth, puberty or when gains
   arrive says that timing differs from person to person.[^ioc-2015]
7. **Injury claims no stronger than the evidence.** An exercise is never said to
   "prevent", "stop" or "protect against" injury on its own. The strongest allowed form:
   it is part of the kind of warm-up and strength work linked to fewer injuries in youth
   football, citing the trial and saying it tested a whole programme.[^soligard-2008]
8. **Mechanism is labelled as mechanism.** "Science" sentences explain how something is
   thought to work, and say when a result comes from a lab measure (muscle activity,
   a test) rather than from play.
9. **Say what is not known.** Each dossier has at least one limits claim: what the
   evidence does not show (no goalkeeper trial, adult-only data, no control group).
10. **No doses of its own.** The dossier never states a dose, a hold time or a
    progression that differs from the card and the training rules; it links to
    them.[^training-rules]
11. **Plain words a teen reads.** Keeper-facing text aims at a lower-secondary reading
    level, the level WCAG 2.2 uses as its bar for a simpler version.[^wcag-reading] Short
    sentences, everyday words, "you". A muscle's anatomical name always comes with a plain
    label ("rectus abdominis, the long muscle down the front of your tummy"). Detail for
    the parent may be longer, in a separate field.
12. **Motivating, never shaming.** Speak to what the keeper will be able to do in a game.
    No comparisons with other people, no "weak", no fear of injury as a motive.
13. **Privacy.** Dossiers are written about "an early-teens keeper" or "you", never about
    a real person, and cite age groups as bands. Named people appear only as authors of
    sources or, under the clip policy (#73), as adult professional players chosen by the
    move.[^privacy]

# Words the content check refuses

Outside a source title, the check fails a dossier whose keeper-facing text contains any
of these words or phrases (case-insensitive, matched as whole words so that "absorb",
"fatigue" and "clean" pass): `tone`, `toned`, `sculpt`, `bulk`, `bigger muscles`,
`muscle growth`, `grow your muscles`, `hypertrophy`, `six-pack`, `abs`, `flat stomach`,
`burn fat`, `fat`, `lose weight`, `gain weight`, `weight loss`, `slim`, `lean`,
`body shape`, `look better`, `prevent`, `prevents`, `injury-proof`, `protects you from`,
`guarantee`, `you will`. A limits claim that must name prevention to deny it ("no trial
shows it prevents injury on its own") carries `"negates": true`, which the check
accepts only in the science section's limits. The list lives in the content check and grows by rule 5 of the
board's builder and reviewer loop: each new kind of finding becomes a rule with a test.

# What the check cannot judge

Whether a range is quoted fairly, whether a source really supports a sentence, and
whether the tone is motivating are judged by the reviewer's clean-room read and the
owner's approval, which every dossier needs before the keeper sees it, as every exercise
does.[^training-rules]

[^adaptations]: What training changes in a young athlete, and how fast
[^csep-2008]: CSEP position paper on youth resistance training, 2008
[^ioc-2015]: IOC consensus statement on youth athletic development, 2015
[^soligard-2008]: Soligard et al., FIFA 11+ randomised trial in youth football, 2008
[^reds-2023]: IOC consensus statement on REDs, 2023
[^training-rules]: Training rules for an early-teens keeper
[^wcag-reading]: WCAG 2.2, Understanding Reading Level
[^privacy]: Public-repo privacy skill
