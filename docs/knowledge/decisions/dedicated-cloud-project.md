---
type: Decision
title: A dedicated cloud project with a small monthly budget
description: The app's data and hosting live in a cloud project of their own, built by Terraform, with a monthly budget that alerts at 50, 90 and 100 percent.
tags: [infrastructure, privacy, cost]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:00:00Z }
sources:
  - { id: budgets, resource: https://cloud.google.com/billing/docs/how-to/budgets, title: Create, edit, or delete budgets and budget alerts }
  - { id: free-tier, resource: https://cloud.google.com/free/docs/free-cloud-features, title: Google Cloud free tier }
  - { id: hierarchy, resource: https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy, title: Resource hierarchy }
---

# Decision

The app gets a **cloud project of its own**, created by `infra/bootstrap` with Terraform,
rather than sharing a project with other apps.

- **Isolation.** The data belongs to a minor and a parent. A project is the boundary for
  access policies, so a project of its own means nobody who can reach another app can
  reach this one by accident.[^hierarchy]
- **Cost is visible.** A budget can filter to one project, so its spend is never mixed
  with another app's.[^budgets]
- **Reproducible from a public repo.** Every identifier is a variable set outside the
  repo; the code holds none.

# Budget

A monthly budget of 10 units of the billing currency, with alerts at 50%, 90% and 100% of
actual spend and at 100% of forecast spend, sent to the billing account's admins.[^budgets]

A budget **alerts; it does not cap spend**.[^budgets] The design keeps spend near zero
instead: serverless services that scale to zero and stay inside the free tier,[^free-tier]
at most one instance, and no always-on resources.

# Rejected options

- **Share the existing project.** Cheaper to set up, but access and cost would mix with
  other apps.
- **A hard cap that disables billing when the budget is hit.** Possible with a budget
  notification and a function, but it can take the app down abruptly. Deferred: it
  becomes a story if spend ever nears the budget.

# Undo

`terraform destroy` in `infra/bootstrap` removes the bucket and budget; the project has
`deletion_policy = "PREVENT"`, so deleting it is a deliberate manual step.
