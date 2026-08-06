import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getCachedJson, setCachedJson } from '../upstashRedis';
import { fetchRecentPrisonNotices } from './prisonNotices';

const CACHE_KEY = 'soop:prison-notices:aggregate:v6';
const FRESH_MS = 30 * 60 * 1000;
const RETENTION_SECONDS = 7 * 24 * 60 * 60;

function getKvBinding() {
  try {
    return getCloudflareContext()?.env?.JANGJISU_CACHE || null;
  } catch {
    return null;
  }
}

function isKvNamespace(value) {
  return value && typeof value.get === 'function' && typeof value.put === 'function';
}

async function readKv(kv) {
  if (!isKvNamespace(kv)) return null;
  try {
    const value = await kv.get(CACHE_KEY, 'json');
    return value && typeof value === 'object' ? value : null;
  } catch {}
  try {
    const raw = await kv.get(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function readCache() {
  const kv = getKvBinding();
  const kvValue = await readKv(kv);
  if (kvValue?.payload) return { value: kvValue, storage: 'cloudflare-kv', kv };

  const redisValue = await getCachedJson(CACHE_KEY);
  if (redisValue?.payload) return { value: redisValue, storage: 'upstash', kv };
  return { value: null, storage: isKvNamespace(kv) ? 'cloudflare-kv' : 'unknown', kv };
}

async function writeCache(kv, value) {
  if (isKvNamespace(kv)) {
    try {
      await kv.put(CACHE_KEY, JSON.stringify(value), { expirationTtl: RETENTION_SECONDS });
      return 'cloudflare-kv';
    } catch {}
  }

  await setCachedJson(CACHE_KEY, value, RETENTION_SECONDS);
  return 'upstash';
}

function withCacheMeta(payload, cache, storage, cachedAt) {
  return {
    ok: true,
    ...payload,
    cache,
    cacheStorage: storage,
    cachedAt: cachedAt ? new Date(cachedAt).toISOString() : null,
  };
}

export async function getRecentNoticesPayload() {
  const now = Date.now();
  const cached = await readCache();
  const cachedAt = Number(cached.value?.cachedAt || 0);

  if (cached.value?.payload && cachedAt && now - cachedAt < FRESH_MS) {
    return withCacheMeta(cached.value.payload, 'hit', cached.storage, cachedAt);
  }

  try {
    const notices = await fetchRecentPrisonNotices();
    if (!notices.length && cached.value?.payload?.notices?.length) {
      throw new Error('SOOP 게시글 응답이 비어 이전 캐시를 유지합니다.');
    }

    const payload = {
      notices,
      source: 'soop_home_and_chapi_board',
      fetchedAt: new Date(now).toISOString(),
    };
    const record = { payload, cachedAt: now };
    const storage = await writeCache(cached.kv, record);
    return withCacheMeta(payload, cached.value?.payload ? 'refresh' : 'miss', storage, now);
  } catch (error) {
    if (cached.value?.payload) {
      return {
        ...withCacheMeta(cached.value.payload, 'stale', cached.storage, cachedAt),
        warning: error?.message || 'SOOP 게시글 조회 실패로 이전 캐시를 표시합니다.',
      };
    }

    return {
      ok: false,
      notices: [],
      source: 'unknown',
      fetchedAt: new Date(now).toISOString(),
      cache: 'unavailable',
      cacheStorage: cached.storage,
      error: error?.message || 'SOOP 게시글을 불러오지 못했습니다.',
    };
  }
}
