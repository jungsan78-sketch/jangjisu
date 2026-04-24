import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { buildFallbackStatuses, fetchLiveStatusPayload, SOOP_LIVE_CACHE_KEY, SOOP_LIVE_CACHE_TTL_SECONDS } from '../../lib/soop/liveStatus';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const cached = await getCachedJson(SOOP_LIVE_CACHE_KEY);
  const now = Date.now();

  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < SOOP_LIVE_CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({
      ok: true,
      ...cached.payload,
      cache: 'hit',
      cachedAt: new Date(cached.cachedAt).toISOString(),
    });
  }

  try {
    const payload = await fetchLiveStatusPayload();
    await setCachedJson(SOOP_LIVE_CACHE_KEY, { payload, cachedAt: now }, SOOP_LIVE_CACHE_TTL_SECONDS);

    return res.status(200).json({
      ok: true,
      ...payload,
      cache: cached?.payload ? 'refresh' : 'miss',
      cachedAt: new Date(now).toISOString(),
    });
  } catch (error) {
    if (cached?.payload) {
      return res.status(200).json({
        ok: true,
        ...cached.payload,
        cache: 'stale',
        cachedAt: new Date(cached.cachedAt).toISOString(),
        error: error.message,
      });
    }

    return res.status(200).json({
      ok: false,
      statuses: buildFallbackStatuses(),
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
      error: error.message,
    });
  }
}
