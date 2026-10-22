variable "project_id" {
  type    = string
  default = "andy-intelligence-512400"
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

variable "allowed_emails" {
  type        = list(string)
  description = "Google accounts allowed to use the UI/API/MCP. Never committed: set via gitignored terraform.tfvars locally or the TF_VAR_ALLOWED_EMAILS Actions secret."
  sensitive   = true
}

variable "database_secret_ready" {
  type        = bool
  description = "Flip to true after adding a version to control-plane-database-url; wires DATABASE_URL into the service."
  default     = false
}
