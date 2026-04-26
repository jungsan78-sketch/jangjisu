import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { buildFallbackStatuses, fetchLiveStatusPayload } from '../../lib/soop/liveStatus';

export const SOOP_LIVE_RESPONSE_CACHE_KEY = 'soop:live-status:response:v4';
export const SOOP_LIVE_RESPONSE_CACHE_TTL_SECONDS = 120;

export async function getLiveStatusResponsePayload() {
  const cached = await getCachedJson(SOOP_LIVE_RESPONSE_CACHE_KEY);
  const now = Date.now();

  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < SOOP_LIVE_RESPONSE_CACHE_TTL_SECONDS * 1000) {
    return {
      ok: true,
      ...cached.payload,
      cache: 'hit',
      cachedAt: new Date(cached.cachedAt).toISOString(),
    };
  }

  try {
    const payload = await fetchLiveStatusPayload();
    await setCachedJson(SOOP_LIVE_RESPONSE_CACHE_KEY, { payload, cachedAt: now }, SOOP_LIVE_RESPONSE_CACHE_TTL_SECONDS);
    return {
      ok: true,
      ...payload,
      cache: cached?.payload ? 'refresh' : 'miss',
      cachedAt: new Date(now).toISOString(),
    };
  } catch (error) {
    if (cached?.payload) {
      return {
        ok: true,
        ...cached.payload,
        cache: 'stale',
        cachedAt: new Date(cached.cachedAt).toISOString(),
        error: error.message,
      };
    }

    return {
      ok: false,
      statuses: buildFallbackStatuses(),
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
      error: error.message,
    };
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  const payload = await getLiveStatusResponsePayload();
  return res.status(200).json(payload);
}
