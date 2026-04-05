/** Login with Amazon (LWA) OAuth2 helpers for SP-API access. */

export const LWA_AUTH_URL = 'https://sellercentral.amazon.com/apps/authorize/consent';
export const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

/**
 * SP-API base URL — region-aware.
 * Defaults to EU (sellingpartnerapi-eu.amazon.com).
 */
export function getSpApiBase(region: 'NA' | 'EU' | 'FE' = 'EU'): string {
  const map: Record<string, string> = {
    NA: 'https://sellingpartnerapi-na.amazon.com',
    EU: 'https://sellingpartnerapi-eu.amazon.com',
    FE: 'https://sellingpartnerapi-fe.amazon.com',
  };
  return map[region] ?? map['EU'];
}

export const SP_API_BASE = getSpApiBase(
  (process.env.AMAZON_REGION as 'NA' | 'EU' | 'FE' | undefined) ?? 'EU',
);

export interface LwaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

/**
 * Build the LWA OAuth2 authorization URL.
 * The seller is redirected here to grant SP-API access.
 */
export function getAuthorizationUrl(state: string): string {
  const clientId = process.env.AMAZON_CLIENT_ID;
  if (!clientId) throw new Error('AMAZON_CLIENT_ID environment variable is not set');

  const redirectUri = process.env.AMAZON_REDIRECT_URI;
  if (!redirectUri) throw new Error('AMAZON_REDIRECT_URI environment variable is not set');

  const params = new URLSearchParams({
    application_id: clientId,
    state,
    redirect_uri: redirectUri,
    version: 'beta',
  });

  return `${LWA_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code returned by the LWA consent page for tokens.
 */
export async function exchangeCode(code: string): Promise<LwaTokenResponse> {
  const clientId = process.env.AMAZON_CLIENT_ID;
  if (!clientId) throw new Error('AMAZON_CLIENT_ID environment variable is not set');

  const clientSecret = process.env.AMAZON_CLIENT_SECRET;
  if (!clientSecret) throw new Error('AMAZON_CLIENT_SECRET environment variable is not set');

  const redirectUri = process.env.AMAZON_REDIRECT_URI;
  if (!redirectUri) throw new Error('AMAZON_REDIRECT_URI environment variable is not set');

  const response = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Amazon token exchange failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<LwaTokenResponse>;
}

/**
 * Refresh an LWA access token using a refresh token.
 * Returns a new LwaTokenResponse (the refresh_token field may be the same).
 */
export async function refreshAccessToken(existingRefreshToken: string): Promise<LwaTokenResponse> {
  const clientId = process.env.AMAZON_CLIENT_ID;
  if (!clientId) throw new Error('AMAZON_CLIENT_ID environment variable is not set');

  const clientSecret = process.env.AMAZON_CLIENT_SECRET;
  if (!clientSecret) throw new Error('AMAZON_CLIENT_SECRET environment variable is not set');

  const response = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: existingRefreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Amazon token refresh failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<LwaTokenResponse>;
}
