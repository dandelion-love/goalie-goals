# Bootstrap: the app's own cloud project, its billing link, a monthly budget with alerts,
# and the bucket that holds the state of everything else in infra/.
#
# Every identifier is a variable with no default. Values live outside this public repo in
# ~/.config/goalie-goals/bootstrap.tfvars, and this root's state is a local file in the same
# folder (see infra/README.md). Never commit tfvars, state or plan files.

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
  # Local state, path given at init time: -backend-config=path=<outside the repo>.
  backend "local" {}
}

provider "google" {
  region                = var.region
  user_project_override = true
  billing_project       = var.quota_project
}

resource "google_project" "app" {
  project_id      = var.project_id
  name            = var.project_name
  billing_account = var.billing_account
  deletion_policy = "PREVENT"
  labels = {
    app = "goalie-goals"
  }
}

locals {
  services = [
    "serviceusage.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "cloudbilling.googleapis.com",
    "billingbudgets.googleapis.com",
    "storage.googleapis.com",
    "iam.googleapis.com",
  ]
}

resource "google_project_service" "bootstrap" {
  for_each           = toset(local.services)
  project            = google_project.app.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_storage_bucket" "tf_state" {
  project                     = google_project.app.project_id
  name                        = var.state_bucket
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.bootstrap]
}

resource "google_billing_budget" "monthly" {
  billing_account = var.billing_account
  display_name    = "goalie-goals monthly"

  budget_filter {
    projects        = ["projects/${google_project.app.number}"]
    calendar_period = "MONTH"
  }

  amount {
    specified_amount {
      currency_code = var.budget_currency
      units         = tostring(var.budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  # With no all_updates_rule, alerts go to the billing account's admins by email.

  depends_on = [google_project_service.bootstrap]
}
