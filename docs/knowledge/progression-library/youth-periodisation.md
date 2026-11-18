---
type: Research Finding
title: Youth periodisation and the football year
description: How youth strength guidance plans training in short blocks with a lighter week, how much strength work keeps or builds strength around team training, and the general shape of a football year from off-season to in-season.
tags: [progression-library, periodisation, youth, football, season, load]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T08:55:00Z }
sources:
  - { id: nsca-2009, resource: https://pubmed.ncbi.nlm.nih.gov/19620931/, title: "Faigenbaum et al. Youth resistance training: updated position statement paper from the NSCA (J Strength Cond Res, 2009)" }
  - { id: lloyd-2014, resource: https://pubmed.ncbi.nlm.nih.gov/24055781/, title: "Lloyd et al. Position statement on youth resistance training: the 2014 International Consensus (Br J Sports Med, 2014)" }
  - { id: faigenbaum-2016, resource: https://pubmed.ncbi.nlm.nih.gov/26089321/, title: "Faigenbaum et al. Citius, Altius, Fortius: beneficial effects of resistance training for young athletes (Br J Sports Med, 2016)" }
  - { id: ypd-2012, resource: https://doi.org/10.1519/SSC.0b013e31825760ea, title: "Lloyd et al. The Youth Physical Development Model: a new approach to long-term athletic development (Strength Cond J, 2012)" }
  - { id: lesinski-2016, resource: https://pubmed.ncbi.nlm.nih.gov/26851290/, title: "Lesinski, Prieske and Granacher. Effects and dose-response relationships of resistance training on physical performance in youth athletes (Br J Sports Med, 2016)" }
  - { id: ioc-2015, resource: https://pubmed.ncbi.nlm.nih.gov/26084524/, title: "Bergeron et al. IOC consensus statement on youth athletic development (Br J Sports Med, 2015)" }
  - { id: brenner-2016, resource: https://pubmed.ncbi.nlm.nih.gov/27573090/, title: "Brenner. Sports specialization and intensive training in young athletes, AAP clinical report (Pediatrics, 2016)" }
  - { id: silva-2015, resource: https://pubmed.ncbi.nlm.nih.gov/26284158/, title: "Silva, Nassis and Rebelo. Strength training in soccer with a specific focus on highly trained players (Sports Med Open, 2015)" }
  - { id: bosquet-2007, resource: https://pubmed.ncbi.nlm.nih.gov/17762369/, title: "Bosquet et al. Effects of tapering on performance: a meta-analysis (Med Sci Sports Exerc, 2007)" }
  - { id: gabbett-2016, resource: https://pubmed.ncbi.nlm.nih.gov/26758673/, title: "Gabbett. The training-injury prevention paradox: should athletes be training smarter and harder? (Br J Sports Med, 2016)" }
  - { id: training-rules, resource: /decisions/training-rules.md, title: Training rules for an early-teens keeper }
---

# Summary

Youth strength guidance asks for training that is varied on purpose over time, not the
same session forever, and for rest built into the week and the year. The evidence for a
specific block length or a lighter week in young athletes is thin; the app borrows the
general shape (a few building weeks, then a lighter one), keeps it inside the
[training rules](/decisions/training-rules.md), and lets the football calendar set how
much strength work fits.

# Planned variation

- The NSCA position statement recommends varying the programme systematically over time
  (sets, repetitions, exercises, rest) to keep progress going and lower the risk of
  overtraining.[^nsca-2009]
- The 2014 International Consensus and a later review describe resistance training as
  one part of a long-term, integrated plan with motor skill work, progressed by
  technical competence before load.[^lloyd-2014][^faigenbaum-2016]
- The Youth Physical Development Model sets which qualities to stress at each stage of
  growth; for early teens around the growth spurt it keeps strength and movement skill
  central.[^ypd-2012]
- A meta-analysis of resistance training in youth athletes found moderate effects on
  strength and jumping and small effects on sprint and agility, with the largest strength
  gains from programmes longer than about 23 weeks.[^lesinski-2016] Its most effective
  intensities (heavy loads near maximal) are outside what the app may prescribe; the
  useful point here is that strength builds over months, so the rotation must be
  sustainable for months.

# A lighter week

- Taper research in adult athletes found the best results from cutting training volume
  by about 41 to 60% while keeping intensity and frequency.[^bosquet-2007] The app does
  not taper for competitions, but borrows the principle for its lighter week: **keep the
  days, cut the volume.** Keeping the days also keeps the habit cue.
- Spikes in load relative to what an athlete is used to are linked to injury, and a
  steady build is protective; the data come mostly from adult and elite
  sport.[^gabbett-2016] A lighter week after a few building weeks keeps the build steady.
- No youth trial found here tests a 4-week block with a lighter fourth week against
  another shape. The block length is a design choice, matched to the four-week block the
  [progression design](/decisions/progression-design.md) already uses for spare days.

# Rest across the week and the year

- The AAP advises young athletes to take at least 1 to 2 days a week off from organised
  training, and time away from their one sport in blocks across the year.[^brenner-2016]
- The IOC consensus asks for load to be planned and monitored across all of a young
  athlete's sport, with enough rest and sleep, because overload and too little recovery
  raise injury and burnout risk.[^ioc-2015]
- The [training rules](/decisions/training-rules.md) turn this into a limit: at least 1,
  preferably 2, full rest days a week, counting team training.[^training-rules]

# Strength work around team training

- A review of strength training in football found two strength sessions a week enough to
  raise strength and power in pre-season, and one a week enough to avoid losing it
  in-season.[^silva-2015] Its players were mostly highly trained adults, so for a young
  keeper this is a cautious floor, not a target.
- The youth guidance's 2 to 3 non-consecutive strength days a week[^nsca-2009] therefore
  fit two shapes: 3 days when there are no matches, 2 when there are.

# The shape of a football year

Described generically; it names no league, region or calendar. The parent's own dates go
into the app, never into this repo.

| Phase | What the team does | What home training does |
|---|---|---|
| Off-season | No team training or matches, often for some weeks | The full rotation: 3 strength days, up to 2 jump days. Time away from football itself, as the AAP advises.[^brenner-2016] |
| Pre-season | Team training restarts, often more often; friendly matches | 3 strength days if they fit around team sessions, else 2; jumps limited as team sessions add running and jumping.[^silva-2015] |
| In-season | Team training on set days and a weekly match | 2 strength days away from the match, at most 1 jump day, light days as the cue.[^silva-2015] |
| Mid-season break | A pause of one or more weeks | The full rotation again; after a week or more off, restart one step below.[^training-rules] |

# Gaps

- No youth trial found compares block lengths or lighter-week rules.
- Team training load at home is unknown to the app: it cannot count the jumps and
  sprints a team session holds, so it treats each team session as a training day and
  keeps its own jump and sprint days away from them.
- Silva and Bosquet are mostly adult data; Lesinski's best doses are heavier than the
  app allows. Each is used only for a direction.

[^nsca-2009]: NSCA youth resistance training position statement, 2009
[^lloyd-2014]: 2014 International Consensus on youth resistance training
[^faigenbaum-2016]: Faigenbaum et al., resistance training for young athletes, 2016
[^ypd-2012]: The Youth Physical Development Model, 2012
[^lesinski-2016]: Lesinski et al., dose-response meta-analysis in youth athletes, 2016
[^ioc-2015]: IOC consensus statement on youth athletic development, 2015
[^brenner-2016]: AAP clinical report on sports specialisation, 2016
[^silva-2015]: Silva et al., strength training in soccer, 2015
[^bosquet-2007]: Bosquet et al., tapering meta-analysis, 2007
[^gabbett-2016]: Gabbett, the training-injury prevention paradox, 2016
[^training-rules]: Training rules decision
