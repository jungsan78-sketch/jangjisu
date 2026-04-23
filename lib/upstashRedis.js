const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function isRedisConfigured() {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

async function runRedisCommand(command) {
  if (!isRedisConfigured()) return null;

  const response = await fetch(UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Upstash Redis request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json?.error) {
    throw new Error(String(json.error));
  }

  return json?.result;
}

export async function getCachedJson(key) {
  try {
    const result = await runRedisCommand(['GET', key]);
    if (!result) return null;
    return JSON.parse(result);
  } catch {
    return null;
  }
}

export async function setCachedJson(key, value, ttlSeconds) {
  try {
    await runRedisCommand(['SETEX', key, String(ttlSeconds), JSON.stringify(value)]);
  } catch {
    // 캐시 저장 실패 시에도 원본 응답은 계속 반환
  }
}
