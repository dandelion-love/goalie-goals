---
type: Research Finding
title: Variable rewards
description: Unpredictable rewards (chests, random bonuses) sustain engagement through the same mechanism as gambling; no evidence they build a learning habit, and evidence of harm for young people when tied to spending.
tags: [progression, variable-rewards, loot-boxes, children, dark-patterns]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: rive-duo, resource: https://rive.app/blog/creative-technologists-duolingo-s-solution-to-the-designer-to-developer-handoff, title: "Rive blog: creative technologists at Duolingo (reward chest animations)" }
  - { id: zendle2018, resource: https://doi.org/10.1371/journal.pone.0206767, title: "Zendle and Cairns (2018), Video game loot boxes are linked to problem gambling, PLOS ONE" }
  - { id: zendle2019, resource: https://doi.org/10.1098/rsos.190049, title: "Zendle, Meyer and Over (2019), Adolescents and loot boxes, Royal Society Open Science" }
  - { id: radesky, resource: https://doi.org/10.1001/jamanetworkopen.2022.17641, title: "Radesky et al. (2022), Prevalence and characteristics of manipulative design in mobile apps used by children, JAMA Network Open" }
  - { id: ico-nudge, resource: https://www.hunton.com/privacy-and-cybersecurity-law-blog/age-appropriate-design-ico-issues-draft-code-of-practice-for-online-services-used-by-children/, title: "Hunton: the ICO draft age appropriate design code (2019), nudge techniques" }
  - { id: dkr, resource: https://doi.org/10.1037/0033-2909.125.6.627, title: "Deci, Koestner and Ryan (1999), meta-analysis of extrinsic rewards and intrinsic motivation, Psychological Bulletin 125(6)" }
---

# Mechanic

A reward whose size or content is random: a chest opened after a session, a surprise
bonus, a random multiplier. The unpredictability is the point.

# Evidence

- The reference app uses animated reward chests after sessions.[^rive-duo] No public
  evidence from it was found on whether they build a habit.
- In a survey of over seven thousand gamers, spending on randomised paid rewards (loot
  boxes) was linked to problem-gambling severity.[^zendle2018] Among adolescents, the
  link was reported as stronger than in adults.[^zendle2019] These are correlational
  studies; direction of cause is not settled.
- In apps used by young children, lures to play longer or to buy, including rewards
  dangled at pauses, were common manipulative features.[^radesky]
- The UK regulator's draft children's code named reward loops among nudges that extend
  children's use.[^ico-nudge]
- Expected tangible rewards for doing a task tend to undermine later intrinsic interest,
  while unexpected ones do less harm.[^dkr] So a *rare, unannounced* recognition differs
  from a *scheduled lottery*.

# Evidence gaps (AC4)

No peer-reviewed evidence was found that variable rewards build a durable learning or
exercise habit. Evidence of harm, when linked to money, exists for young people.

# Takeaways

Refused as a mechanic. If a surprise ever appears, it is cosmetic, unannounced, never
purchasable, never tied to doing more, and has no "chance" framing. See
[progression design](/decisions/progression-design.md).

[^rive-duo]: Rive blog, creative technologists
[^zendle2018]: Zendle and Cairns (2018)
[^zendle2019]: Zendle, Meyer and Over (2019)
[^radesky]: Radesky et al. (2022)
[^ico-nudge]: Hunton on the ICO draft code (2019)
[^dkr]: Deci, Koestner and Ryan (1999)
