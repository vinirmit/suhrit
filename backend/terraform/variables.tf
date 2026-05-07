variable "aws_region" {
  description = "AWS region where the backend is deployed."
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Base name for backend resources."
  type        = string
  default     = "suhrit"
}

variable "environment" {
  description = "Deployment environment name, such as dev, qa, or prod."
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "Root domain name for custom API and Cognito domains, for example domain.com."
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for domain_name."
  type        = string
}

variable "lambda_memory_size" {
  description = "Memory allocated to the API Lambda."
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Timeout, in seconds, for the API Lambda."
  type        = number
  default     = 30
}

variable "mongodb_instance" {
  description = "MongoDB connection string template. Keep <user> and <password> placeholders if matching the existing Lambda env contract."
  type        = string
  sensitive   = true
}

variable "mongodb_user" {
  description = "MongoDB username used to replace <user> in mongodb_instance."
  type        = string
  sensitive   = true
}

variable "mongodb_key" {
  description = "MongoDB password/key used to replace <password> in mongodb_instance."
  type        = string
  sensitive   = true
}

variable "mongodb_database_name" {
  description = "MongoDB database name."
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth client ID configured for Cognito social sign-in."
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret configured for Cognito social sign-in."
  type        = string
  sensitive   = true
}

variable "google_authorize_scopes" {
  description = "Google OAuth scopes requested by Cognito."
  type        = list(string)
  default     = ["openid", "email", "profile"]
}

variable "cognito_callback_urls" {
  description = "Allowed OAuth callback URLs for the web app."
  type        = list(string)
}

variable "cognito_logout_urls" {
  description = "Allowed OAuth logout URLs for the web app."
  type        = list(string)
}

variable "cognito_oauth_scopes" {
  description = "OAuth scopes issued by the Cognito app client."
  type        = list(string)
  default     = ["openid", "email", "profile"]
}

variable "cors_allow_origins" {
  description = "Allowed CORS origins for the HTTP API."
  type        = list(string)
  default     = ["*"]
}

variable "log_retention_days" {
  description = "CloudWatch log retention for the Lambda log group."
  type        = number
  default     = 14
}
