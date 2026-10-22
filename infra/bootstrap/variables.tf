variable "project_id" {
  type        = string
  description = "Control-plane GCP project ID."
  default     = "andy-intelligence-512400"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "github_org" {
  type    = string
  default = "albernhagen-org"
}

variable "github_repo" {
  type    = string
  default = "andy-intelligence"
}
