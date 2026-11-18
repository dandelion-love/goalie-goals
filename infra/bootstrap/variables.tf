# Identifiers have no defaults on purpose: a missing value fails the plan, it never falls
# back to a real resource. Set them in a tfvars file outside the repo.

variable "project_id" {
  description = "Id of the app's dedicated cloud project (created here)."
  type        = string
}

variable "project_name" {
  description = "Display name of the project."
  type        = string
  default     = "goalie-goals"
}

variable "billing_account" {
  description = "Billing account id the project is linked to."
  type        = string
  sensitive   = true
}

variable "quota_project" {
  description = "An existing project with the billing budgets API enabled, used as the quota project for API calls made before the new project exists."
  type        = string
}

variable "state_bucket" {
  description = "Name of the bucket that holds the state of the other infra/ roots."
  type        = string
}

variable "region" {
  description = "Region for regional resources."
  type        = string
  default     = "us-west1"
}

variable "budget_currency" {
  description = "Currency code of the billing account (a budget must use it)."
  type        = string
}

variable "budget_amount" {
  description = "Monthly budget, in whole units of the billing currency."
  type        = number
  default     = 10

  validation {
    condition     = var.budget_amount > 0 && var.budget_amount <= 50
    error_message = "budget_amount must be between 1 and 50: this app is meant to run on free tiers."
  }
}
