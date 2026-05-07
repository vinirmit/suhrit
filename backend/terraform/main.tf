locals {
  name_prefix    = "${var.project_name}-${var.environment}"
  lambda_name    = "${local.name_prefix}-api-web"
  dist_dir       = "${path.module}/../dist"
  function_file  = "${local.dist_dir}/handler.js"
  cognito_issuer = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"

  routes = {
    "GET /user/details"       = {}
    "GET /util/medlist"       = {}
    "GET /util/taglist"       = {}
    "GET /visit/queue"        = {}
    "POST /patient/edit"      = {}
    "POST /patient/history"   = {}
    "POST /patient/lastvisit" = {}
    "POST /patient/register"  = {}
    "POST /patient/search"    = {}
    "POST /report/range"      = {}
    "POST /visit/add"         = {}
    "POST /visit/process"     = {}
    "POST /visit/update"      = {}
  }
}

resource "terraform_data" "build_api_lambda" {
  input = filesha256("${path.module}/../package-lock.json")

  triggers_replace = [
    filesha256("${path.module}/../package.json"),
    filesha256("${path.module}/../tsconfig.json"),
    filesha256("${path.module}/../src/handler.ts"),
    filesha256("${path.module}/../src/db.ts"),
    filesha256("${path.module}/../src/date.ts"),
    filesha256("${path.module}/../src/mongo.ts"),
    filesha256("${path.module}/../src/patient.ts"),
    filesha256("${path.module}/../src/report.ts"),
    filesha256("${path.module}/../src/types.ts"),
    filesha256("${path.module}/../src/user.ts"),
    filesha256("${path.module}/../src/util.ts"),
    filesha256("${path.module}/../src/visit.ts")
  ]

  provisioner "local-exec" {
    command     = "npm run build"
    working_dir = "${path.module}/.."
  }
}

data "archive_file" "api_lambda" {
  type        = "zip"
  source_file = local.function_file
  output_path = "${path.module}/.terraform-build/${local.lambda_name}.zip"

  depends_on = [terraform_data.build_api_lambda]
}

resource "aws_iam_role" "api_lambda" {
  name = "${local.lambda_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_lambda_basic_execution" {
  role       = aws_iam_role.api_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "api_lambda" {
  name              = "/aws/lambda/${local.lambda_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "api_web" {
  function_name    = local.lambda_name
  role             = aws_iam_role.api_lambda.arn
  runtime          = "nodejs20.x"
  handler          = "handler.lambdaHandler"
  filename         = data.archive_file.api_lambda.output_path
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout

  environment {
    variables = {
      instance = var.mongodb_instance
      user     = var.mongodb_user
      key      = var.mongodb_key
      DB_NAME  = var.mongodb_database_name
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.api_lambda,
    aws_iam_role_policy_attachment.api_lambda_basic_execution
  ]
}

resource "aws_apigatewayv2_api" "http_api" {
  name          = "${local.name_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["*"]
    allow_methods     = ["GET", "OPTIONS", "POST"]
    allow_origins     = var.cors_allow_origins
    max_age           = 0
  }
}

resource "aws_apigatewayv2_authorizer" "cognito_jwt" {
  name             = "${local.name_prefix}-cognito-jwt"
  api_id           = aws_apigatewayv2_api.http_api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = local.cognito_issuer
  }
}

resource "aws_apigatewayv2_integration" "api_lambda" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api_web.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api_routes" {
  for_each = local.routes

  api_id             = aws_apigatewayv2_api.http_api.id
  route_key          = each.key
  target             = "integrations/${aws_apigatewayv2_integration.api_lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "allow_http_api" {
  statement_id  = "AllowExecutionFromHttpApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_web.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
