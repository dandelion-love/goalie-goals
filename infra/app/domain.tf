# The app's custom subdomain: a Cloud Run domain mapping in this project, and the CNAME in
# the owner's existing DNS zone (another project). The hostname, zone and zone project are
# variables with no defaults, set only in the variables file outside the repo. The deploying
# account must have verified the domain; Google then issues a managed certificate.

resource "google_cloud_run_domain_mapping" "app" {
  location = var.region
  name     = var.custom_domain

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.app.name
  }
}

resource "google_dns_record_set" "app" {
  project      = var.dns_zone_project
  managed_zone = var.dns_zone_name
  name         = "${var.custom_domain}."
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["ghs.googlehosted.com."]
}
