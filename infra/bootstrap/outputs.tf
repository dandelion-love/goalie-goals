# Outputs are for the operator's terminal only; never paste them into issues or PRs.

output "project_id" {
  value     = google_project.app.project_id
  sensitive = true
}

output "state_bucket" {
  value     = google_storage_bucket.tf_state.name
  sensitive = true
}
