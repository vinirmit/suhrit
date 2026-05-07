locals {
  environment_domain_suffix = contains(["prod", "production"], lower(var.environment)) ? "" : "-${var.environment}"
  api_custom_domain_name    = "api${local.environment_domain_suffix}.${var.domain_name}"
  auth_custom_domain_name   = "auth${local.environment_domain_suffix}.${var.domain_name}"
}

resource "aws_acm_certificate" "api" {
  domain_name       = local.api_custom_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.api.domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_certificate_validation : record.fqdn]
}

resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = local.api_custom_domain_name

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.http_api.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}

resource "aws_route53_record" "api" {
  name    = local.api_custom_domain_name
  type    = "A"
  zone_id = var.route53_zone_id

  alias {
    evaluate_target_health = false
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
  }
}

resource "aws_acm_certificate" "cognito" {
  provider = aws.us_east_1

  domain_name       = local.auth_custom_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cognito_certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.cognito.domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_acm_certificate_validation" "cognito" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.cognito.arn
  validation_record_fqdns = [for record in aws_route53_record.cognito_certificate_validation : record.fqdn]
}

resource "aws_route53_record" "auth" {
  name    = local.auth_custom_domain_name
  type    = "A"
  zone_id = var.route53_zone_id

  alias {
    evaluate_target_health = false
    name                   = aws_cognito_user_pool_domain.main.cloudfront_distribution
    zone_id                = "Z2FDTNDATAQYW2"
  }
}
