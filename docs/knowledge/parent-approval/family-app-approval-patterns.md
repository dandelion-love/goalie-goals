---
type: Research Finding
title: How family and youth apps handle parental approval
description: Approve-before-use, request-and-wait and approve-after-with-undo as used by platform family controls and youth sport services, and what each teaches a training app.
tags: [parent-approval, patterns, family-controls]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:45:00Z }
stale_after: 2027-11-17T00:00:00Z
sources:
  - { id: ask-to-buy, resource: https://support.apple.com/en-us/105055, title: "Apple Support: Approve what kids buy and download with Ask to Buy" }
  - { id: screen-time-requests, resource: https://support.apple.com/guide/child-safety/dq4vly6fq1je/web, title: "Apple Support: Approve your child's purchases, downloads, and Screen Time requests" }
  - { id: play-approvals, resource: https://support.google.com/googleplay/answer/7039872, title: "Google Play Help: Purchase approvals on Google Play" }
  - { id: family-link-teens, resource: https://support.google.com/families/answer/9092383, title: "Google For Families Help: supervision for teens" }
  - { id: stack-sports, resource: https://stacksports.com/legal-COPPA, title: "Stack Sports: Children's Privacy Policy" }
---

# Three patterns

| Pattern | How it works | Seen in |
| --- | --- | --- |
| Approve-before-use | the child cannot get the item until an adult says yes | Ask to Buy;[^ask-to-buy] Play purchase approvals[^play-approvals] |
| Request-and-wait | the child sends a request, sees it pending, and gets a timed or scoped answer | Screen Time "ask for more time"[^screen-time-requests] |
| Approve-after with undo | the child acts, the adult is told and can reverse it | supervision changes on teen accounts[^family-link-teens] |

# What the platforms do

- **Who approves.** Ask to Buy goes to the family organiser or an adult they make a
  parent or guardian, so one adult can carry the load.[^ask-to-buy] Play requests go to the
  family manager or a parent.[^play-approvals]
- **Where the request lands.** The adult gets a notification on their own device; missed
  Ask to Buy requests stay findable in Messages.[^ask-to-buy] Family Link puts free-content
  requests on the parent's phone.[^play-approvals]
- **In person.** Play offers the child "Ask in a message" or "Ask in person"; the in-person
  path has the adult authenticate on the child's device.[^play-approvals] Screen Time lets
  the parent enter a passcode on the child's device.[^screen-time-requests]
- **Scoped answers.** Screen Time approval is for 15 minutes, an hour or the rest of the
  day, or "Not Now".[^screen-time-requests] Play lets a parent pick which classes of content
  need approval.[^play-approvals]
- **Expiry.** An Ask to Buy request dismissed or unanswered for 24 hours lapses and the
  child must ask again; a decline tells the child and nothing is
  installed.[^ask-to-buy]
- **No exception by rating.** Ask to Buy asks for every new item regardless of age rating;
  re-downloads and updates of approved items do not ask again.[^ask-to-buy]
- **Teens leaving supervision.** Google's help text describes the parent being notified
  and supervised devices locking for a period if a teen stops supervision; later reporting
  says Google moved to requiring parent approval for under-18s. The live page should be
  checked; either way the adult is never silently cut out.[^family-link-teens]
- **Youth sport services.** Some youth sport platforms allow a child account only when a
  parent sets it up and permits it.[^stack-sports]

# Lessons for a training app

- Approve-before-use suits anything with physical risk: new exercises, more load, return
  after pain.
- Request-and-wait suits the keeper's own asks ("can I add a diving drill?"), with a
  visible pending state.
- Approve-after with undo suits low-risk personal choices only (a theme, the order of
  approved sessions); never load.
- Silence is not consent: a lapsed request is a no, as with Ask to Buy.[^ask-to-buy]
- An approval covers one version of one item; changing it re-asks, as updates to the same
  item do not.[^ask-to-buy]

[^ask-to-buy]: Apple Support, Ask to Buy.
[^screen-time-requests]: Apple Support, child-safety guide, approving Screen Time requests.
[^play-approvals]: Google Play Help, purchase approvals.
[^family-link-teens]: Google For Families Help, teen supervision; behaviour reported to have changed in 2026.
[^stack-sports]: Stack Sports, Children's Privacy Policy.
