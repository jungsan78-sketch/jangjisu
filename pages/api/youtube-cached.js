import { getBaseUrl, getJsonCache, isServerCacheEnabled, setJsonCache } from '../../lib/server-cache';

const CACHE_KEY = 'youtube:main:v1';
const TTL_SECONDS = 60 * 60;

function isUsablePayload(payload) {
  return payload && payload.ok !== false && (Array.isArray(payload.videos) || Array.isArray(payload.shorts) || Array.isArray(payload.full));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  const cached = await getJsonCache(CACHE_KEY);
  if (cached) {
    return res.status(200).json({ ...cached, cached: true, cacheSource: 'server' });
  }

  try {
    const baseUrl = getBaseUrl(req);
    const liveRes = await fetch(`${baseUrl}/api/youtube`, { cache: 'no-store' });
    const live = await liveRes.json();

    if (isUsablePayload(live) && isServerCacheEnabled()) {
      await setJsonCache(CACHE_KEY, { ...live, cachedAt: new Date().toISOString() }, TTL_SECONDS);
    }

    return res.status(200).json({ ...live, cached: false, cacheSource: 'live-fallback' });
  } catch (error) {
    return res.status(200).json({ ok: false, videos: [], shorts: [], full: [], error: 'youtube cached endpoint failed' });
  }
}
