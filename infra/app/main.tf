# App infrastructure: document database, container registry, runtime identity, secret
# storage, and the serverless runtime behind Google sign-in (Identity-Aware Proxy).
#
# State lives in the bucket the bootstrap created; the bucket name is given at init time
# from a file outside the repo. Every identifier and every allowed account is a variable
# with no default (see infra/README.md).

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  services = [
    "run.googleapis.com",
    "firestore.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iap.googleapis.com",
  ]
}

resource "google_project_service" "app" {
  for_each           = toset(local.services)
  service            = each.value
  disable_on_destroy = false
}

# One Firestore database in native mode: the free tier covers the default database only.
resource "google_firestore_database" "app" {
  name                    = "(default)"
  location_id             = var.region
  type                    = "FIRESTORE_NATIVE"
  delete_protection_state = "DELETE_PROTECTION_ENABLED"
  depends_on              = [google_project_service.app]
}

resource "google_artifact_registry_repository" "app" {
  repository_id = "goalie-goals"
  location      = var.region
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }
  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      older_than = "2592000s"
    }
  }
  depends_on = [google_project_service.app]
}

# The runtime identity: least privilege, only what the app needs.
resource "google_service_account" "runtime" {
  account_id   = "goalie-goals-runtime"
  display_name = "goalie-goals runtime"
}

resource "google_project_iam_member" "runtime_datastore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_secret_manager_secret" "app" {
  for_each  = toset(var.secret_names)
  secret_id = each.value
  replication {
    auto {}
  }
  depends_on = [google_project_service.app]
}

resource "google_secret_manager_secret_iam_member" "runtime" {
  for_each  = google_secret_manager_secret.app
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_cloud_run_v2_service" "app" {
  provider            = google-beta
  name                = "goalie-goals"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  launch_stage        = "GA"
  iap_enabled         = true
  deletion_protection = false

  # The API adds a service-level scaling block of its own; instance limits live in the
  # template below.
  lifecycle {
    ignore_changes = [scaling]
  }

  template {
    service_account = google_service_account.runtime.email
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
    containers {
      image = var.image
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }
    }
  }
  depends_on = [google_project_service.app]
}

# Only the sign-in proxy may invoke the service; people get in through the proxy.
resource "google_project_service_identity" "iap" {
  provider = google-beta
  service  = "iap.googleapis.com"
}

resource "google_cloud_run_v2_service_iam_member" "iap_invoker" {
  name     = google_cloud_run_v2_service.app.name
  location = var.region
  role     = "roles/run.invoker"
  member   = google_project_service_identity.iap.member
}

# The people allowed through the proxy come from a variables file outside the repo.
resource "google_iap_web_cloud_run_service_iam_member" "allowed" {
  provider = google-beta
  # count, not for_each: resource keys stay numeric, so no account appears in plan output.
  count                  = length(var.allowed_members)
  location               = var.region
  cloud_run_service_name = google_cloud_run_v2_service.app.name
  role                   = "roles/iap.httpsResourceAccessor"
  member                 = var.allowed_members[count.index]
}
