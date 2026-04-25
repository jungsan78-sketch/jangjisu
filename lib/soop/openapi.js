export function getSoopOpenApiConfig() {
  return {
    clientId: process.env.SOOP_CLIENT_ID || '',
    clientSecret: process.env.SOOP_CLIENT_SECRET || '',
    redirectUri: process.env.SOOP_REDIRECT_URI || '',
    chatSdkUrl: process.env.NEXT_PUBLIC_SOOP_CHAT_SDK_URL || '',
  };
}

export function hasSoopOpenApiConfig() {
  const config = getSoopOpenApiConfig();
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

export function buildSoopAuthUrl() {
  const config = getSoopOpenApiConfig();
  const params = new URLSearchParams({ client_id: config.clientId });
  return `https://openapi.sooplive.com/auth/code?${params.toString()}`;
}

export async function requestSoopToken({ code, refreshToken }) {
  const config = getSoopOpenApiConfig();
  const body = new URLSearchParams();
  body.set('grant_type', refreshToken ? 'refresh_token' : 'authorization_code');
  body.set('client_id', config.clientId);
  body.set('client_secret', config.clientSecret);
  body.set('redirect_uri', config.redirectUri);
  if (code) body.set('code', code);
  if (refreshToken) body.set('refresh_token', refreshToken);

  const response = await fetch('https://openapi.sooplive.com/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data?.msg || data?.message || `SOOP token request failed: ${response.status}`);
  }
  return data;
}
