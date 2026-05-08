# Backend

TypeScript backend workspace for Lambda functions and deployment infrastructure.

The first Lambda here lives in `src/lambdas/web-api/` and is a TypeScript port of the `suhrit-api-web` Python Lambda. Shared backend code lives in `src/common/`.

## Scripts

- `npm run typecheck` verifies TypeScript.
- `npm run build` bundles `src/lambdas/web-api/handler.ts` to `dist/web-api/handler.js` with esbuild.
- `npm run build:web-api` builds only the web API Lambda.

## Lambda Handler

Configure the AWS Lambda handler as:

```text
handler.lambdaHandler
```

The environment variables are the same as the Python Lambda:

- `instance`
- `key`
- `user`
- `DB_NAME`

Terraform deployment scripts can live in this workspace alongside the Lambda source.

## Terraform

Terraform for the API Lambda and HTTP API Gateway lives in `terraform/`.

Copy `terraform/terraform.tfvars.example` to `terraform/terraform.tfvars` and fill in the MongoDB, Google OAuth, Route53, and callback/logout URL values. Terraform creates Cognito and API Gateway uses a JWT authorizer with:

- issuer: `https://cognito-idp.<region>.amazonaws.com/<user-pool-id>`
- audience: the Cognito app client ID

That means the frontend should send the Cognito-issued token in `Authorization: Bearer <token>`. Google is the upstream social provider, but API Gateway validates the Cognito JWT.

Custom domains are derived from `domain_name` and `environment`:

- non-prod: `api-<env>.<domain_name>` and `auth-<env>.<domain_name>`
- prod or production: `api.<domain_name>` and `auth.<domain_name>`

Terraform creates DNS-validated ACM certificates and Route53 alias records. The API Gateway certificate is created in `aws_region`; the Cognito certificate is created in `us-east-1`, which Cognito requires for custom domains.

The Google OAuth client must allow Cognito's callback URL:

```text
https://auth-<env>.<domain_name>/oauth2/idpresponse
```

For prod, omit the environment segment:

```text
https://auth.<domain_name>/oauth2/idpresponse
```

After deployment, use these outputs in the webapp env:

- `api_endpoint` -> `VITE_API_URL`
- `cognito_issuer` -> `VITE_COGNITO_AUTHORITY`
- `cognito_app_client_id` -> `VITE_COGNITO_CLIENT_ID`

Deploy:

```bash
cd terraform
terraform init
terraform apply
```

## OpenAPI

The API contract is documented in `openapi.yaml`.
