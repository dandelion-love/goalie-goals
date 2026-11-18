# Identifiers and allowed accounts have no defaults: set them in a tfvars file outside the
# repo. A missing or empty value fails the plan; it never opens the app to everyone.

variable "project_id" {
  description = "Id of the app's project (created by infra/bootstrap)."
  type        = string
}

variable "region" {
  description = "Region for the runtime, database and registry."
  type        = string
  default     = "us-west1"
}

variable "allowed_members" {
  description = "Accounts allowed through the sign-in proxy, as IAM members (user:...)."
  type        = list(string)
  sensitive   = true

  validation {
    condition     = length(var.allowed_members) > 0
    error_message = "allowed_members is empty: refusing to deploy an app nobody may sign in to, or one open to everyone."
  }
  validation {
    condition     = alltrue([for m in var.allowed_members : can(regex("^(user|group):", m))])
    error_message = "allowed_members must hold only user: or group: members (the check names the variable, never its values)."
  }
}

variable "image" {
  description = "Container image to run. Until the app's own image exists, a public placeholder."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "secret_names" {
  description = "Names of the secrets the app reads (values are added outside Terraform)."
  type        = list(string)
  default     = []
}

variable "custom_domain" {
  description = "The app's custom hostname on the owner's domain (no trailing dot)."
  type        = string
  sensitive   = true
}

variable "dns_zone_name" {
  description = "Name of the owner's existing Cloud DNS managed zone that holds the domain."
  type        = string
  sensitive   = true
}

variable "dns_zone_project" {
  description = "Project that owns that DNS zone."
  type        = string
  sensitive   = true
}
