function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getSoopAuthConfig() {
  return {
    clientId: getRequiredEnv('SOOP_CLIENT_ID'),
    clientSecret: getRequiredEnv('SOOP_CLIENT_SECRET'),
    redirectUri: getRequiredEnv('SOOP_REDIRECT_URI'),
    accessToken: process.env.SOOP_ACCESS_TOKEN || '',
    refreshToken: process.env.SOOP_REFRESH_TOKEN || '',
    tokenUrl: process.env.SOOP_TOKEN_URL || 'https://openapi.sooplive.com/auth/token',
  };
}

export async function refreshSoopAccessToken() {
  const config = getSoopAuthConfig();

  if (!config.refreshToken) {
    throw new Error('SOOP_REFRESH_TOKEN is not set');
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json, */*',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const text = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(parsed?.error_description || parsed?.message || text || `HTTP ${response.status}`);
  }

  return {
    accessToken: parsed?.access_token || parsed?.accessToken || '',
    refreshToken: parsed?.refresh_token || parsed?.refreshToken || config.refreshToken,
    raw: parsed || text,
  };
}
