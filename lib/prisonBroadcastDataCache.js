import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getCachedJson, setCachedJson } from './upstashRedis';

async function getKvBinding() {
  try {
    const context = await getCloudflareContext({ async: true });
    if (context?.env?.JANGJISU_CACHE) return context.env.JANGJISU_CACHE;
  } catch {}
  try {
    return getCloudflareContext()?.env?.JANGJISU_CACHE || null;
  } catch {
    return null;
  }
}

function isKvNamespace(value) {
  return value && typeof value.get === 'function' && typeof value.put === 'function';
}

async function readKv(kv, key) {
  if (!isKvNamespace(kv)) return null;
  try {
    const value = await kv.get(key, 'json');
    return value && typeof value === 'object' ? value : null;
  } catch {}
  try {
    const raw = await kv.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function readBroadcastDataCache(key) {
  const kv = await getKvBinding();
  const kvValue = await readKv(kv, key);
  if (kvValue?.payload) return { record: kvValue, storage: 'cloudflare-kv', kv };

  const redisValue = await getCachedJson(key);
  if (redisValue?.payload) return { record: redisValue, storage: 'upstash', kv };
  return { record: null, storage: isKvNamespace(kv) ? 'cloudflare-kv' : 'unknown', kv };
}

export async function writeBroadcastDataCache(cache, key, record, ttlSeconds) {
  if (isKvNamespace(cache?.kv)) {
    try {
      await cache.kv.put(key, JSON.stringify(record), { expirationTtl: ttlSeconds });
      return 'cloudflare-kv';
    } catch {}
  }

  await setCachedJson(key, record, ttlSeconds);
  return 'upstash';
}
