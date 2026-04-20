const DEFAULT_TTL_SECONDS = 60 * 60;

function pickEnv(names) {
  return names.map((name) => process.env[name]).find(Boolean) || '';
}

function getRedisConfig() {
  const url = pickEnv([
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_KV_REST_API_URL',
    'UPSTASH_REDIS_REST_KV_REST_URL',
    'KV_REST_API_URL',
    'KV_REST_URL',
  ]);
  const token = pickEnv([
    'UPSTASH_REDIS_REST_TOKEN',
    'UPSTASH_REDIS_REST_KV_REST_API_TOKEN',
    'UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN',
    'KV_REST_API_TOKEN',
    'KV_REST_API_READ_ONLY_TOKEN',
  ]);
  return { url, token, enabled: Boolean(url && token) };
}

async function redisCommand(command) {
  const { url, token, enabled } = getRedisConfig();
  if (!enabled) return null;

  const res = await fetch(`${url.replace(/\/$/, '')}/${command.map((item) => encodeURIComponent(String(item))).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Redis command failed: ${res.status}`);
  const json = await res.json();
  return json?.result ?? null;
}

export async function getJsonCache(key) {
  try {
    const raw = await redisCommand(['GET', key]);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export async function setJsonCache(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  try {
    await redisCommand(['SET', key, JSON.stringify(value), 'EX', ttlSeconds]);
    return true;
  } catch {
    return false;
  }
}

export function isServerCacheEnabled() {
  return getRedisConfig().enabled;
}

export function getBaseUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
