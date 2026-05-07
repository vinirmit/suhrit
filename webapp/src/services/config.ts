export interface AppConfig {
  appEnv: string;
  apiBaseUrl: string;
  logoutUrl: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  cognitoAuthority: string;
  cognitoClientId: string;
  oidcScope: string;
  identityProvider: string;
}

interface LegacyCognitoConfig {
  clientId: string;
  authority: string;
}

const legacyCognitoByEnv: Record<string, LegacyCognitoConfig> = {
  dev: {
    clientId: '15mhivicmdt8np410l0asesvra',
    authority: 'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_BnpmbJxGj',
  },
  qa: {
    clientId: '3uh5nssu63jvcco1emmp7ctnie',
    authority: 'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_dpqn7EGn9',
  },
  production: {
    clientId: '444g2g9aa4cinthis4uvdpp2m1',
    authority: 'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_etQmPuuP8',
  },
};

function normalizeEnvValue(value: string | undefined): string {
  return value?.trim() ?? '';
}

const appEnv = normalizeEnvValue(import.meta.env.VITE_APP_ENV) || 'dev';
const legacyConfig = legacyCognitoByEnv[appEnv] ?? legacyCognitoByEnv.dev;

export const appConfig: AppConfig = {
  appEnv,
  apiBaseUrl: normalizeEnvValue(import.meta.env.VITE_API_URL),
  logoutUrl: normalizeEnvValue(import.meta.env.VITE_LOGOUT_URL),
  redirectUri: normalizeEnvValue(import.meta.env.VITE_REDIRECT_URI) || window.location.origin,
  postLogoutRedirectUri:
    normalizeEnvValue(import.meta.env.VITE_POST_LOGOUT_REDIRECT_URI) || window.location.origin,
  cognitoAuthority:
    normalizeEnvValue(import.meta.env.VITE_COGNITO_AUTHORITY) || legacyConfig.authority,
  cognitoClientId:
    normalizeEnvValue(import.meta.env.VITE_COGNITO_CLIENT_ID) || legacyConfig.clientId,
  oidcScope: normalizeEnvValue(import.meta.env.VITE_OIDC_SCOPE) || 'openid',
  identityProvider:
    normalizeEnvValue(import.meta.env.VITE_COGNITO_IDENTITY_PROVIDER) || 'Google',
};
