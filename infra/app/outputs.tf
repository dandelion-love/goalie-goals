# For the operator's terminal only; never paste these into issues or PRs.

output "service_name" {
  value = google_cloud_run_v2_service.app.name
}

output "registry_repository" {
  value     = google_artifact_registry_repository.app.repository_id
  sensitive = true
}
