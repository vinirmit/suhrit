import { z } from 'zod';

import { appConfig } from './config';
import {
  cacheUser,
  clearOidcFlowState,
  clearCachedUser,
  getStoredAccessTokenByKey,
  readOidcReturnPath,
  readOidcState,
  readOidcVerifier,
  readCachedUser,
  saveOidcFlowState,
  writeSessionJson,
} from './storage';
import { http } from './http';
import type { AuthenticatedUser } from '../types/domain';

const userDetailsResponseSchema = z.object({
  success: z.boolean(),
  user: z.custom<AuthenticatedUser>(),
});

const oidcMetadataSchema = z.object({
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  end_session_endpoint: z.string().url().optional(),
});

const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
  scope: z.string().optional(),
});

function getLegacyOidcStorageKey(): string | null {
  if (!appConfig.cognitoAuthority || !appConfig.cognitoClientId) {
    return null;
  }

  return `oidc.user:${appConfig.cognitoAuthority}:${appConfig.cognitoClientId}`;
}

export function getStoredAccessToken(): string | null {
  return getStoredAccessTokenByKey(getLegacyOidcStorageKey());
}

export async function fetchAuthenticatedUser(): Promise<AuthenticatedUser> {
  const response = await http.get('/user/details');
  const parsed = userDetailsResponseSchema.parse(response);

  if (!parsed.success) {
    throw new Error('Unable to load user details');
  }

  cacheUser(parsed.user);
  return parsed.user;
}

export function getCachedUser(): AuthenticatedUser | null {
  return readCachedUser<AuthenticatedUser>();
}

export function clearSession(): void {
  clearOidcFlowState();
  clearCachedUser();
}

function toBase64Url(input: Uint8Array): string {
  return btoa(String.fromCharCode(...input))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createRandomString(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64Url(bytes);
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return toBase64Url(new Uint8Array(hash));
}

async function fetchOidcMetadata() {
  const authority = appConfig.cognitoAuthority.replace(/\/$/, '');

  if (!authority || !appConfig.cognitoClientId) {
    throw new Error('Cognito authority or client ID is not configured.');
  }

  const response = await fetch(`${authority}/.well-known/openid-configuration`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Unable to load Cognito OIDC configuration.');
  }

  return oidcMetadataSchema.parse(await response.json());
}

export async function login(): Promise<void> {
  const metadata = await fetchOidcMetadata();
  const state = createRandomString(24);
  const verifier = createRandomString(48);
  const challenge = await createCodeChallenge(verifier);
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const redirectPath = new URL(appConfig.redirectUri).pathname;
  const returnPath =
    window.location.pathname === '/' ? redirectPath : currentPath;

  saveOidcFlowState(state, verifier, returnPath);

  const authorizeUrl = new URL(metadata.authorization_endpoint);
  authorizeUrl.searchParams.set('client_id', appConfig.cognitoClientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', appConfig.oidcScope);
  authorizeUrl.searchParams.set('redirect_uri', appConfig.redirectUri);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('code_challenge', challenge);

  if (appConfig.identityProvider) {
    authorizeUrl.searchParams.set('identity_provider', appConfig.identityProvider);
  }

  window.location.assign(authorizeUrl.toString());
}

function isRedirectUriMatch(): boolean {
  try {
    const redirectUrl = new URL(appConfig.redirectUri);
    return window.location.origin === redirectUrl.origin && window.location.pathname === redirectUrl.pathname;
  } catch {
    return false;
  }
}

export async function completeLoginIfNeeded(): Promise<boolean> {
  const currentUrl = new URL(window.location.href);
  const code = currentUrl.searchParams.get('code');
  const state = currentUrl.searchParams.get('state');

  if (!code || !state || !isRedirectUriMatch()) {
    return false;
  }

  const expectedState = readOidcState();
  const verifier = readOidcVerifier();

  if (!expectedState || expectedState !== state || !verifier) {
    clearOidcFlowState();
    throw new Error('Invalid authentication callback state.');
  }

  const metadata = await fetchOidcMetadata();
  const tokenResponse = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appConfig.cognitoClientId,
      code,
      redirect_uri: appConfig.redirectUri,
      code_verifier: verifier,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    clearOidcFlowState();
    throw new Error('Unable to exchange authorization code for tokens.');
  }

  const tokens = tokenResponseSchema.parse(await tokenResponse.json());
  const storageKey = getLegacyOidcStorageKey();

  if (storageKey) {
    writeSessionJson(storageKey, tokens);
  }

  const returnPath =
    readOidcReturnPath() || new URL(appConfig.redirectUri).pathname;
  clearOidcFlowState();
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (currentPath !== returnPath) {
    window.history.replaceState({}, document.title, returnPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } else {
    window.history.replaceState({}, document.title, returnPath);
  }
  return true;
}

export async function logout(): Promise<void> {
  const tokenKey = getLegacyOidcStorageKey();
  clearSession();

  if (tokenKey) {
    sessionStorage.removeItem(tokenKey);
    localStorage.removeItem(tokenKey);
  }

  window.location.assign('/');
}
