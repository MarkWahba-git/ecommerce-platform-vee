import crypto from 'crypto';

export const ETSY_API_BASE = 'https://openapi.etsy.com';
const ETSY_OAUTH_BASE = 'https://www.etsy.com/oauth';

/** Build a code_verifier + code_challenge pair for PKCE */
export function generatePkce(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

/** Build the Etsy OAuth2 authorization URL (PKCE flow). */
export function getAuthorizationUrl(state: string, codeChallenge: string): string {
  const clientId = process.env.ETSY_CLIENT_ID;
  if (!clientId) throw new Error('ETSY_CLIENT_ID environment variable is not set');

  const redirectUri = process.env.ETSY_REDIRECT_URI;
  if (!redirectUri) throw new Error('ETSY_REDIRECT_URI environment variable is not set');

  const scopes = [
    'listings_r',
    'listings_w',
    'listings_d',
    'transactions_r',
    'transactions_w',
    'shops_r',
    'shops_w',
  ].join('%20');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${ETSY_OAUTH_BASE}/connect?${params.toString()}`;
}

export interface EtsyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

/** Exchange an authorization code for an access + refresh token. */
export async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<EtsyTokenResponse> {
  const clientId = process.env.ETSY_CLIENT_ID;
  if (!clientId) throw new Error('ETSY_CLIENT_ID environment variable is not set');

  const redirectUri = process.env.ETSY_REDIRECT_URI;
  if (!redirectUri) throw new Error('ETSY_REDIRECT_URI environment variable is not set');

  const response = await fetch(`${ETSY_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Etsy token exchange failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<EtsyTokenResponse>;
}

/** Refresh an Etsy access token using a refresh token. */
export async function refreshToken(existingRefreshToken: string): Promise<EtsyTokenResponse> {
  const clientId = process.env.ETSY_CLIENT_ID;
  if (!clientId) throw new Error('ETSY_CLIENT_ID environment variable is not set');

  const response = await fetch(`${ETSY_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: existingRefreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Etsy token refresh failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<EtsyTokenResponse>;
}
