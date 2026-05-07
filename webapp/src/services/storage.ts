const USER_KEY = 'USER';
const OIDC_STATE_KEY = 'OIDC_PKCE_STATE';
const OIDC_VERIFIER_KEY = 'OIDC_PKCE_VERIFIER';
const OIDC_RETURN_PATH_KEY = 'OIDC_RETURN_PATH';

export function readSessionJson<T>(key: string): T | null {
  const raw = sessionStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeSessionJson<T>(key: string, value: T): void {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function readLocalJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeLocalJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeSessionValue(key: string): void {
  sessionStorage.removeItem(key);
}

export function readCachedUser<T>(): T | null {
  return readSessionJson<T>(USER_KEY);
}

export function cacheUser<T>(user: T): void {
  writeSessionJson(USER_KEY, user);
}

export function clearCachedUser(): void {
  removeSessionValue(USER_KEY);
}

function parseAccessToken(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

export function getStoredAccessTokenByKey(key: string | null): string | null {
  if (!key) {
    return null;
  }

  return (
    parseAccessToken(sessionStorage.getItem(key)) ??
    parseAccessToken(localStorage.getItem(key))
  );
}

export function writeSessionValue(key: string, value: string): void {
  sessionStorage.setItem(key, value);
}

export function readSessionValue(key: string): string | null {
  return sessionStorage.getItem(key);
}

export function clearOidcFlowState(): void {
  removeSessionValue(OIDC_STATE_KEY);
  removeSessionValue(OIDC_VERIFIER_KEY);
  removeSessionValue(OIDC_RETURN_PATH_KEY);
}

export function saveOidcFlowState(
  state: string,
  verifier: string,
  returnPath: string,
): void {
  writeSessionValue(OIDC_STATE_KEY, state);
  writeSessionValue(OIDC_VERIFIER_KEY, verifier);
  writeSessionValue(OIDC_RETURN_PATH_KEY, returnPath);
}

export function readOidcState(): string | null {
  return readSessionValue(OIDC_STATE_KEY);
}

export function readOidcVerifier(): string | null {
  return readSessionValue(OIDC_VERIFIER_KEY);
}

export function readOidcReturnPath(): string | null {
  return readSessionValue(OIDC_RETURN_PATH_KEY);
}
