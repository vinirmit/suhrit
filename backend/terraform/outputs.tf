output "api_endpoint" {
  description = "HTTP API Gateway endpoint."
  value       = "https://${local.api_custom_domain_name}"
}

output "api_gateway_default_endpoint" {
  description = "Default HTTP API Gateway endpoint."
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}

output "lambda_function_name" {
  description = "Deployed Lambda function name."
  value       = aws_lambda_function.api_web.function_name
}

output "lambda_function_arn" {
  description = "Deployed Lambda function ARN."
  value       = aws_lambda_function.api_web.arn
}

output "cognito_issuer" {
  description = "JWT issuer configured on API Gateway."
  value       = local.cognito_issuer
}

output "cognito_user_pool_id" {
  description = "Created Cognito User Pool ID."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_app_client_id" {
  description = "Created Cognito web app client ID."
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_hosted_ui_domain" {
  description = "Cognito hosted UI domain for OAuth login."
  value       = "https://${local.auth_custom_domain_name}"
}

output "api_custom_domain_name" {
  description = "Custom API Gateway domain name."
  value       = local.api_custom_domain_name
}

output "cognito_custom_domain_name" {
  description = "Custom Cognito hosted UI domain name."
  value       = local.auth_custom_domain_name
}
