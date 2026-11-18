---
type: Research Finding
title: Harms and dark patterns for young users
description: Where habit mechanics turn manipulative for children and teens, what regulators and researchers say, and which mechanics carry the evidence of harm.
tags: [progression, dark-patterns, children, regulation, safety]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: ico-aadc, resource: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/, title: "ICO: Age appropriate design code (Children's code)" }
  - { id: ico-nudge, resource: https://www.hunton.com/privacy-and-cybersecurity-law-blog/age-appropriate-design-ico-issues-draft-code-of-practice-for-online-services-used-by-children/, title: "Hunton: the ICO draft age appropriate design code (2019), nudge techniques" }
  - { id: ico-games, resource: https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2023/02/new-guidance-to-industry-issued-for-game-developers-on-protecting-children, title: "ICO: guidance for game developers on protecting children (2023)" }
  - { id: ftc, resource: https://www.ftc.gov/reports/bringing-dark-patterns-light, title: "US FTC staff report (2022), Bringing dark patterns to light" }
  - { id: radesky, resource: https://doi.org/10.1001/jamanetworkopen.2022.17641, title: "Radesky et al. (2022), Prevalence and characteristics of manipulative design in mobile apps used by children, JAMA Network Open" }
  - { id: fiverights, resource: https://5rightsfoundation.com/uploads/Disrupted-Childhood-2023-v2.pdf, title: "5Rights Foundation (2023), Disrupted Childhood: the cost of persuasive design" }
  - { id: csm, resource: https://www.commonsensemedia.org/press-releases/teens-are-bombarded-with-hundreds-of-notifications-a-day, title: "Common Sense Media (2023), Constant Companion: teens and notifications" }
  - { id: silverman, resource: https://doi.org/10.1093/jcr/ucac029, title: "Silverman and Barasch (2023), On or off track: how (broken) streaks affect consumer decisions, Journal of Consumer Research 49(6)" }
  - { id: zendle2019, resource: https://doi.org/10.1098/rsos.190049, title: "Zendle, Meyer and Over (2019), Adolescents and loot boxes, Royal Society Open Science" }
---

# What the guidance says

- The UK children's code applies to online services likely to be used by children; it
  requires the child's best interests to come first, high-privacy defaults and data
  minimisation, and limits on nudge techniques.[^ico-aadc] Its 2019 draft named reward
  loops and streaks as nudges that can extend children's use.[^ico-nudge] The final
  standard on nudges is narrower (it targets nudges toward giving data or weakening
  privacy) but endorses nudges toward wellbeing, such as taking breaks.[^ico-aadc] The
  draft is cited here as the regulator's stated concern, not as the binding rule.
- The regulator's tips for game developers ask for break prompts and checkpoints without
  pressure or fear of missing out, and warn against using rewards to push account
  creation.[^ico-games]
- The US consumer regulator defines dark patterns as design that tricks or manipulates
  users into choices they would not otherwise make, and lists fake urgency, hidden costs
  and obstructed choices among them.[^ftc]

# What research has found

- Manipulative features (characters pressuring the child, time pressure, lures to keep
  playing or buy) were present in the large majority of apps used by young children, and
  more common among children from less-advantaged homes.[^radesky]
- A children's-rights report lists persuasive features, including shared day-counts,
  that keep children online for commercial gain.[^fiverights]
- Teens already receive hundreds of notifications a day.[^csm]
- Broken streaks demotivate, and people pay to repair them.[^silverman]
- Spending on randomised rewards is linked to problem gambling in adolescents.[^zendle2019]

# Dark patterns relevant to a training app

| Dark pattern | Mechanic it hides in | Specific risk here |
|---|---|---|
| Guilt messaging | Reminders, a sad or scolding character, "you broke it" screens | Pressure on a teen; conflict between parent and teen |
| Pay-to-repair or pay-to-protect | Streak repair, protection items for money or gems | Monetises loss aversion |
| Fake urgency | Countdown to "lose your streak", expiring rewards | Rushing, training tired or late |
| Pushing through pain | Completion-based rewards, near-full progress bars, "finish the set" | Injury in a growing athlete |
| Endless play | "One more", autoplay, no end screen | Overtraining, no recovery |
| Variable rewards | Chests, random bonuses | Gambling-like loop |
| Social pressure | Leaderboards, visible streaks of others, shared streak blame | Comparison, blame between the pair |

See [progression design](/decisions/progression-design.md).

[^ico-aadc]: ICO Children's code
[^ico-nudge]: Hunton on the ICO draft code (2019)
[^ico-games]: ICO, guidance for game developers (2023)
[^ftc]: FTC (2022)
[^radesky]: Radesky et al. (2022)
[^fiverights]: 5Rights Foundation (2023)
[^csm]: Common Sense Media (2023)
[^silverman]: Silverman and Barasch (2023)
[^zendle2019]: Zendle, Meyer and Over (2019)
