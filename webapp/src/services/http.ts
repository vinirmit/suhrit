import { z } from 'zod';

import { appConfig } from './config';
import { getStoredAccessTokenByKey } from './storage';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const errorEnvelopeSchema = z.object({
  message: z.string().optional(),
});

async function request<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const authority = appConfig.cognitoAuthority;
  const clientId = appConfig.cognitoClientId;
  const token = getStoredAccessTokenByKey(
    authority && clientId ? `oidc.user:${authority}:${clientId}` : null,
  );

  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
  });

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = errorEnvelopeSchema.safeParse(body);
    throw new ApiError(
      errorBody.success && errorBody.data.message
        ? errorBody.data.message
        : `Request failed with status ${response.status}`,
      response.status,
      body,
    );
  }

  return body as TResponse;
}

export const http = {
  get: <TResponse>(path: string) => request<TResponse>(path, { method: 'GET' }),
  post: <TResponse, TBody>(path: string, body: TBody) =>
    request<TResponse>(path, { method: 'POST', body: JSON.stringify(body) }),
};
