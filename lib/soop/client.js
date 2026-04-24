import { getSoopAuthConfig, refreshSoopAccessToken } from './auth';

async function requestJson(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json, */*',
    },
    cache: 'no-store',
  });

  const text = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsed || text,
  };
}

export async function soopApiGet(url) {
  const config = getSoopAuthConfig();

  if (!config.accessToken) {
    throw new Error('SOOP_ACCESS_TOKEN is not set');
  }

  const first = await requestJson(url, config.accessToken);
  if (first.ok) {
    return {
      data: first.body,
      tokenSource: 'access_token',
    };
  }

  if (first.status !== 401) {
    throw new Error(typeof first.body === 'string' ? first.body : JSON.stringify(first.body));
  }

  const refreshed = await refreshSoopAccessToken();
  if (!refreshed.accessToken) {
    throw new Error('SOOP refresh returned no access token');
  }

  const second = await requestJson(url, refreshed.accessToken);
  if (!second.ok) {
    throw new Error(typeof second.body === 'string' ? second.body : JSON.stringify(second.body));
  }

  return {
    data: second.body,
    tokenSource: 'refresh_token',
    refreshedAccessToken: refreshed.accessToken,
    refreshedRefreshToken: refreshed.refreshToken,
  };
}
